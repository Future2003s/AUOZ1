import { Review, IReview } from "../models/Review";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

interface CreateReviewData {
    product: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
}

interface UpdateReviewData {
    rating?: number;
    title?: string;
    comment?: string;
    images?: string[];
}

interface ReviewFilters {
    product?: string;
    user?: string;
    rating?: number;
    status?: "pending" | "approved" | "rejected";
    isVerifiedPurchase?: boolean;
}

interface ReviewQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
}

export class ReviewService {
    /**
     * Create a new review
     */
    static async createReview(reviewData: CreateReviewData, userId: string): Promise<IReview> {
        try {
            // Check if product exists
            const product = await Product.findById(reviewData.product);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Check if user already reviewed this product
            const existingReview = await Review.findOne({
                product: reviewData.product,
                user: userId
            });

            if (existingReview) {
                throw new AppError("You have already reviewed this product", 400);
            }

            // TODO: Check if user purchased this product (for verified purchase)
            const isVerifiedPurchase = false; // Placeholder

            // Create review
            const review = await Review.create({
                ...reviewData,
                user: userId,
                isVerifiedPurchase
            });

            await review.populate(["user", "product"]);

            // Update product rating statistics
            await this.updateProductRatingStats(reviewData.product);

            logger.info(`Review created for product: ${reviewData.product} by user: ${userId}`);
            return review;
        } catch (error) {
            logger.error("Create review error:", error);
            throw error;
        }
    }

    /**
     * Get reviews with filters and pagination
     */
    static async getReviews(
        filters: ReviewFilters = {},
        query: ReviewQuery = {}
    ): Promise<{
        reviews: IReview[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        try {
            const { page = 1, limit = 20, sort = "createdAt", order = "desc" } = query;

            // Build filter query
            const filterQuery: any = {};

            if (filters.product) {
                filterQuery.product = filters.product;
            }

            if (filters.user) {
                filterQuery.user = filters.user;
            }

            if (filters.rating) {
                filterQuery.rating = filters.rating;
            }

            if (filters.status) {
                filterQuery.status = filters.status;
            }

            if (filters.isVerifiedPurchase !== undefined) {
                filterQuery.isVerifiedPurchase = filters.isVerifiedPurchase;
            }

            // Build sort object
            const sortObj: any = {};
            sortObj[sort] = order === "asc" ? 1 : -1;

            // Execute query with pagination
            const skip = (page - 1) * limit;

            const [reviews, total] = await Promise.all([
                Review.find(filterQuery)
                    .populate("user", "firstName lastName avatar")
                    .populate("product", "name images")
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limit),
                Review.countDocuments(filterQuery)
            ]);

            return {
                reviews,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error("Get reviews error:", error);
            throw error;
        }
    }

    /**
     * Get review by ID
     */
    static async getReviewById(reviewId: string): Promise<IReview> {
        try {
            const review = await Review.findById(reviewId)
                .populate("user", "firstName lastName avatar")
                .populate("product", "name images");

            if (!review) {
                throw new AppError("Review not found", 404);
            }

            return review;
        } catch (error) {
            logger.error("Get review by ID error:", error);
            throw error;
        }
    }

    /**
     * Update review
     */
    static async updateReview(reviewId: string, updateData: UpdateReviewData, userId: string): Promise<IReview> {
        try {
            const review = await Review.findById(reviewId);
            if (!review) {
                throw new AppError("Review not found", 404);
            }

            // Check if user owns this review
            if (review.user.toString() !== userId) {
                throw new AppError("Not authorized to update this review", 403);
            }

            // Update review
            const updatedReview = await Review.findByIdAndUpdate(reviewId, updateData, {
                new: true,
                runValidators: true
            }).populate(["user", "product"]);

            // Update product rating statistics
            await this.updateProductRatingStats(review.product.toString());

            logger.info(`Review updated: ${reviewId} by user: ${userId}`);
            return updatedReview!;
        } catch (error) {
            logger.error("Update review error:", error);
            throw error;
        }
    }

    /**
     * Delete review
     */
    static async deleteReview(reviewId: string, userId: string): Promise<void> {
        try {
            const review = await Review.findById(reviewId);
            if (!review) {
                throw new AppError("Review not found", 404);
            }

            // Check if user owns this review
            if (review.user.toString() !== userId) {
                throw new AppError("Not authorized to delete this review", 403);
            }

            const productId = review.product.toString();

            await Review.findByIdAndDelete(reviewId);

            // Update product rating statistics
            await this.updateProductRatingStats(productId);

            logger.info(`Review deleted: ${reviewId} by user: ${userId}`);
        } catch (error) {
            logger.error("Delete review error:", error);
            throw error;
        }
    }

    /**
     * Moderate review (Admin only)
     */
    static async moderateReview(
        reviewId: string,
        status: "approved" | "rejected",
        moderatorId: string,
        moderationNote?: string
    ): Promise<IReview> {
        try {
            const review = await Review.findByIdAndUpdate(
                reviewId,
                {
                    status,
                    moderatedBy: moderatorId,
                    moderatedAt: new Date(),
                    moderationNote
                },
                { new: true, runValidators: true }
            ).populate(["user", "product", "moderatedBy"]);

            if (!review) {
                throw new AppError("Review not found", 404);
            }

            // Update product rating statistics
            await this.updateProductRatingStats(review.product.toString());

            logger.info(`Review moderated: ${reviewId} status: ${status} by moderator: ${moderatorId}`);
            return review;
        } catch (error) {
            logger.error("Moderate review error:", error);
            throw error;
        }
    }

    /**
     * Mark review as helpful/not helpful
     */
    static async markReviewHelpful(reviewId: string, isHelpful: boolean): Promise<IReview> {
        try {
            const updateField = isHelpful ? "helpfulCount" : "notHelpfulCount";

            const review = await Review.findByIdAndUpdate(
                reviewId,
                { $inc: { [updateField]: 1 } },
                { new: true }
            ).populate(["user", "product"]);

            if (!review) {
                throw new AppError("Review not found", 404);
            }

            return review;
        } catch (error) {
            logger.error("Mark review helpful error:", error);
            throw error;
        }
    }

    /**
     * Get product reviews
     */
    static async getProductReviews(
        productId: string,
        query: ReviewQuery = {}
    ): Promise<{
        reviews: IReview[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
        stats: {
            averageRating: number;
            totalReviews: number;
            ratingDistribution: { [key: number]: number };
        };
    }> {
        try {
            const filters = { product: productId, status: "approved" as const };
            const result = await this.getReviews(filters, query);

            // Get rating statistics
            const stats = await this.getProductReviewStats(productId);

            return {
                ...result,
                stats
            };
        } catch (error) {
            logger.error("Get product reviews error:", error);
            throw error;
        }
    }

    /**
     * Get product review statistics
     */
    static async getProductReviewStats(productId: string): Promise<{
        averageRating: number;
        totalReviews: number;
        ratingDistribution: { [key: number]: number };
    }> {
        try {
            const pipeline = [
                { $match: { product: productId, status: "approved" } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 },
                        ratings: { $push: "$rating" }
                    }
                }
            ];

            const result = await Review.aggregate(pipeline);

            if (!result.length) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            const { averageRating, totalReviews, ratings } = result[0];

            // Calculate rating distribution
            const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            ratings.forEach((rating: number) => {
                if (rating >= 1 && rating <= 5) {
                    ratingDistribution[rating]++;
                }
            });

            return {
                averageRating: Math.round(averageRating * 10) / 10,
                totalReviews,
                ratingDistribution
            };
        } catch (error) {
            logger.error("Get product review stats error:", error);
            throw error;
        }
    }

    /**
     * Update product rating statistics
     */
    private static async updateProductRatingStats(productId: string): Promise<void> {
        try {
            const stats = await this.getProductReviewStats(productId);

            await Product.findByIdAndUpdate(productId, {
                averageRating: stats.averageRating,
                reviewCount: stats.totalReviews
            });
        } catch (error) {
            logger.error("Update product rating stats error:", error);
        }
    }
}

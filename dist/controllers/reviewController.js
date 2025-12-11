"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsByRating = exports.getUserReviews = exports.markReviewHelpful = exports.moderateReview = exports.getProductReviewStats = exports.getProductReviews = exports.deleteReview = exports.updateReview = exports.createReview = exports.getReview = exports.getReviews = void 0;
const reviewService_1 = require("../services/reviewService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
// @desc    Get all reviews
// @route   GET /api/v1/reviews
// @access  Public
exports.getReviews = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, product, user, rating, status, isVerifiedPurchase } = req.query;
    const filters = {
        product: product,
        user: user,
        rating: rating ? parseInt(rating) : undefined,
        status: status,
        isVerifiedPurchase: isVerifiedPurchase ? isVerifiedPurchase === 'true' : undefined
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await reviewService_1.ReviewService.getReviews(filters, query);
    response_1.ResponseHandler.paginated(res, result.reviews, result.pagination.page, result.pagination.limit, result.pagination.total, 'Reviews retrieved successfully');
});
// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReview = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const review = await reviewService_1.ReviewService.getReviewById(req.params.id);
    response_1.ResponseHandler.success(res, review, 'Review retrieved successfully');
});
// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
exports.createReview = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const review = await reviewService_1.ReviewService.createReview(req.body, req.user.id);
    response_1.ResponseHandler.created(res, review, 'Review created successfully');
});
// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const review = await reviewService_1.ReviewService.updateReview(req.params.id, req.body, req.user.id);
    response_1.ResponseHandler.success(res, review, 'Review updated successfully');
});
// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await reviewService_1.ReviewService.deleteReview(req.params.id, req.user.id);
    response_1.ResponseHandler.success(res, null, 'Review deleted successfully');
});
// @desc    Get product reviews
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
exports.getProductReviews = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { productId } = req.params;
    const { page, limit, sort, order } = req.query;
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await reviewService_1.ReviewService.getProductReviews(productId, query);
    res.status(200).json({
        success: true,
        message: 'Product reviews retrieved successfully',
        data: result.reviews,
        pagination: result.pagination,
        stats: result.stats
    });
});
// @desc    Get product review stats
// @route   GET /api/v1/reviews/product/:productId/stats
// @access  Public
exports.getProductReviewStats = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { productId } = req.params;
    const stats = await reviewService_1.ReviewService.getProductReviewStats(productId);
    response_1.ResponseHandler.success(res, stats, 'Product review stats retrieved successfully');
});
// @desc    Moderate review
// @route   PUT /api/v1/reviews/:id/moderate
// @access  Private (Admin)
exports.moderateReview = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { status, moderationNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return response_1.ResponseHandler.badRequest(res, 'Status must be approved or rejected');
    }
    const review = await reviewService_1.ReviewService.moderateReview(req.params.id, status, req.user.id, moderationNote);
    response_1.ResponseHandler.success(res, review, `Review ${status} successfully`);
});
// @desc    Mark review as helpful
// @route   PUT /api/v1/reviews/:id/helpful
// @access  Public
exports.markReviewHelpful = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { isHelpful } = req.body;
    if (typeof isHelpful !== 'boolean') {
        return response_1.ResponseHandler.badRequest(res, 'isHelpful must be a boolean value');
    }
    const review = await reviewService_1.ReviewService.markReviewHelpful(req.params.id, isHelpful);
    const message = isHelpful ? 'Review marked as helpful' : 'Review marked as not helpful';
    response_1.ResponseHandler.success(res, review, message);
});
// @desc    Get user reviews
// @route   GET /api/v1/reviews/user/me
// @access  Private
exports.getUserReviews = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order } = req.query;
    const filters = { user: req.user.id };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await reviewService_1.ReviewService.getReviews(filters, query);
    response_1.ResponseHandler.paginated(res, result.reviews, result.pagination.page, result.pagination.limit, result.pagination.total, 'User reviews retrieved successfully');
});
// @desc    Get reviews by rating
// @route   GET /api/v1/reviews/rating/:rating
// @access  Public
exports.getReviewsByRating = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { rating } = req.params;
    const { page, limit, sort, order, product } = req.query;
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
        return response_1.ResponseHandler.badRequest(res, 'Rating must be between 1 and 5');
    }
    const filters = {
        rating: ratingNum,
        product: product,
        status: 'approved'
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await reviewService_1.ReviewService.getReviews(filters, query);
    response_1.ResponseHandler.paginated(res, result.reviews, result.pagination.page, result.pagination.limit, result.pagination.total, `Reviews with ${rating} stars retrieved successfully`);
});

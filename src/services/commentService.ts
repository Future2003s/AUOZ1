import { FilterQuery } from "mongoose";
import { Comment, IComment } from "../models/Comment";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

interface CreateCommentInput {
    productId: string;
    content: string;
    parentCommentId?: string | null;
}

interface PaginationQuery {
    page?: number;
    limit?: number;
    repliesLimit?: number;
}

interface CommentUserPayload {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
}

export interface CommentResponse {
    id: string;
    productId: string;
    content: string;
    replyCount: number;
    likeCount: number;
    isEdited: boolean;
    status: string;
    parentCommentId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: CommentUserPayload;
    replies?: CommentResponse[];
}

export class CommentService {
    private static buildUserPayload(userDoc: any): CommentUserPayload | undefined {
        if (!userDoc) return undefined;
        const id = String(userDoc._id || userDoc.id || "");
        return {
            id,
            name: [userDoc.firstName, userDoc.lastName].filter(Boolean).join(" ") || userDoc.email || "Người dùng",
            avatar: userDoc.avatar,
            role: userDoc.role
        };
    }

    private static mapCommentDoc(comment: any, replies: CommentResponse[] = []): CommentResponse {
        return {
            id: String(comment._id),
            productId: String(comment.product),
            content: comment.content,
            replyCount: comment.replyCount || 0,
            likeCount: comment.likeCount || 0,
            isEdited: comment.isEdited || false,
            status: comment.status,
            parentCommentId: comment.parentComment ? String(comment.parentComment) : null,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            user: this.buildUserPayload(comment.user),
            replies
        };
    }

    private static getPagination(query?: PaginationQuery) {
        const page = Math.max(1, Number(query?.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query?.limit) || 10));
        const skip = (page - 1) * limit;
        const repliesLimit = Math.min(10, Math.max(1, Number(query?.repliesLimit) || 3));
        return { page, limit, skip, repliesLimit };
    }

    static async createComment(input: CreateCommentInput, userId: string): Promise<CommentResponse> {
        try {
            const { productId, content, parentCommentId } = input;

            const productExists = await Product.exists({ _id: productId });
            if (!productExists) {
                throw new AppError("Product not found", 404);
            }

            let parentComment: IComment | null = null;
            if (parentCommentId) {
                parentComment = await Comment.findById(parentCommentId);
                if (!parentComment || parentComment.status !== "visible") {
                    throw new AppError("Parent comment not found", 404);
                }
                if (String(parentComment.product) !== productId) {
                    throw new AppError("Parent comment does not belong to this product", 400);
                }
            }

            const newComment = await Comment.create({
                product: productId,
                user: userId,
                content: content.trim(),
                parentComment: parentComment ? parentComment._id : null
            });

            if (parentComment) {
                await Comment.findByIdAndUpdate(parentComment._id, { $inc: { replyCount: 1 } }).catch((error) => {
                    logger.warn("Failed to increment replyCount", error);
                });
            }

            const populated = await Comment.findById(newComment._id)
                .populate("user", "firstName lastName avatar role email")
                .lean();

            if (!populated) {
                throw new AppError("Failed to create comment", 500);
            }

            return this.mapCommentDoc(populated);
        } catch (error) {
            logger.error("Create comment error:", error);
            throw error;
        }
    }

    static async getProductComments(productId: string, query?: PaginationQuery) {
        try {
            const { page, limit, skip, repliesLimit } = this.getPagination(query);

            const filter: FilterQuery<IComment> = {
                product: productId,
                parentComment: null,
                status: "visible"
            };

            const [comments, total] = await Promise.all([
                Comment.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("user", "firstName lastName avatar role email")
                    .lean(),
                Comment.countDocuments(filter)
            ]);

            const parentIds = comments.map((comment) => comment._id);
            const replies = parentIds.length
                ? await Comment.find({
                      parentComment: { $in: parentIds },
                      status: "visible"
                  })
                      .sort({ createdAt: 1 })
                      .limit(parentIds.length * repliesLimit)
                      .populate("user", "firstName lastName avatar role email")
                      .lean()
                : [];

            const repliesMap = replies.reduce<Record<string, CommentResponse[]>>((acc, reply) => {
                const parentId = reply.parentComment ? String(reply.parentComment) : "";
                if (!parentId) return acc;
                if (!acc[parentId]) acc[parentId] = [];
                if (acc[parentId].length < repliesLimit) {
                    acc[parentId].push(this.mapCommentDoc(reply));
                }
                return acc;
            }, {});

            const mapped = comments.map((comment) => this.mapCommentDoc(comment, repliesMap[String(comment._id)] || []));

            return {
                comments: mapped,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error("Get product comments error:", error);
            throw error;
        }
    }

    static async getCommentReplies(commentId: string, query?: PaginationQuery) {
        try {
            const { page, limit, skip } = this.getPagination(query);

            const parent = await Comment.findById(commentId);
            if (!parent) {
                throw new AppError("Comment not found", 404);
            }

            const filter: FilterQuery<IComment> = {
                parentComment: commentId,
                status: "visible"
            };

            const [replies, total] = await Promise.all([
                Comment.find(filter)
                    .sort({ createdAt: 1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("user", "firstName lastName avatar role email")
                    .lean(),
                Comment.countDocuments(filter)
            ]);

            return {
                comments: replies.map((reply) => this.mapCommentDoc(reply)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error("Get comment replies error:", error);
            throw error;
        }
    }

    static async deleteComment(commentId: string, userId: string, userRole: string) {
        try {
            const comment = await Comment.findById(commentId);
            if (!comment) {
                throw new AppError("Comment not found", 404);
            }

            const isOwner = String(comment.user) === userId;
            const isAdmin = ["admin", "seller"].includes(userRole);

            if (!isOwner && !isAdmin) {
                throw new AppError("You are not authorized to delete this comment", 403);
            }

            await Comment.deleteMany({
                $or: [{ _id: commentId }, { parentComment: commentId }]
            });

            if (comment.parentComment) {
                await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { replyCount: -1 } }).catch((error) => {
                    logger.warn("Failed to decrement replyCount", error);
                });
            }

            return true;
        } catch (error) {
            logger.error("Delete comment error:", error);
            throw error;
        }
    }
}


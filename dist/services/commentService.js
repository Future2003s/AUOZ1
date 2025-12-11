"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const Comment_1 = require("../models/Comment");
const Product_1 = require("../models/Product");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
class CommentService {
    static buildUserPayload(userDoc) {
        if (!userDoc)
            return undefined;
        const id = String(userDoc._id || userDoc.id || "");
        return {
            id,
            name: [userDoc.firstName, userDoc.lastName].filter(Boolean).join(" ") || userDoc.email || "Người dùng",
            avatar: userDoc.avatar,
            role: userDoc.role
        };
    }
    static mapCommentDoc(comment, replies = []) {
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
    static getPagination(query) {
        const page = Math.max(1, Number(query?.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query?.limit) || 10));
        const skip = (page - 1) * limit;
        const repliesLimit = Math.min(10, Math.max(1, Number(query?.repliesLimit) || 3));
        return { page, limit, skip, repliesLimit };
    }
    static async createComment(input, userId) {
        try {
            const { productId, content, parentCommentId } = input;
            const productExists = await Product_1.Product.exists({ _id: productId });
            if (!productExists) {
                throw new AppError_1.AppError("Product not found", 404);
            }
            let parentComment = null;
            if (parentCommentId) {
                parentComment = await Comment_1.Comment.findById(parentCommentId);
                if (!parentComment || parentComment.status !== "visible") {
                    throw new AppError_1.AppError("Parent comment not found", 404);
                }
                if (String(parentComment.product) !== productId) {
                    throw new AppError_1.AppError("Parent comment does not belong to this product", 400);
                }
            }
            const newComment = await Comment_1.Comment.create({
                product: productId,
                user: userId,
                content: content.trim(),
                parentComment: parentComment ? parentComment._id : null
            });
            if (parentComment) {
                await Comment_1.Comment.findByIdAndUpdate(parentComment._id, { $inc: { replyCount: 1 } }).catch((error) => {
                    logger_1.logger.warn("Failed to increment replyCount", error);
                });
            }
            const populated = await Comment_1.Comment.findById(newComment._id)
                .populate("user", "firstName lastName avatar role email")
                .lean();
            if (!populated) {
                throw new AppError_1.AppError("Failed to create comment", 500);
            }
            return this.mapCommentDoc(populated);
        }
        catch (error) {
            logger_1.logger.error("Create comment error:", error);
            throw error;
        }
    }
    static async getProductComments(productId, query) {
        try {
            const { page, limit, skip, repliesLimit } = this.getPagination(query);
            const filter = {
                product: productId,
                parentComment: null,
                status: "visible"
            };
            const [comments, total] = await Promise.all([
                Comment_1.Comment.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("user", "firstName lastName avatar role email")
                    .lean(),
                Comment_1.Comment.countDocuments(filter)
            ]);
            const parentIds = comments.map((comment) => comment._id);
            const replies = parentIds.length
                ? await Comment_1.Comment.find({
                    parentComment: { $in: parentIds },
                    status: "visible"
                })
                    .sort({ createdAt: 1 })
                    .limit(parentIds.length * repliesLimit)
                    .populate("user", "firstName lastName avatar role email")
                    .lean()
                : [];
            const repliesMap = replies.reduce((acc, reply) => {
                const parentId = reply.parentComment ? String(reply.parentComment) : "";
                if (!parentId)
                    return acc;
                if (!acc[parentId])
                    acc[parentId] = [];
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
        }
        catch (error) {
            logger_1.logger.error("Get product comments error:", error);
            throw error;
        }
    }
    static async getCommentReplies(commentId, query) {
        try {
            const { page, limit, skip } = this.getPagination(query);
            const parent = await Comment_1.Comment.findById(commentId);
            if (!parent) {
                throw new AppError_1.AppError("Comment not found", 404);
            }
            const filter = {
                parentComment: commentId,
                status: "visible"
            };
            const [replies, total] = await Promise.all([
                Comment_1.Comment.find(filter)
                    .sort({ createdAt: 1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("user", "firstName lastName avatar role email")
                    .lean(),
                Comment_1.Comment.countDocuments(filter)
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
        }
        catch (error) {
            logger_1.logger.error("Get comment replies error:", error);
            throw error;
        }
    }
    static async deleteComment(commentId, userId, userRole) {
        try {
            const comment = await Comment_1.Comment.findById(commentId);
            if (!comment) {
                throw new AppError_1.AppError("Comment not found", 404);
            }
            const isOwner = String(comment.user) === userId;
            const isAdmin = ["admin", "seller"].includes(userRole);
            if (!isOwner && !isAdmin) {
                throw new AppError_1.AppError("You are not authorized to delete this comment", 403);
            }
            await Comment_1.Comment.deleteMany({
                $or: [{ _id: commentId }, { parentComment: commentId }]
            });
            if (comment.parentComment) {
                await Comment_1.Comment.findByIdAndUpdate(comment.parentComment, { $inc: { replyCount: -1 } }).catch((error) => {
                    logger_1.logger.warn("Failed to decrement replyCount", error);
                });
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error("Delete comment error:", error);
            throw error;
        }
    }
}
exports.CommentService = CommentService;

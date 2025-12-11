"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.getCommentReplies = exports.getProductComments = exports.createComment = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const commentService_1 = require("../services/commentService");
// @desc    Create product comment
// @route   POST /api/v1/comments
// @access  Private
exports.createComment = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const comment = await commentService_1.CommentService.createComment(req.body, req.user.id);
    response_1.ResponseHandler.created(res, comment, "Comment created successfully");
});
// @desc    Get product comments
// @route   GET /api/v1/comments/product/:productId
// @access  Public
exports.getProductComments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    const { productId } = req.params;
    const result = await commentService_1.CommentService.getProductComments(productId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    response_1.ResponseHandler.paginated(res, result.comments, result.pagination.page, result.pagination.limit, result.pagination.total);
});
// @desc    Get comment replies
// @route   GET /api/v1/comments/:commentId/replies
// @access  Public
exports.getCommentReplies = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    const { commentId } = req.params;
    const result = await commentService_1.CommentService.getCommentReplies(commentId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    response_1.ResponseHandler.paginated(res, result.comments, result.pagination.page, result.pagination.limit, result.pagination.total);
});
// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
// @access  Private
exports.deleteComment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await commentService_1.CommentService.deleteComment(req.params.id, req.user.id, req.user.role);
    response_1.ResponseHandler.deleted(res, "Comment deleted successfully");
});

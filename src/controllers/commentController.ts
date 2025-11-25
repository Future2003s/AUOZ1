import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { CommentService } from "../services/commentService";

// @desc    Create product comment
// @route   POST /api/v1/comments
// @access  Private
export const createComment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const comment = await CommentService.createComment(req.body, req.user.id);
    ResponseHandler.created(res, comment, "Comment created successfully");
});

// @desc    Get product comments
// @route   GET /api/v1/comments/product/:productId
// @access  Public
export const getProductComments = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const { productId } = req.params;

    const result = await CommentService.getProductComments(productId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
    });

    ResponseHandler.paginated(res, result.comments, result.pagination.page, result.pagination.limit, result.pagination.total);
});

// @desc    Get comment replies
// @route   GET /api/v1/comments/:commentId/replies
// @access  Public
export const getCommentReplies = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const { commentId } = req.params;

    const result = await CommentService.getCommentReplies(commentId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
    });

    ResponseHandler.paginated(res, result.comments, result.pagination.page, result.pagination.limit, result.pagination.total);
});

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
// @access  Private
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    await CommentService.deleteComment(req.params.id, req.user.id, req.user.role);
    ResponseHandler.deleted(res, "Comment deleted successfully");
});


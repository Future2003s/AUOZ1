import { Router } from "express";
import { protect } from "../middleware/auth";
import { commentRateLimit } from "../middleware/rateLimiting";
import {
    validateCreateComment,
    validateCommentIdParam,
    validateProductIdParam,
    validatePagination
} from "../middleware/unifiedValidation";
import {
    createComment,
    deleteComment,
    getCommentReplies,
    getProductComments
} from "../controllers/commentController";

const router = Router();

router.get(
    "/product/:productId",
    commentRateLimit,
    validateProductIdParam,
    validatePagination,
    getProductComments
);

router.get(
    "/:commentId/replies",
    commentRateLimit,
    validateCommentIdParam,
    validatePagination,
    getCommentReplies
);

router.post("/", protect, commentRateLimit, validateCreateComment, createComment);

router.delete("/:id", protect, commentRateLimit, validateCommentIdParam, deleteComment);

export default router;


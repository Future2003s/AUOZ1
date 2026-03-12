import { Router } from "express";
import { protect } from "../middleware/auth";
import {
    getConversations,
    getMessages,
    sendMessage,
    createGroup,
    createDirect,
    deleteConversation,
    markAsRead,
    getChatUsers,
    addGroupMember,
    updateGroup,
    updateMemberRole,
    removeMember,
    uploadChatFile,
    recallMessage
} from "../controllers/chatController";
import { uploadChatAttachment } from "../middleware/upload";

const router = Router();

// All routes require authentication
router.use(protect);

// Conversations
router.get("/conversations", getConversations);
router.post("/conversations/group", createGroup);
router.post("/conversations/direct", createDirect);
router.delete("/conversations/:id", deleteConversation);
router.put("/conversations/:id/read", markAsRead);
router.post("/conversations/:id/members", addGroupMember);
router.put("/conversations/:id/group", updateGroup);
router.put("/conversations/:id/members/:memberId/role", updateMemberRole);
router.delete("/conversations/:id/members/:memberId", removeMember);

// Uploads
router.post("/upload", uploadChatAttachment, uploadChatFile);

// Messages
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);
router.delete("/messages/:messageId/recall", recallMessage);

// Users for chat
router.get("/users", getChatUsers);

export default router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const chatController_1 = require("../controllers/chatController");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
// Conversations
router.get("/conversations", chatController_1.getConversations);
router.post("/conversations/group", chatController_1.createGroup);
router.post("/conversations/direct", chatController_1.createDirect);
router.delete("/conversations/:id", chatController_1.deleteConversation);
router.put("/conversations/:id/read", chatController_1.markAsRead);
router.post("/conversations/:id/members", chatController_1.addGroupMember);
router.put("/conversations/:id/group", chatController_1.updateGroup);
router.put("/conversations/:id/members/:memberId/role", chatController_1.updateMemberRole);
router.delete("/conversations/:id/members/:memberId", chatController_1.removeMember);
// Uploads
router.post("/upload", upload_1.uploadChatAttachment, chatController_1.uploadChatFile);
// Messages
router.get("/conversations/:id/messages", chatController_1.getMessages);
router.post("/conversations/:id/messages", chatController_1.sendMessage);
router.delete("/messages/:messageId/recall", chatController_1.recallMessage);
// Groups
router.get("/groups", chatController_1.getJoinedGroups);
// Users for chat
router.get("/users", chatController_1.getChatUsers);
exports.default = router;

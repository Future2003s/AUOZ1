import { Request, Response } from "express";
import { chatService } from "../services/chatService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { uploadToCloudinary } from "../utils/cloudinary";
import { emitChatMessage } from "../config/socket";
import { logger } from "../utils/logger";

// GET /api/v1/chat/conversations
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const conversations = await chatService.getConversations(userId);

    res.status(200).json({
        success: true,
        count: conversations.length,
        data: conversations
    });
});

// GET /api/v1/chat/conversations/:id/messages
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await chatService.getMessages(id, userId, page, limit);

    res.status(200).json({
        success: true,
        ...result
    });
});

// POST /api/v1/chat/conversations/:id/messages
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { text, images, file, replyTo } = req.body;

    if (!text && (!images || images.length === 0) && !file) {
        throw new AppError("Message must have text, images, or file", 400);
    }

    const message = await chatService.sendMessage(id, userId, {
        text,
        images,
        file,
        replyTo
    });

    // Emit via Socket.IO unified helper
    await emitChatMessage(id, message, userId.toString());

    res.status(201).json({
        success: true,
        data: message
    });
});

// POST /api/v1/chat/conversations/group
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { name, memberIds, avatar, color } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
        throw new AppError("Group name and members are required", 400);
    }

    const conversation = await chatService.createGroup(name, memberIds, userId, avatar, color);

    // Notify all members via Socket.IO
    const io = req.app.get("io");
    if (io) {
        memberIds.forEach((memberId: string) => {
            io.to(`user:${memberId}`).emit("chat:newConversation", conversation);
        });
    }

    res.status(201).json({
        success: true,
        data: conversation
    });
});

// POST /api/v1/chat/conversations/direct
export const createDirect = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
        throw new AppError("Target user ID is required", 400);
    }

    const result = await chatService.getOrCreateDirect(userId, targetUserId);

    // Notify target user if new conversation
    if (result.created) {
        const io = req.app.get("io");
        if (io) {
            io.to(`user:${targetUserId}`).emit("chat:newConversation", result.conversation);
        }
    }

    res.status(result.created ? 201 : 200).json({
        success: true,
        data: result.conversation,
        created: result.created
    });
});

// DELETE /api/v1/chat/conversations/:id
export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    await chatService.deleteConversation(id, userId);

    res.status(200).json({
        success: true,
        message: "Conversation deleted"
    });
});

// PUT /api/v1/chat/conversations/:id/read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    await chatService.markAsRead(id, userId);

    // Notify via Socket.IO
    const io = req.app.get("io");
    if (io) {
        io.to(`conv:${id}`).emit("chat:read", { conversationId: id, userId });
    }

    res.status(200).json({
        success: true,
        message: "Marked as read"
    });
});

// GET /api/v1/chat/users
export const getChatUsers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const users = await chatService.getChatUsers(userId);

    res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

// POST /api/v1/chat/conversations/:id/members
export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        throw new AppError("memberIds array is required", 400);
    }

    const conversation = await chatService.addGroupMember(id, memberIds, userId);

    // Notify all members via Socket.IO
    const io = req.app.get("io");
    if (io) {
        // Notify new members they were added to the group
        memberIds.forEach((memberId: string) => {
            io.to(`user:${memberId}`).emit("chat:newConversation", conversation);
        });
        // You could optionally notify existing members that the group was updated
        // io.to(`conv:${id}`).emit("chat:conversationUpdated", conversation);
    }

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// PUT /api/v1/chat/conversations/:id/group
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { name, avatar, color } = req.body;

    const conversation = await chatService.updateGroup(id, { name, avatar, color }, userId);

    const io = req.app.get("io");
    if (io && conversation) {
        // notify all participants of group change
        conversation.participants.forEach((p: any) => {
            const pid = p._id || p.id;
            io.to(`user:${pid}`).emit("chat:conversationUpdated", conversation);
        });
    }

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// PUT /api/v1/chat/conversations/:id/members/:memberId/role
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id, memberId } = req.params;
    const { action } = req.body; // 'promote' or 'demote'

    if (!["promote", "demote"].includes(action)) {
        throw new AppError("Action must be 'promote' or 'demote'", 400);
    }

    const conversation = await chatService.updateMemberRole(id, memberId, action as "promote" | "demote", userId);

    const io = req.app.get("io");
    if (io && conversation) {
        conversation.participants.forEach((p: any) => {
            const pid = p._id || p.id;
            io.to(`user:${pid}`).emit("chat:conversationUpdated", conversation);
        });
    }

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// DELETE /api/v1/chat/conversations/:id/members/:memberId
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { id, memberId } = req.params;

    const conversation = await chatService.removeMember(id, memberId, userId);

    const io = req.app.get("io");
    if (io && conversation) {
        // notify remaining members
        conversation.participants.forEach((p: any) => {
            const pid = p._id || p.id;
            io.to(`user:${pid}`).emit("chat:conversationUpdated", conversation);
        });
        // also notify the removed user maybe so their UI can remove the convo
        io.to(`user:${memberId}`).emit("chat:removedFromConversation", { conversationId: id });
    }

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// POST /api/v1/chat/upload
export const uploadChatFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File;
    if (!file) {
        throw new AppError("No file uploaded", 400);
    }

    // Validate file size (max 20MB for chat)
    if (file.size > 20 * 1024 * 1024) {
        throw new AppError("File size cannot exceed 20MB", 400);
    }

    const timestamp = Date.now();
    const publicId = `chat/${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    const isImage = file.mimetype.startsWith('image/');
    
    // Upload raw files if not image, otherwise auto
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "chat",
        public_id: publicId,
        resource_type: "auto"
    });
    const cloudRes = cloudinaryResult as any;

    res.status(200).json({
        success: true,
        data: {
            url: cloudRes.secure_url,
            name: file.originalname,
            size: file.size,
            isImage,
            width: cloudRes.width,
            height: cloudRes.height,
        }
    });
});

// DELETE /api/v1/chat/messages/:messageId/recall
export const recallMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const { messageId } = req.params;

    logger.info(`[ChatController] Recall request for message ${messageId} from user ${userId}`);
    const message = await chatService.recallMessage(messageId, userId.toString());

    // Broadcast recall event to all members of the conversation
    const io = req.app.get("io");
    if (io) {
        logger.info(`[ChatController] Emitting chat:messageRecalled for message ${messageId} in conv ${message.conversationId}`);
        io.to(`conv:${message.conversationId}`).emit("chat:messageRecalled", {
            messageId: message._id,
            conversationId: message.conversationId
        });
    } else {
        logger.warn("[ChatController] Socket.IO instance not found, recall event not broadcasted");
    }

    res.status(200).json({
        success: true,
        data: { messageId: message._id, conversationId: message.conversationId }
    });
});

// GET /api/v1/chat/groups
export const getJoinedGroups = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id || req.user.id;
    const groups = await chatService.getJoinedGroups(userId.toString());
    
    res.status(200).json({
        success: true,
        data: groups
    });
});

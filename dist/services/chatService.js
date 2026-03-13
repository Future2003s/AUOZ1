"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ChatConversation_1 = require("../models/ChatConversation");
const ChatMessage_1 = require("../models/ChatMessage");
const User_1 = require("../models/User");
const AppError_1 = require("../utils/AppError");
class ChatService {
    /**
     * Get all conversations for a user, sorted by last activity
     */
    async getConversations(userId) {
        const conversations = await ChatConversation_1.ChatConversation.find({
            participants: new mongoose_1.default.Types.ObjectId(userId),
            hiddenBy: { $ne: new mongoose_1.default.Types.ObjectId(userId) }
        })
            .sort({ updatedAt: -1 })
            .populate("participants", "firstName lastName email avatar role isActive")
            .populate("lastMessage.senderId", "firstName lastName")
            .lean();
        // Count unread for each conversation
        const result = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await ChatMessage_1.ChatMessage.countDocuments({
                conversationId: conv._id,
                senderId: { $ne: new mongoose_1.default.Types.ObjectId(userId) },
                readBy: { $ne: new mongoose_1.default.Types.ObjectId(userId) }
            });
            return { ...conv, unreadCount };
        }));
        return result;
    }
    /**
     * Get paginated messages for a conversation
     */
    async getMessages(conversationId, userId, page = 1, limit = 50) {
        // Verify user is participant
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Conversation not found or access denied", 404);
        }
        const skip = (page - 1) * limit;
        const messages = await ChatMessage_1.ChatMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit)
            .populate("senderId", "firstName lastName email avatar role")
            .lean();
        const total = await ChatMessage_1.ChatMessage.countDocuments({ conversationId });
        return {
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Send a message in a conversation
     */
    async sendMessage(conversationId, senderId, data) {
        // Verify user is participant
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose_1.default.Types.ObjectId(senderId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Conversation not found or access denied", 404);
        }
        // Create message
        const message = await ChatMessage_1.ChatMessage.create({
            conversationId,
            senderId,
            text: data.text,
            images: data.images,
            file: data.file,
            replyTo: data.replyTo
                ? {
                    messageId: new mongoose_1.default.Types.ObjectId(data.replyTo.messageId),
                    senderId: new mongoose_1.default.Types.ObjectId(data.replyTo.senderId),
                    text: data.replyTo.text,
                    image: data.replyTo.image,
                    fileName: data.replyTo.fileName
                }
                : undefined,
            readBy: [senderId]
        });
        // Update conversation's lastMessage and clear hiddenBy so it resurfaces
        await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
                senderId,
                text: data.text || (data.images?.length ? "📷 Hình ảnh" : "📎 Tệp đính kèm"),
                time: new Date()
            },
            updatedAt: new Date(),
            $set: { hiddenBy: [] }
        });
        // Populate and return
        const populated = await ChatMessage_1.ChatMessage.findById(message._id)
            .populate("senderId", "firstName lastName email avatar role")
            .lean();
        return populated;
    }
    /**
     * Create a group conversation
     */
    async createGroup(name, memberIds, createdBy, avatar, color) {
        // Ensure creator is in members
        const allMembers = [...new Set([createdBy, ...memberIds])];
        // Verify all users exist
        const users = await User_1.User.find({
            _id: { $in: allMembers.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
            isActive: true
        }).lean();
        if (users.length !== allMembers.length) {
            throw new AppError_1.AppError("Some users not found or inactive", 400);
        }
        const conversation = await ChatConversation_1.ChatConversation.create({
            type: "group",
            name,
            avatar: avatar || name.substring(0, 2).toUpperCase(),
            color: color || "#0068ff",
            participants: allMembers.map((id) => new mongoose_1.default.Types.ObjectId(id)),
            admins: [new mongoose_1.default.Types.ObjectId(createdBy)],
            createdBy: new mongoose_1.default.Types.ObjectId(createdBy)
        });
        const populated = await ChatConversation_1.ChatConversation.findById(conversation._id)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
        return populated;
    }
    /**
     * Get or create a direct conversation between two users
     */
    async getOrCreateDirect(userId1, userId2) {
        // Check if existing direct conversation exists
        const existing = await ChatConversation_1.ChatConversation.findOne({
            type: "direct",
            participants: {
                $all: [
                    new mongoose_1.default.Types.ObjectId(userId1),
                    new mongoose_1.default.Types.ObjectId(userId2)
                ],
                $size: 2
            }
        })
            .populate("participants", "firstName lastName email avatar role isActive")
            .populate("lastMessage.senderId", "firstName lastName")
            .lean();
        if (existing) {
            return { conversation: existing, created: false };
        }
        // Create new direct conversation
        const conversation = await ChatConversation_1.ChatConversation.create({
            type: "direct",
            participants: [
                new mongoose_1.default.Types.ObjectId(userId1),
                new mongoose_1.default.Types.ObjectId(userId2)
            ],
            createdBy: new mongoose_1.default.Types.ObjectId(userId1)
        });
        const populated = await ChatConversation_1.ChatConversation.findById(conversation._id)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
        return { conversation: populated, created: true };
    }
    /**
     * Hide (soft delete) a conversation from the user's inbox
     */
    async deleteConversation(conversationId, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Conversation not found or access denied", 404);
        }
        // Soft delete: add user to hiddenBy
        await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
            $addToSet: { hiddenBy: new mongoose_1.default.Types.ObjectId(userId) }
        });
        return { success: true };
    }
    /**
     * Mark all messages in a conversation as read by user
     */
    async markAsRead(conversationId, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Conversation not found or access denied", 404);
        }
        await ChatMessage_1.ChatMessage.updateMany({
            conversationId,
            senderId: { $ne: new mongoose_1.default.Types.ObjectId(userId) },
            readBy: { $ne: new mongoose_1.default.Types.ObjectId(userId) }
        }, {
            $addToSet: { readBy: new mongoose_1.default.Types.ObjectId(userId) }
        });
        return { success: true };
    }
    /**
     * Get list of users available for chat
     */
    async getChatUsers(currentUserId) {
        const users = await User_1.User.find({
            isActive: true,
            _id: { $ne: new mongoose_1.default.Types.ObjectId(currentUserId) }
        })
            .select("firstName lastName email avatar role")
            .sort({ firstName: 1 })
            .lean();
        return users;
    }
    /**
     * Get all groups a user has joined
     */
    async getJoinedGroups(userId) {
        const groups = await ChatConversation_1.ChatConversation.find({
            type: "group",
            participants: new mongoose_1.default.Types.ObjectId(userId)
        })
            .sort({ name: 1 })
            .populate("participants", "firstName lastName email avatar role isActive")
            .populate("lastMessage.senderId", "firstName lastName")
            .lean();
        return groups;
    }
    /**
     * Add members to a group conversation
     */
    async addGroupMember(conversationId, memberIds, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            participants: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Group conversation not found or access denied", 404);
        }
        // Verify users exist and are active
        const usersToAdd = await User_1.User.find({
            _id: { $in: memberIds.map(id => new mongoose_1.default.Types.ObjectId(id)) },
            isActive: true
        }).lean();
        if (usersToAdd.length !== memberIds.length) {
            throw new AppError_1.AppError("Some users not found or inactive", 400);
        }
        // Add to participants array using $addToSet to avoid duplicates
        await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
            $addToSet: {
                participants: { $each: memberIds.map(id => new mongoose_1.default.Types.ObjectId(id)) }
            },
            updatedAt: new Date()
        });
        const populated = await ChatConversation_1.ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
        return populated;
    }
    /**
     * Update group settings (name, avatar) - Only Admins
     */
    async updateGroup(conversationId, data, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            $or: [
                { admins: new mongoose_1.default.Types.ObjectId(userId) },
                { createdBy: new mongoose_1.default.Types.ObjectId(userId) }
            ]
        });
        if (!conv) {
            throw new AppError_1.AppError("Group not found or you do not have permission", 403);
        }
        const updates = { updatedAt: new Date() };
        if (data.name)
            updates.name = data.name;
        if (data.avatar)
            updates.avatar = data.avatar;
        if (data.color)
            updates.color = data.color;
        await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, updates);
        return await ChatConversation_1.ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }
    /**
     * Promote or Demote member - Only Admins
     */
    async updateMemberRole(conversationId, targetUserId, action, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            $or: [
                { admins: new mongoose_1.default.Types.ObjectId(userId) },
                { createdBy: new mongoose_1.default.Types.ObjectId(userId) }
            ]
        });
        if (!conv) {
            throw new AppError_1.AppError("Group not found or you do not have permission", 403);
        }
        if (action === "promote") {
            await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
                $addToSet: { admins: new mongoose_1.default.Types.ObjectId(targetUserId) },
                updatedAt: new Date()
            });
        }
        else if (action === "demote") {
            // Cannot demote the creator
            if (conv.createdBy.toString() === targetUserId) {
                throw new AppError_1.AppError("Cannot demote the group creator", 400);
            }
            await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
                $pull: { admins: new mongoose_1.default.Types.ObjectId(targetUserId) },
                updatedAt: new Date()
            });
        }
        return await ChatConversation_1.ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }
    /**
     * Remove member from group - Only Admins or self leave
     */
    async removeMember(conversationId, targetUserId, userId) {
        const conv = await ChatConversation_1.ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            participants: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!conv) {
            throw new AppError_1.AppError("Group not found", 404);
        }
        const isAdmin = conv.admins?.some(adminId => adminId.toString() === userId) || conv.createdBy.toString() === userId;
        // Can remove if self leaving, or if current user is admin
        if (targetUserId !== userId && !isAdmin) {
            throw new AppError_1.AppError("You do not have permission to remove members", 403);
        }
        // Creator cannot be removed (unless deleting group, handled elsewhere)
        if (conv.createdBy.toString() === targetUserId && targetUserId !== userId) {
            throw new AppError_1.AppError("Cannot remove the group creator", 400);
        }
        await ChatConversation_1.ChatConversation.findByIdAndUpdate(conversationId, {
            $pull: {
                participants: new mongoose_1.default.Types.ObjectId(targetUserId),
                admins: new mongoose_1.default.Types.ObjectId(targetUserId)
            },
            updatedAt: new Date()
        });
        return await ChatConversation_1.ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }
    /**
     * Recall (unsend) a message - only sender, within 30 minutes
     */
    async recallMessage(messageId, userId) {
        const message = await ChatMessage_1.ChatMessage.findById(messageId);
        if (!message) {
            throw new AppError_1.AppError("Message not found", 404);
        }
        // Only sender can recall
        if (message.senderId.toString() !== userId) {
            throw new AppError_1.AppError("You can only recall your own messages", 403);
        }
        // Optional: time limit (30 minutes)
        const LIMIT_MS = 30 * 60 * 1000;
        if (Date.now() - new Date(message.createdAt).getTime() > LIMIT_MS) {
            throw new AppError_1.AppError("Tin nhắn quá cũ để thu hồi (tối đa 30 phút)", 400);
        }
        message.recalled = true;
        message.text = undefined;
        message.images = [];
        message.file = undefined;
        await message.save();
        return message;
    }
}
exports.chatService = new ChatService();

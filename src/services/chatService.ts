import mongoose from "mongoose";
import { ChatConversation, IChatConversation } from "../models/ChatConversation";
import { ChatMessage, IChatMessage } from "../models/ChatMessage";
import { User } from "../models/User";
import { logger } from "../utils/logger";
import { AppError } from "../utils/AppError";

class ChatService {
    /**
     * Get all conversations for a user, sorted by last activity
     */
    async getConversations(userId: string) {
        const conversations = await ChatConversation.find({
            participants: new mongoose.Types.ObjectId(userId),
            hiddenBy: { $ne: new mongoose.Types.ObjectId(userId) }
        })
            .sort({ updatedAt: -1 })
            .populate("participants", "firstName lastName email avatar role isActive")
            .populate("lastMessage.senderId", "firstName lastName")
            .lean();

        // Count unread for each conversation
        const result = await Promise.all(
            conversations.map(async (conv) => {
                const unreadCount = await ChatMessage.countDocuments({
                    conversationId: conv._id,
                    senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                    readBy: { $ne: new mongoose.Types.ObjectId(userId) }
                });
                return { ...conv, unreadCount };
            })
        );

        return result;
    }

    /**
     * Get paginated messages for a conversation
     */
    async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
        // Verify user is participant
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!conv) {
            throw new AppError("Conversation not found or access denied", 404);
        }

        const skip = (page - 1) * limit;

        const messages = await ChatMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit)
            .populate("senderId", "firstName lastName email avatar role")
            .lean();

        const total = await ChatMessage.countDocuments({ conversationId });

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
    async sendMessage(
        conversationId: string,
        senderId: string,
        data: {
            text?: string;
            images?: string[];
            file?: { name: string; size: number; url?: string };
            replyTo?: {
                messageId: string;
                senderId: string;
                text?: string;
                image?: string;
                fileName?: string;
            };
        }
    ) {
        // Verify user is participant
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose.Types.ObjectId(senderId)
        });

        if (!conv) {
            throw new AppError("Conversation not found or access denied", 404);
        }

        // Create message
        const message = await ChatMessage.create({
            conversationId,
            senderId,
            text: data.text,
            images: data.images,
            file: data.file,
            replyTo: data.replyTo
                ? {
                      messageId: new mongoose.Types.ObjectId(data.replyTo.messageId),
                      senderId: new mongoose.Types.ObjectId(data.replyTo.senderId),
                      text: data.replyTo.text,
                      image: data.replyTo.image,
                      fileName: data.replyTo.fileName
                  }
                : undefined,
            readBy: [senderId]
        });

        // Update conversation's lastMessage and clear hiddenBy so it resurfaces
        await ChatConversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
                senderId,
                text: data.text || (data.images?.length ? "📷 Hình ảnh" : "📎 Tệp đính kèm"),
                time: new Date()
            },
            updatedAt: new Date(),
            $set: { hiddenBy: [] }
        });

        // Populate and return
        const populated = await ChatMessage.findById(message._id)
            .populate("senderId", "firstName lastName email avatar role")
            .lean();

        return populated;
    }

    /**
     * Create a group conversation
     */
    async createGroup(
        name: string,
        memberIds: string[],
        createdBy: string,
        avatar?: string,
        color?: string
    ) {
        // Ensure creator is in members
        const allMembers = [...new Set([createdBy, ...memberIds])];

        // Verify all users exist
        const users = await User.find({
            _id: { $in: allMembers.map((id) => new mongoose.Types.ObjectId(id)) },
            isActive: true
        }).lean();

        if (users.length !== allMembers.length) {
            throw new AppError("Some users not found or inactive", 400);
        }

        const conversation = await ChatConversation.create({
            type: "group",
            name,
            avatar: avatar || name.substring(0, 2).toUpperCase(),
            color: color || "#0068ff",
            participants: allMembers.map((id) => new mongoose.Types.ObjectId(id)),
            admins: [new mongoose.Types.ObjectId(createdBy)],
            createdBy: new mongoose.Types.ObjectId(createdBy)
        });

        const populated = await ChatConversation.findById(conversation._id)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();

        return populated;
    }

    /**
     * Get or create a direct conversation between two users
     */
    async getOrCreateDirect(userId1: string, userId2: string) {
        // Check if existing direct conversation exists
        const existing = await ChatConversation.findOne({
            type: "direct",
            participants: {
                $all: [
                    new mongoose.Types.ObjectId(userId1),
                    new mongoose.Types.ObjectId(userId2)
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
        const conversation = await ChatConversation.create({
            type: "direct",
            participants: [
                new mongoose.Types.ObjectId(userId1),
                new mongoose.Types.ObjectId(userId2)
            ],
            createdBy: new mongoose.Types.ObjectId(userId1)
        });

        const populated = await ChatConversation.findById(conversation._id)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();

        return { conversation: populated, created: true };
    }

    /**
     * Hide (soft delete) a conversation from the user's inbox
     */
    async deleteConversation(conversationId: string, userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!conv) {
            throw new AppError("Conversation not found or access denied", 404);
        }

        // Soft delete: add user to hiddenBy
        await ChatConversation.findByIdAndUpdate(conversationId, {
            $addToSet: { hiddenBy: new mongoose.Types.ObjectId(userId) }
        });

        return { success: true };
    }

    /**
     * Mark all messages in a conversation as read by user
     */
    async markAsRead(conversationId: string, userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!conv) {
            throw new AppError("Conversation not found or access denied", 404);
        }

        await ChatMessage.updateMany(
            {
                conversationId,
                senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                readBy: { $ne: new mongoose.Types.ObjectId(userId) }
            },
            {
                $addToSet: { readBy: new mongoose.Types.ObjectId(userId) }
            }
        );

        return { success: true };
    }

    /**
     * Get list of users available for chat
     */
    async getChatUsers(currentUserId: string) {
        const users = await User.find({
            isActive: true,
            _id: { $ne: new mongoose.Types.ObjectId(currentUserId) }
        })
            .select("firstName lastName email avatar role")
            .sort({ firstName: 1 })
            .lean();

        return users;
    }

    /**
     * Get all groups a user has joined
     */
    async getJoinedGroups(userId: string) {
        const groups = await ChatConversation.find({
            type: "group",
            participants: new mongoose.Types.ObjectId(userId)
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
    async addGroupMember(conversationId: string, memberIds: string[], userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!conv) {
            throw new AppError("Group conversation not found or access denied", 404);
        }

        // Verify users exist and are active
        const usersToAdd = await User.find({
            _id: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
            isActive: true
        }).lean();

        if (usersToAdd.length !== memberIds.length) {
            throw new AppError("Some users not found or inactive", 400);
        }

        // Add to participants array using $addToSet to avoid duplicates
        await ChatConversation.findByIdAndUpdate(
            conversationId,
            {
                $addToSet: {
                    participants: { $each: memberIds.map(id => new mongoose.Types.ObjectId(id)) }
                },
                updatedAt: new Date()
            }
        );

        const populated = await ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();

        return populated;
    }

    /**
     * Update group settings (name, avatar) - Only Admins
     */
    async updateGroup(conversationId: string, data: { name?: string; avatar?: string; color?: string; }, userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            $or: [
                { admins: new mongoose.Types.ObjectId(userId) },
                { createdBy: new mongoose.Types.ObjectId(userId) }
            ]
        });

        if (!conv) {
            throw new AppError("Group not found or you do not have permission", 403);
        }

        const updates: any = { updatedAt: new Date() };
        if (data.name) updates.name = data.name;
        if (data.avatar) updates.avatar = data.avatar;
        if (data.color) updates.color = data.color;

        await ChatConversation.findByIdAndUpdate(conversationId, updates);

        return await ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }

    /**
     * Promote or Demote member - Only Admins
     */
    async updateMemberRole(conversationId: string, targetUserId: string, action: "promote" | "demote", userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            $or: [
                { admins: new mongoose.Types.ObjectId(userId) },
                { createdBy: new mongoose.Types.ObjectId(userId) }
            ]
        });

        if (!conv) {
            throw new AppError("Group not found or you do not have permission", 403);
        }

        if (action === "promote") {
            await ChatConversation.findByIdAndUpdate(conversationId, {
                $addToSet: { admins: new mongoose.Types.ObjectId(targetUserId) },
                updatedAt: new Date()
            });
        } else if (action === "demote") {
            // Cannot demote the creator
            if (conv.createdBy.toString() === targetUserId) {
                throw new AppError("Cannot demote the group creator", 400);
            }
            await ChatConversation.findByIdAndUpdate(conversationId, {
                $pull: { admins: new mongoose.Types.ObjectId(targetUserId) },
                updatedAt: new Date()
            });
        }

        return await ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }

    /**
     * Remove member from group - Only Admins or self leave
     */
    async removeMember(conversationId: string, targetUserId: string, userId: string) {
        const conv = await ChatConversation.findOne({
            _id: conversationId,
            type: "group",
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!conv) {
            throw new AppError("Group not found", 404);
        }

        const isAdmin = conv.admins?.some(adminId => adminId.toString() === userId) || conv.createdBy.toString() === userId;

        // Can remove if self leaving, or if current user is admin
        if (targetUserId !== userId && !isAdmin) {
            throw new AppError("You do not have permission to remove members", 403);
        }

        // Creator cannot be removed (unless deleting group, handled elsewhere)
        if (conv.createdBy.toString() === targetUserId && targetUserId !== userId) {
            throw new AppError("Cannot remove the group creator", 400);
        }

        await ChatConversation.findByIdAndUpdate(conversationId, {
            $pull: { 
                participants: new mongoose.Types.ObjectId(targetUserId),
                admins: new mongoose.Types.ObjectId(targetUserId)
            },
            updatedAt: new Date()
        });

        return await ChatConversation.findById(conversationId)
            .populate("participants", "firstName lastName email avatar role isActive")
            .lean();
    }

    /**
     * Recall (unsend) a message - only sender, within 30 minutes
     */
    async recallMessage(messageId: string, userId: string) {
        logger.info(`[ChatService] Recalling message ${messageId} by user ${userId}`);
        const message = await ChatMessage.findById(messageId);

        if (!message) {
            logger.warn(`[ChatService] Recall failed: Message ${messageId} not found`);
            throw new AppError("Message not found", 404);
        }

        // Only sender can recall
        if (message.senderId.toString() !== userId) {
            logger.warn(`[ChatService] Recall failed: User ${userId} is not the sender of message ${messageId}`);
            throw new AppError("You can only recall your own messages", 403);
        }

        // Time limit (24 hours)
        const LIMIT_MS = 24 * 60 * 60 * 1000;
        const ageMsg = Date.now() - new Date(message.createdAt).getTime();
        if (ageMsg > LIMIT_MS) {
            logger.warn(`[ChatService] Recall failed: Message ${messageId} is too old (${Math.round(ageMsg/1000/60/60)} hours)`);
            throw new AppError("Tin nhắn quá cũ để thu hồi (tối đa 24 giờ)", 400);
        }

        message.recalled = true;
        message.text = ""; // Use empty string instead of undefined for better JSON compatibility
        message.images = [];
        message.file = undefined;
        await message.save();

        logger.info(`[ChatService] Message ${messageId} recalled successfully`);
        return message;
    }
}

export const chatService = new ChatService();

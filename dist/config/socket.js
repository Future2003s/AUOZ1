"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
exports.getSocketIO = getSocketIO;
exports.getOnlineUserIds = getOnlineUserIds;
exports.emitOrderNotification = emitOrderNotification;
exports.emitChatMessage = emitChatMessage;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const eventService_1 = require("../services/eventService");
const chatService_1 = require("../services/chatService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const ChatConversation_1 = require("../models/ChatConversation");
let io = null;
// Track online users: userId -> Set<socketId>
const onlineUsers = new Map();
/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(httpServer) {
    // Default CORS origins - include both FeLLC (3000) and OrderFe (3001)
    const defaultOrigins = [
        "http://localhost:3000", // FeLLC - Employee dashboard
        "http://localhost:3001",
        "https://lalalycheee.vn",
        "https://file.lalalycheee.vn",
        "https://chat.lalalycheee.vn" // OrderFe - Customer order page
    ];
    const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
        : defaultOrigins;
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: corsOrigins,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    });
    io.on("connection", (socket) => {
        logger_1.logger.info(`Socket.IO client connected: ${socket.id}`);
        // ─── Auth & User Identity ──────────────────────────────────────────
        let currentUserId = null;
        socket.on("auth:identify", (data) => {
            // Try to identify user by token or direct userId
            if (data.token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(data.token, config_1.config.jwt.secret);
                    currentUserId = decoded.id;
                }
                catch {
                    currentUserId = data.userId || null;
                }
            }
            else if (data.userId) {
                currentUserId = data.userId;
            }
            if (currentUserId) {
                // Join user's personal room for notifications
                socket.join(`user:${currentUserId}`);
                logger_1.logger.info(`Socket ${socket.id} joined personal room user:${currentUserId}`);
                // Track online status
                if (!onlineUsers.has(currentUserId)) {
                    onlineUsers.set(currentUserId, new Set());
                }
                onlineUsers.get(currentUserId).add(socket.id);
                // Broadcast online status
                io?.emit("user:online", {
                    userId: currentUserId,
                    status: "online"
                });
                logger_1.logger.info(`User ${currentUserId} identified on socket ${socket.id}`);
            }
        });
        // ─── Chat Events ───────────────────────────────────────────────────
        // Join a conversation room
        socket.on("chat:join", (conversationId) => {
            socket.join(`conv:${conversationId}`);
            logger_1.logger.debug(`Socket ${socket.id} joined conv:${conversationId}`);
        });
        // Leave a conversation room
        socket.on("chat:leave", (conversationId) => {
            socket.leave(`conv:${conversationId}`);
            logger_1.logger.debug(`Socket ${socket.id} left conv:${conversationId}`);
        });
        // Send a message via socket (alternative to HTTP)
        socket.on("chat:sendMessage", async (data) => {
            if (!currentUserId) {
                socket.emit("chat:error", { message: "Not authenticated" });
                return;
            }
            try {
                const message = await chatService_1.chatService.sendMessage(data.conversationId, currentUserId, {
                    text: data.text,
                    images: data.images,
                    file: data.file,
                    replyTo: data.replyTo
                });
                await emitChatMessage(data.conversationId, message, currentUserId);
            }
            catch (error) {
                socket.emit("chat:error", { message: error.message });
            }
        });
        // Typing indicator
        socket.on("chat:typing", (data) => {
            if (!currentUserId)
                return;
            socket.to(`conv:${data.conversationId}`).emit("chat:typing", {
                userId: currentUserId,
                conversationId: data.conversationId,
                isTyping: data.isTyping
            });
        });
        // Mark as read
        socket.on("chat:markRead", async (conversationId) => {
            if (!currentUserId)
                return;
            try {
                await chatService_1.chatService.markAsRead(conversationId, currentUserId);
                io?.to(`conv:${conversationId}`).emit("chat:read", {
                    conversationId,
                    userId: currentUserId
                });
            }
            catch (error) {
                logger_1.logger.error("Error marking as read:", error);
            }
        });
        // ─── Order Events (existing) ───────────────────────────────────────
        // Join employee room for order notifications
        socket.on("join:employee", () => {
            socket.join("employees");
            logger_1.logger.info(`Socket ${socket.id} joined employees room`);
        });
        // Leave employee room
        socket.on("leave:employee", () => {
            socket.leave("employees");
            logger_1.logger.info(`Socket ${socket.id} left employees room`);
        });
        // ─── Disconnect ────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            // Remove from online tracking
            if (currentUserId) {
                const userSockets = onlineUsers.get(currentUserId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        onlineUsers.delete(currentUserId);
                        // Broadcast offline
                        io?.emit("user:online", {
                            userId: currentUserId,
                            status: "offline"
                        });
                    }
                }
            }
            logger_1.logger.info(`Socket.IO client disconnected: ${socket.id}`);
        });
        socket.on("error", (error) => {
            logger_1.logger.error(`Socket.IO error for ${socket.id}:`, error);
        });
    });
    // Listen to order events from eventService
    eventService_1.eventService.on("order:created", (event) => {
        if (io) {
            // Emit to all employees
            io.to("employees").emit("order:new", {
                orderId: event.orderId,
                orderNumber: event.metadata?.orderNumber,
                total: event.metadata?.total || 0,
                itemCount: event.metadata?.itemCount || 0,
                userId: event.userId || "guest",
                timestamp: event.timestamp instanceof Date
                    ? event.timestamp.toISOString()
                    : new Date(event.timestamp).toISOString(),
                isGuest: event.metadata?.isGuest || false
            });
            logger_1.logger.info(`Emitted new order notification: ${event.orderId}`);
        }
    });
    logger_1.logger.info("✅ Socket.IO server initialized (with Chat support)");
    return io;
}
/**
 * Get Socket.IO server instance
 */
function getSocketIO() {
    return io;
}
/**
 * Get online users list
 */
function getOnlineUserIds() {
    return Array.from(onlineUsers.keys());
}
/**
 * Emit order notification manually (for testing or other use cases)
 */
function emitOrderNotification(orderData) {
    if (io) {
        io.to("employees").emit("order:new", {
            ...orderData,
            timestamp: orderData.timestamp.toISOString()
        });
        logger_1.logger.info(`Manually emitted order notification: ${orderData.orderId}`);
    }
    else {
        logger_1.logger.warn("Socket.IO server not initialized, cannot emit notification");
    }
}
/**
 * Emit chat message to conversation room and participants' personal rooms
 */
async function emitChatMessage(conversationId, message, senderId) {
    if (!io) {
        logger_1.logger.warn("Socket.IO server not initialized, cannot emit chat message");
        return;
    }
    // Broadcast to conversation room
    logger_1.logger.info(`[Socket] Broadcasting message to conv:${conversationId}`);
    io.to(`conv:${conversationId}`).emit("chat:message", message);
    // Also notify participants who are not in the room
    try {
        const conv = await ChatConversation_1.ChatConversation.findById(conversationId).lean();
        if (conv && conv.participants) {
            conv.participants.forEach((pid) => {
                const pidStr = pid.toString();
                if (pidStr !== senderId) {
                    logger_1.logger.info(`[Socket] Broadcasting newMessage to user:${pidStr}`);
                    // Only send 'chat:newMessage' to sockets that are NOT already in the conversation room
                    io.to(`user:${pidStr}`).except(`conv:${conversationId}`).emit("chat:newMessage", {
                        conversationId,
                        message
                    });
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Error emitting chat message to participants:", error);
    }
}

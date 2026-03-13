import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { eventService } from "../services/eventService";
import { OrderEvent } from "../types";
import { chatService } from "../services/chatService";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { ChatConversation } from "../models/ChatConversation";

let io: SocketIOServer | null = null;

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
    // Default CORS origins - include both FeLLC (3000) and OrderFe (3001)
    const defaultOrigins = [
        "http://localhost:3000",  // FeLLC - Employee dashboard
        "http://localhost:3001",
        "https://lalalycheee.vn",
        "https://file.lalalycheee.vn",
        "https://chat.lalalycheee.vn" // OrderFe - Customer order page
    ];

    const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
        : defaultOrigins;

    io = new SocketIOServer(httpServer, {
        cors: {
            origin: corsOrigins,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    });

    io.on("connection", (socket: Socket) => {
        logger.info(`Socket.IO client connected: ${socket.id}`);

        // ─── Auth & User Identity ──────────────────────────────────────────
        let currentUserId: string | null = null;

        socket.on("auth:identify", (data: { token?: string; userId?: string }) => {
            // Try to identify user by token or direct userId
            if (data.token) {
                try {
                    const decoded = jwt.verify(data.token, config.jwt.secret) as any;
                    currentUserId = decoded.id;
                } catch {
                    currentUserId = data.userId || null;
                }
            } else if (data.userId) {
                currentUserId = data.userId;
            }

            if (currentUserId) {
                // Join user's personal room for notifications
                socket.join(`user:${currentUserId}`);
                logger.info(`Socket ${socket.id} joined personal room user:${currentUserId}`);

                // Track online status
                if (!onlineUsers.has(currentUserId)) {
                    onlineUsers.set(currentUserId, new Set());
                }
                onlineUsers.get(currentUserId)!.add(socket.id);

                // Broadcast online status
                io?.emit("user:online", {
                    userId: currentUserId,
                    status: "online"
                });

                logger.info(`User ${currentUserId} identified on socket ${socket.id}`);
            }
        });

        // ─── Chat Events ───────────────────────────────────────────────────

        // Join a conversation room
        socket.on("chat:join", (conversationId: string) => {
            socket.join(`conv:${conversationId}`);
            logger.debug(`Socket ${socket.id} joined conv:${conversationId}`);
        });

        // Leave a conversation room
        socket.on("chat:leave", (conversationId: string) => {
            socket.leave(`conv:${conversationId}`);
            logger.debug(`Socket ${socket.id} left conv:${conversationId}`);
        });

        // Send a message via socket (alternative to HTTP)
        socket.on("chat:sendMessage", async (data: {
            conversationId: string;
            text?: string;
            images?: string[];
            file?: { name: string; size: number; url?: string };
            replyTo?: any;
        }) => {
            if (!currentUserId) {
                socket.emit("chat:error", { message: "Not authenticated" });
                return;
            }

            try {
                const message = await chatService.sendMessage(
                    data.conversationId,
                    currentUserId,
                    {
                        text: data.text,
                        images: data.images,
                        file: data.file,
                        replyTo: data.replyTo
                    }
                );

                await emitChatMessage(data.conversationId, message, currentUserId);
            } catch (error: any) {
                socket.emit("chat:error", { message: error.message });
            }
        });

        // Typing indicator
        socket.on("chat:typing", (data: { conversationId: string; isTyping: boolean }) => {
            if (!currentUserId) return;
            socket.to(`conv:${data.conversationId}`).emit("chat:typing", {
                userId: currentUserId,
                conversationId: data.conversationId,
                isTyping: data.isTyping
            });
        });

        // Mark as read
        socket.on("chat:markRead", async (conversationId: string) => {
            if (!currentUserId) return;
            try {
                await chatService.markAsRead(conversationId, currentUserId);
                io?.to(`conv:${conversationId}`).emit("chat:read", {
                    conversationId,
                    userId: currentUserId
                });
            } catch (error: any) {
                logger.error("Error marking as read:", error);
            }
        });

        // ─── Order Events (existing) ───────────────────────────────────────

        // Join employee room for order notifications
        socket.on("join:employee", () => {
            socket.join("employees");
            logger.info(`Socket ${socket.id} joined employees room`);
        });

        // Leave employee room
        socket.on("leave:employee", () => {
            socket.leave("employees");
            logger.info(`Socket ${socket.id} left employees room`);
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
            logger.info(`Socket.IO client disconnected: ${socket.id}`);
        });

        socket.on("error", (error) => {
            logger.error(`Socket.IO error for ${socket.id}:`, error);
        });
    });

    // Listen to order events from eventService
    eventService.on("order:created", (event: OrderEvent) => {
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
            logger.info(`Emitted new order notification: ${event.orderId}`);
        }
    });

    logger.info("✅ Socket.IO server initialized (with Chat support)");
    return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketIO(): SocketIOServer | null {
    return io;
}

/**
 * Get online users list
 */
export function getOnlineUserIds(): string[] {
    return Array.from(onlineUsers.keys());
}

/**
 * Emit order notification manually (for testing or other use cases)
 */
export function emitOrderNotification(orderData: {
    orderId: string;
    orderNumber?: string;
    total: number;
    itemCount: number;
    userId: string;
    timestamp: Date;
    isGuest?: boolean;
}): void {
    if (io) {
        io.to("employees").emit("order:new", {
            ...orderData,
            timestamp: orderData.timestamp.toISOString()
        });
        logger.info(`Manually emitted order notification: ${orderData.orderId}`);
    } else {
        logger.warn("Socket.IO server not initialized, cannot emit notification");
    }
}

/**
 * Emit chat message to conversation room and participants' personal rooms
 */
export async function emitChatMessage(conversationId: string, message: any, senderId: string): Promise<void> {
    if (!io) {
        logger.warn("Socket.IO server not initialized, cannot emit chat message");
        return;
    }

    // Broadcast to conversation room
    logger.info(`[Socket] Broadcasting message to conv:${conversationId}`);
    io.to(`conv:${conversationId}`).emit("chat:message", message);

    // Also notify participants who are not in the room
    try {
        const conv = await ChatConversation.findById(conversationId).lean();
        if (conv && conv.participants) {
            conv.participants.forEach((pid: any) => {
                const pidStr = pid.toString();
                if (pidStr !== senderId) {
                    logger.info(`[Socket] Broadcasting newMessage to user:${pidStr}`);
                    // Only send 'chat:newMessage' to sockets that are NOT already in the conversation room
                    io!.to(`user:${pidStr}`).except(`conv:${conversationId}`).emit("chat:newMessage", {
                        conversationId,
                        message
                    });
                }
            });
        }
    } catch (error) {
        logger.error("Error emitting chat message to participants:", error);
    }
}


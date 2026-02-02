import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { eventService } from "../services/eventService";
import { OrderEvent } from "../types";

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
    // Default CORS origins - include both FeLLC (3000) and OrderFe (3001)
    const defaultOrigins = [
        "http://localhost:3000",  // FeLLC - Employee dashboard
        "http://localhost:3001"   // OrderFe - Customer order page
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

        socket.on("disconnect", () => {
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

    logger.info("✅ Socket.IO server initialized");
    return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketIO(): SocketIOServer | null {
    return io;
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


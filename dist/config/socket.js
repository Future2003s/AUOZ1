"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
exports.getSocketIO = getSocketIO;
exports.emitOrderNotification = emitOrderNotification;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const eventService_1 = require("../services/eventService");
let io = null;
/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(httpServer) {
    // Default CORS origins - include both FeLLC (3000) and OrderFe (3001)
    const defaultOrigins = [
        "http://localhost:3000", // FeLLC - Employee dashboard
        "http://localhost:3001" // OrderFe - Customer order page
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
        socket.on("disconnect", () => {
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
    logger_1.logger.info("✅ Socket.IO server initialized");
    return io;
}
/**
 * Get Socket.IO server instance
 */
function getSocketIO() {
    return io;
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const logger_1 = require("../utils/logger");
const connectDatabase = async () => {
    try {
        if (config_1.config.database.type === "mongodb") {
            await connectMongoDB();
        }
        else {
            throw new Error(`Database type ${config_1.config.database.type} is not supported yet`);
        }
    }
    catch (error) {
        logger_1.logger.error("Database connection failed:", error);
        // In development, continue without database for testing
        if (config_1.config.nodeEnv === "development") {
            logger_1.logger.warn("⚠️  Running in development mode without database connection");
            return;
        }
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const connectMongoDB = async () => {
    try {
        // Set mongoose options for better performance
        mongoose_1.default.set("strictQuery", false);
        mongoose_1.default.set("autoIndex", config_1.config.nodeEnv === "development");
        mongoose_1.default.set("autoCreate", config_1.config.nodeEnv === "development");
        // Optimize for production
        if (config_1.config.nodeEnv === "production") {
            mongoose_1.default.set("debug", false);
        }
        const connection = await mongoose_1.default.connect(config_1.config.database.uri, config_1.config.database.options);
        logger_1.logger.info(`✅ MongoDB connected: ${connection.connection.host}`);
        logger_1.logger.info(`📊 Connection pool - Max: ${config_1.config.database.options.maxPoolSize}, Min: ${config_1.config.database.options.minPoolSize}`);
        logger_1.logger.info(`🗜️ Compression enabled: ${config_1.config.database.options.compressors?.join(", ")}`);
        // Performance monitoring
        let queryCount = 0;
        let slowQueryCount = 0;
        const slowQueryThreshold = 100; // ms
        // Monitor slow queries in development
        if (config_1.config.nodeEnv === "development") {
            mongoose_1.default.set("debug", (collectionName, method, query, doc, options) => {
                const start = Date.now();
                return function (error, result) {
                    const duration = Date.now() - start;
                    queryCount++;
                    if (duration > slowQueryThreshold) {
                        slowQueryCount++;
                        logger_1.logger.warn(`🐌 Slow query detected: ${collectionName}.${method} took ${duration}ms`);
                        logger_1.logger.debug("Query details:", { query, options });
                    }
                };
            });
        }
        // Connection monitoring (simplified for compatibility)
        setInterval(() => {
            if (config_1.config.nodeEnv === "development") {
                const memUsage = process.memoryUsage();
                logger_1.logger.debug("📊 Server stats:", {
                    memoryUsage: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    queryCount,
                    slowQueryCount
                });
            }
        }, 60000); // Log every minute in development
        // Handle connection events
        mongoose_1.default.connection.on("error", (error) => {
            logger_1.logger.error("MongoDB connection error:", error);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            logger_1.logger.warn("MongoDB disconnected");
        });
        mongoose_1.default.connection.on("reconnected", () => {
            logger_1.logger.info("MongoDB reconnected");
        });
        mongoose_1.default.connection.on("close", () => {
            logger_1.logger.info("MongoDB connection closed");
        });
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`${signal} received. Closing MongoDB connection...`);
            try {
                await mongoose_1.default.connection.close();
                logger_1.logger.info("MongoDB connection closed through app termination");
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error("Error during graceful shutdown:", error);
                process.exit(1);
            }
        };
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    }
    catch (error) {
        logger_1.logger.error("MongoDB connection error:", error);
        throw error;
    }
};
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.connection.close();
        logger_1.logger.info("Database disconnected successfully");
    }
    catch (error) {
        logger_1.logger.error("Error disconnecting from database:", error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;

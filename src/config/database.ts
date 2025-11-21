import mongoose from "mongoose";
import { config } from "./config";
import { logger } from "../utils/logger";

export const connectDatabase = async (): Promise<void> => {
    try {
        if (config.database.type === "mongodb") {
            await connectMongoDB();
        } else {
            throw new Error(`Database type ${config.database.type} is not supported yet`);
        }
    } catch (error) {
        logger.error("Database connection failed:", error);

        // In development, continue without database for testing
        if (config.nodeEnv === "development") {
            logger.warn("⚠️  Running in development mode without database connection");
            return;
        }

        throw error;
    }
};

const connectMongoDB = async (): Promise<void> => {
    try {
        // Set mongoose options for better performance
        mongoose.set("strictQuery", false);
        mongoose.set("autoIndex", config.nodeEnv === "development");
        mongoose.set("autoCreate", config.nodeEnv === "development");

        // Optimize for production
        if (config.nodeEnv === "production") {
            mongoose.set("debug", false);
        }

        const connection = await mongoose.connect(config.database.uri, config.database.options);

        logger.info(`✅ MongoDB connected: ${connection.connection.host}`);
        logger.info(
            `📊 Connection pool - Max: ${config.database.options.maxPoolSize}, Min: ${config.database.options.minPoolSize}`
        );
        logger.info(`🗜️ Compression enabled: ${config.database.options.compressors?.join(", ")}`);

        // Performance monitoring
        let queryCount = 0;
        let slowQueryCount = 0;
        const slowQueryThreshold = 100; // ms

        // Monitor slow queries in development
        if (config.nodeEnv === "development") {
            mongoose.set("debug", (collectionName: string, method: string, query: any, doc: any, options: any) => {
                const start = Date.now();
                return function (this: any, error: any, result: any) {
                    const duration = Date.now() - start;
                    queryCount++;

                    if (duration > slowQueryThreshold) {
                        slowQueryCount++;
                        logger.warn(`🐌 Slow query detected: ${collectionName}.${method} took ${duration}ms`);
                        logger.debug("Query details:", { query, options });
                    }
                };
            });
        }

        // Connection monitoring (simplified for compatibility)
        setInterval(() => {
            if (config.nodeEnv === "development") {
                const memUsage = process.memoryUsage();
                logger.debug("📊 Server stats:", {
                    memoryUsage: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    queryCount,
                    slowQueryCount
                });
            }
        }, 60000); // Log every minute in development

        // Handle connection events
        mongoose.connection.on("error", (error) => {
            logger.error("MongoDB connection error:", error);
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            logger.info("MongoDB reconnected");
        });

        mongoose.connection.on("close", () => {
            logger.info("MongoDB connection closed");
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received. Closing MongoDB connection...`);
            try {
                await mongoose.connection.close();
                logger.info("MongoDB connection closed through app termination");
                process.exit(0);
            } catch (error) {
                logger.error("Error during graceful shutdown:", error);
                process.exit(1);
            }
        };

        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    } catch (error) {
        logger.error("MongoDB connection error:", error);
        throw error;
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        logger.info("Database disconnected successfully");
    } catch (error) {
        logger.error("Error disconnecting from database:", error);
        throw error;
    }
};

import { createClient, RedisClientType } from "redis";
import { logger } from "../utils/logger";
import { config } from "./config";

/**
 * High-performance Redis configuration for caching using redis client
 */

interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
    compress?: boolean;
}

class RedisCache {
    private client: RedisClientType;
    private isConnected: boolean = false;
    private defaultTTL: number = 3600; // 1 hour default

    constructor() {
        // Redis Cloud connection without TLS (based on user's working config)
        console.log("Connecting to Redis Cloud:", `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

        this.client = createClient({
            username: "default",
            password: "26OWIUJBCn1ZXZiuOMWqL7yRvGtDiovy",
            database: parseInt(process.env.REDIS_DB || "0", 10),
	    socket: {
                host: "redis-11985.c1.ap-southeast-1-1.ec2.cloud.redislabs.com",
                port: 11985,
                connectTimeout: 15000,
                keepAlive: true
            }
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on("connect", () => {
            logger.info("🔗 Redis connecting...");
        });

        this.client.on("ready", () => {
            this.isConnected = true;
            logger.info("✅ Redis connected and ready");
        });

        this.client.on("error", (error: any) => {
            this.isConnected = false;
            logger.error("❌ Redis connection error:", error);
        });

        this.client.on("reconnecting", () => {
            logger.info("🔄 Redis reconnecting...");
        });

        this.client.on("end", () => {
            this.isConnected = false;
            logger.info("🔚 Redis connection ended");
        });
    }

    async connect(): Promise<void> {
        try {
            if (!this.client.isOpen) {
                await this.client.connect();
                this.isConnected = true;

                // Test connection
                await this.client.ping();
                logger.info("🏓 Redis ping successful");

                // Set up performance monitoring
                this.setupPerformanceMonitoring();
            }
        } catch (error) {
            logger.error("Failed to connect to Redis:", error);
            throw error;
        }
    }

    private setupPerformanceMonitoring(): void {
        if (config.nodeEnv === "development") {
            setInterval(async () => {
                try {
                    const info = await this.client.info("memory");
                    const memoryUsage = this.parseRedisInfo(info);
                    logger.debug("📊 Redis memory usage:", memoryUsage);
                } catch (error) {
                    logger.warn("Could not get Redis stats:", error);
                }
            }, 60000); // Every minute in development
        }
    }

    private parseRedisInfo(info: string): any {
        const lines = info.split("\r\n");
        const result: any = {};

        for (const line of lines) {
            if (line.includes(":")) {
                const [key, value] = line.split(":");
                result[key] = value;
            }
        }

        return {
            used_memory_human: result.used_memory_human,
            used_memory_peak_human: result.used_memory_peak_human,
            connected_clients: result.connected_clients
        };
    }

    async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
        if (!this.isConnected) {
            logger.warn("Redis not connected, skipping cache get");
            return null;
        }

        try {
            const fullKey = this.buildKey(key, options.prefix);
            const value = await this.client.get(fullKey);

            if (!value) {
                return null;
            }

            return JSON.parse(value) as T;
        } catch (error) {
            logger.error("Redis get error:", error);
            return null;
        }
    }

    async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
        if (!this.isConnected) {
            logger.warn("Redis not connected, skipping cache set");
            return false;
        }

        try {
            const fullKey = this.buildKey(key, options.prefix);
            const serializedValue = JSON.stringify(value);
            const ttl = options.ttl || this.defaultTTL;

            await this.client.setEx(fullKey, ttl, serializedValue);
            return true;
        } catch (error) {
            logger.error("Redis set error:", error);
            return false;
        }
    }

    async del(key: string, prefix?: string): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.client.del(fullKey);
            return result > 0;
        } catch (error) {
            logger.error("Redis delete error:", error);
            return false;
        }
    }

    async exists(key: string, prefix?: string): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.client.exists(fullKey);
            return result === 1;
        } catch (error) {
            logger.error("Redis exists error:", error);
            return false;
        }
    }

    async flush(pattern?: string): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        try {
            if (pattern) {
                const basePrefix = process.env.REDIS_KEY_PREFIX || "shopdev";
                const normalizedPattern = pattern.startsWith(`${basePrefix}:`)
                    ? pattern
                    : `${basePrefix}:${pattern}`;
                const keys = await this.client.keys(normalizedPattern);
                if (keys.length > 0) {
                    await this.client.del(keys);
                }
            } else {
                await this.client.flushDb();
            }
            return true;
        } catch (error) {
            logger.error("Redis flush error:", error);
            return false;
        }
    }

    async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
        if (!this.isConnected || keys.length === 0) {
            return keys.map(() => null);
        }

        try {
            const fullKeys = keys.map((key) => this.buildKey(key, prefix));
            const values = await this.client.mGet(fullKeys);

            return values.map((value: any) => {
                if (!value) return null;
                try {
                    return JSON.parse(value) as T;
                } catch {
                    return null;
                }
            });
        } catch (error) {
            logger.error("Redis mget error:", error);
            return keys.map(() => null);
        }
    }

    async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>, prefix?: string): Promise<boolean> {
        if (!this.isConnected || keyValuePairs.length === 0) {
            return false;
        }

        try {
            const multi = this.client.multi();

            for (const pair of keyValuePairs) {
                const fullKey = this.buildKey(pair.key, prefix);
                const serializedValue = JSON.stringify(pair.value);
                const ttl = pair.ttl || this.defaultTTL;

                multi.setEx(fullKey, ttl, serializedValue);
            }

            await multi.exec();
            return true;
        } catch (error) {
            logger.error("Redis mset error:", error);
            return false;
        }
    }

    private buildKey(key: string, prefix?: string): string {
        const basePrefix = process.env.REDIS_KEY_PREFIX || "shopdev";
        const fullPrefix = prefix ? `${basePrefix}:${prefix}` : basePrefix;
        return `${fullPrefix}:${key}`;
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            logger.info("Redis connection closed gracefully");
        } catch (error) {
            logger.error("Error closing Redis connection:", error);
        }
    }

    getClient(): RedisClientType {
        return this.client;
    }

    isReady(): boolean {
        return this.isConnected && this.client.isOpen;
    }
}

// Create singleton instance
export const redisCache = new RedisCache();

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
    PRODUCTS: "products",
    CATEGORIES: "categories",
    BRANDS: "brands",
    USERS: "users",
    CARTS: "carts",
    REVIEWS: "reviews",
    SEARCH: "search",
    SESSIONS: "sessions"
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
} as const;

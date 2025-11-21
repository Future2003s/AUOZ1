"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.CACHE_PREFIXES = exports.redisCache = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
const config_1 = require("./config");
class RedisCache {
    client;
    isConnected = false;
    defaultTTL = 3600; // 1 hour default
    constructor() {
        // Redis Cloud connection without TLS (based on user's working config)
        console.log("Connecting to Redis Cloud:", `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
        this.client = (0, redis_1.createClient)({
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
    setupEventHandlers() {
        this.client.on("connect", () => {
            logger_1.logger.info("🔗 Redis connecting...");
        });
        this.client.on("ready", () => {
            this.isConnected = true;
            logger_1.logger.info("✅ Redis connected and ready");
        });
        this.client.on("error", (error) => {
            this.isConnected = false;
            logger_1.logger.error("❌ Redis connection error:", error);
        });
        this.client.on("reconnecting", () => {
            logger_1.logger.info("🔄 Redis reconnecting...");
        });
        this.client.on("end", () => {
            this.isConnected = false;
            logger_1.logger.info("🔚 Redis connection ended");
        });
    }
    async connect() {
        try {
            if (!this.client.isOpen) {
                await this.client.connect();
                this.isConnected = true;
                // Test connection
                await this.client.ping();
                logger_1.logger.info("🏓 Redis ping successful");
                // Set up performance monitoring
                this.setupPerformanceMonitoring();
            }
        }
        catch (error) {
            logger_1.logger.error("Failed to connect to Redis:", error);
            throw error;
        }
    }
    setupPerformanceMonitoring() {
        if (config_1.config.nodeEnv === "development") {
            setInterval(async () => {
                try {
                    const info = await this.client.info("memory");
                    const memoryUsage = this.parseRedisInfo(info);
                    logger_1.logger.debug("📊 Redis memory usage:", memoryUsage);
                }
                catch (error) {
                    logger_1.logger.warn("Could not get Redis stats:", error);
                }
            }, 60000); // Every minute in development
        }
    }
    parseRedisInfo(info) {
        const lines = info.split("\r\n");
        const result = {};
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
    async get(key, options = {}) {
        if (!this.isConnected) {
            logger_1.logger.warn("Redis not connected, skipping cache get");
            return null;
        }
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const value = await this.client.get(fullKey);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            logger_1.logger.error("Redis get error:", error);
            return null;
        }
    }
    async set(key, value, options = {}) {
        if (!this.isConnected) {
            logger_1.logger.warn("Redis not connected, skipping cache set");
            return false;
        }
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const serializedValue = JSON.stringify(value);
            const ttl = options.ttl || this.defaultTTL;
            await this.client.setEx(fullKey, ttl, serializedValue);
            return true;
        }
        catch (error) {
            logger_1.logger.error("Redis set error:", error);
            return false;
        }
    }
    async del(key, prefix) {
        if (!this.isConnected) {
            return false;
        }
        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.client.del(fullKey);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error("Redis delete error:", error);
            return false;
        }
    }
    async exists(key, prefix) {
        if (!this.isConnected) {
            return false;
        }
        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.client.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error("Redis exists error:", error);
            return false;
        }
    }
    async flush(pattern) {
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
            }
            else {
                await this.client.flushDb();
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error("Redis flush error:", error);
            return false;
        }
    }
    async mget(keys, prefix) {
        if (!this.isConnected || keys.length === 0) {
            return keys.map(() => null);
        }
        try {
            const fullKeys = keys.map((key) => this.buildKey(key, prefix));
            const values = await this.client.mGet(fullKeys);
            return values.map((value) => {
                if (!value)
                    return null;
                try {
                    return JSON.parse(value);
                }
                catch {
                    return null;
                }
            });
        }
        catch (error) {
            logger_1.logger.error("Redis mget error:", error);
            return keys.map(() => null);
        }
    }
    async mset(keyValuePairs, prefix) {
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
        }
        catch (error) {
            logger_1.logger.error("Redis mset error:", error);
            return false;
        }
    }
    buildKey(key, prefix) {
        const basePrefix = process.env.REDIS_KEY_PREFIX || "shopdev";
        const fullPrefix = prefix ? `${basePrefix}:${prefix}` : basePrefix;
        return `${fullPrefix}:${key}`;
    }
    async disconnect() {
        try {
            await this.client.quit();
            logger_1.logger.info("Redis connection closed gracefully");
        }
        catch (error) {
            logger_1.logger.error("Error closing Redis connection:", error);
        }
    }
    getClient() {
        return this.client;
    }
    isReady() {
        return this.isConnected && this.client.isOpen;
    }
}
// Create singleton instance
exports.redisCache = new RedisCache();
// Cache key prefixes for different data types
exports.CACHE_PREFIXES = {
    PRODUCTS: "products",
    CATEGORIES: "categories",
    BRANDS: "brands",
    USERS: "users",
    CARTS: "carts",
    REVIEWS: "reviews",
    SEARCH: "search",
    SESSIONS: "sessions"
};
// Cache TTL constants (in seconds)
exports.CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
};

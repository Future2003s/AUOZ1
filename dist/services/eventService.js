"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const cacheService_1 = require("./cacheService");
const uuid_1 = require("uuid");
/**
 * Advanced Event Service for ShopDev
 * High-performance event handling with caching and analytics
 */
class EventService extends events_1.EventEmitter {
    CACHE_PREFIX = "events";
    ANALYTICS_PREFIX = "analytics";
    MAX_LISTENERS = 100;
    eventQueue = [];
    processingQueue = false;
    constructor() {
        super();
        this.setMaxListeners(this.MAX_LISTENERS);
        this.setupEventHandlers();
        this.startQueueProcessor();
    }
    /**
     * Emit a product event
     */
    async emitProductEvent(data) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: "product",
            timestamp: new Date(),
            ...data
        };
        await this.processEvent(event);
        this.emit("product:" + data.action, event);
        this.emit("product", event);
    }
    /**
     * Emit a user event
     */
    async emitUserEvent(data) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: "user",
            timestamp: new Date(),
            ...data
        };
        await this.processEvent(event);
        this.emit("user:" + data.action, event);
        this.emit("user", event);
    }
    /**
     * Emit an order event
     */
    async emitOrderEvent(data) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: "order",
            timestamp: new Date(),
            ...data
        };
        await this.processEvent(event);
        this.emit("order:" + data.action, event);
        this.emit("order", event);
    }
    /**
     * Process event with caching and analytics
     */
    async processEvent(event) {
        try {
            // Add to queue for batch processing
            this.eventQueue.push(event);
            // Cache recent events for analytics
            await this.cacheEvent(event);
            // Update real-time analytics
            await this.updateAnalytics(event);
            logger_1.logger.debug(`Event processed: ${event.type}:${event.id}`);
        }
        catch (error) {
            logger_1.logger.error("Error processing event:", error);
        }
    }
    /**
     * Cache event for quick retrieval
     */
    async cacheEvent(event) {
        try {
            const cacheKey = `recent:${event.type}:${event.userId || "anonymous"}`;
            // Get recent events for this user/type
            const recentEvents = (await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey)) || [];
            // Add new event and keep only last 50
            recentEvents.unshift(event);
            const trimmedEvents = recentEvents.slice(0, 50);
            // Cache for 1 hour
            await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, trimmedEvents);
        }
        catch (error) {
            logger_1.logger.error("Error caching event:", error);
        }
    }
    /**
     * Update real-time analytics
     */
    async updateAnalytics(event) {
        try {
            const today = new Date().toISOString().split("T")[0];
            const hour = new Date().getHours();
            // Daily analytics
            const dailyKey = `daily:${today}:${event.type}`;
            const dailyCount = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, dailyKey)) || 0;
            await cacheService_1.cacheService.set(this.ANALYTICS_PREFIX, dailyKey, dailyCount + 1);
            // Hourly analytics
            const hourlyKey = `hourly:${today}:${hour}:${event.type}`;
            const hourlyCount = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, hourlyKey)) || 0;
            await cacheService_1.cacheService.set(this.ANALYTICS_PREFIX, hourlyKey, hourlyCount + 1);
            // Product-specific analytics
            if (event.type === "product") {
                const productEvent = event;
                const productKey = `product:${productEvent.productId}:${productEvent.action}`;
                const productCount = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, productKey)) || 0;
                await cacheService_1.cacheService.set(this.ANALYTICS_PREFIX, productKey, productCount + 1);
            }
        }
        catch (error) {
            logger_1.logger.error("Error updating analytics:", error);
        }
    }
    /**
     * Get recent events for a user
     */
    async getRecentEvents(userId, type, limit = 20) {
        try {
            if (type) {
                const cacheKey = `recent:${type}:${userId}`;
                const events = (await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey)) || [];
                return events.slice(0, limit);
            }
            else {
                // Get events from all types
                const types = ["product", "user", "order"];
                const allEvents = [];
                for (const eventType of types) {
                    const cacheKey = `recent:${eventType}:${userId}`;
                    const events = (await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey)) || [];
                    allEvents.push(...events);
                }
                // Sort by timestamp and return limited results
                return allEvents
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, limit);
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting recent events:", error);
            return [];
        }
    }
    /**
     * Get analytics data
     */
    async getAnalytics(type, period = "daily") {
        try {
            const today = new Date().toISOString().split("T")[0];
            const analytics = {};
            if (period === "daily") {
                // Get last 7 days
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split("T")[0];
                    const key = `daily:${dateStr}:${type}`;
                    const count = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, key)) || 0;
                    analytics[dateStr] = count;
                }
            }
            else {
                // Get last 24 hours
                for (let i = 0; i < 24; i++) {
                    const hour = (new Date().getHours() - i + 24) % 24;
                    const key = `hourly:${today}:${hour}:${type}`;
                    const count = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, key)) || 0;
                    analytics[`${hour}:00`] = count;
                }
            }
            return analytics;
        }
        catch (error) {
            logger_1.logger.error("Error getting analytics:", error);
            return {};
        }
    }
    /**
     * Get product analytics
     */
    async getProductAnalytics(productId) {
        try {
            const actions = ["view", "add_to_cart", "remove_from_cart", "purchase"];
            const analytics = {};
            for (const action of actions) {
                const key = `product:${productId}:${action}`;
                const count = (await cacheService_1.cacheService.get(this.ANALYTICS_PREFIX, key)) || 0;
                analytics[action] = count;
            }
            return analytics;
        }
        catch (error) {
            logger_1.logger.error("Error getting product analytics:", error);
            return {};
        }
    }
    /**
     * Setup default event handlers
     */
    setupEventHandlers() {
        // Product events
        this.on("product:view", (event) => {
            logger_1.logger.debug(`Product viewed: ${event.productId} by user: ${event.userId}`);
        });
        this.on("product:add_to_cart", (event) => {
            logger_1.logger.debug(`Product added to cart: ${event.productId} by user: ${event.userId}`);
        });
        this.on("product:purchase", (event) => {
            logger_1.logger.info(`Product purchased: ${event.productId} by user: ${event.userId} for $${event.price}`);
        });
        // User events
        this.on("user:login", (event) => {
            logger_1.logger.debug(`User logged in: ${event.userId}`);
        });
        this.on("user:register", (event) => {
            logger_1.logger.info(`New user registered: ${event.userId}`);
        });
        // Order events
        this.on("order:created", (event) => {
            logger_1.logger.info(`Order created: ${event.orderId} by user: ${event.userId} value: $${event.orderValue}`);
        });
        this.on("order:shipped", (event) => {
            logger_1.logger.info(`Order shipped: ${event.orderId}`);
        });
        // Error handling
        this.on("error", (error) => {
            logger_1.logger.error("Event service error:", error);
        });
    }
    /**
     * Start queue processor for batch operations
     */
    startQueueProcessor() {
        setInterval(async () => {
            if (this.eventQueue.length > 0 && !this.processingQueue) {
                this.processingQueue = true;
                try {
                    const events = this.eventQueue.splice(0, 100); // Process in batches of 100
                    // Here you could send events to external analytics services
                    // like Google Analytics, Mixpanel, etc.
                    logger_1.logger.debug(`Processed ${events.length} events in batch`);
                }
                catch (error) {
                    logger_1.logger.error("Error processing event queue:", error);
                }
                finally {
                    this.processingQueue = false;
                }
            }
        }, 5000); // Process every 5 seconds
    }
    /**
     * Clear analytics data (admin function)
     */
    async clearAnalytics() {
        try {
            await cacheService_1.cacheService.invalidatePattern(this.ANALYTICS_PREFIX, "*");
            logger_1.logger.info("Analytics data cleared");
        }
        catch (error) {
            logger_1.logger.error("Error clearing analytics:", error);
            throw error;
        }
    }
}
exports.eventService = new EventService();

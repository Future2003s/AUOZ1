import { EventEmitter } from "events";
import { logger } from "../utils/logger";
import { cacheService } from "./cacheService";
import { BaseEvent, ProductEvent, UserEvent, OrderEvent } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * Advanced Event Service for ShopDev
 * High-performance event handling with caching and analytics
 */
class EventService extends EventEmitter {
    private readonly CACHE_PREFIX = "events";
    private readonly ANALYTICS_PREFIX = "analytics";
    private readonly MAX_LISTENERS = 100;
    private eventQueue: BaseEvent[] = [];
    private processingQueue = false;

    constructor() {
        super();
        this.setMaxListeners(this.MAX_LISTENERS);
        this.setupEventHandlers();
        this.startQueueProcessor();
    }

    /**
     * Emit a product event
     */
    async emitProductEvent(data: Omit<ProductEvent, "id" | "timestamp" | "type">): Promise<void> {
        const event: ProductEvent = {
            id: uuidv4(),
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
    async emitUserEvent(data: Omit<UserEvent, "id" | "timestamp" | "type">): Promise<void> {
        const event: UserEvent = {
            id: uuidv4(),
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
    async emitOrderEvent(data: Omit<OrderEvent, "id" | "timestamp" | "type">): Promise<void> {
        const event: OrderEvent = {
            id: uuidv4(),
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
    private async processEvent(event: BaseEvent): Promise<void> {
        try {
            // Add to queue for batch processing
            this.eventQueue.push(event);

            // Cache recent events for analytics
            await this.cacheEvent(event);

            // Update real-time analytics
            await this.updateAnalytics(event);

            logger.debug(`Event processed: ${event.type}:${event.id}`);
        } catch (error) {
            logger.error("Error processing event:", error);
        }
    }

    /**
     * Cache event for quick retrieval
     */
    private async cacheEvent(event: BaseEvent): Promise<void> {
        try {
            const cacheKey = `recent:${event.type}:${event.userId || "anonymous"}`;

            // Get recent events for this user/type
            const recentEvents = (await cacheService.get<BaseEvent[]>(this.CACHE_PREFIX, cacheKey)) || [];

            // Add new event and keep only last 50
            recentEvents.unshift(event);
            const trimmedEvents = recentEvents.slice(0, 50);

            // Cache for 1 hour
            await cacheService.set(this.CACHE_PREFIX, cacheKey, trimmedEvents);
        } catch (error) {
            logger.error("Error caching event:", error);
        }
    }

    /**
     * Update real-time analytics
     */
    private async updateAnalytics(event: BaseEvent): Promise<void> {
        try {
            const today = new Date().toISOString().split("T")[0];
            const hour = new Date().getHours();

            // Daily analytics
            const dailyKey = `daily:${today}:${event.type}`;
            const dailyCount = (await cacheService.get<number>(this.ANALYTICS_PREFIX, dailyKey)) || 0;
            await cacheService.set(this.ANALYTICS_PREFIX, dailyKey, dailyCount + 1);

            // Hourly analytics
            const hourlyKey = `hourly:${today}:${hour}:${event.type}`;
            const hourlyCount = (await cacheService.get<number>(this.ANALYTICS_PREFIX, hourlyKey)) || 0;
            await cacheService.set(this.ANALYTICS_PREFIX, hourlyKey, hourlyCount + 1);

            // Product-specific analytics
            if (event.type === "product") {
                const productEvent = event as ProductEvent;
                const productKey = `product:${productEvent.productId}:${productEvent.action}`;
                const productCount = (await cacheService.get<number>(this.ANALYTICS_PREFIX, productKey)) || 0;
                await cacheService.set(this.ANALYTICS_PREFIX, productKey, productCount + 1);
            }
        } catch (error) {
            logger.error("Error updating analytics:", error);
        }
    }

    /**
     * Get recent events for a user
     */
    async getRecentEvents(userId: string, type?: string, limit = 20): Promise<BaseEvent[]> {
        try {
            if (type) {
                const cacheKey = `recent:${type}:${userId}`;
                const events = (await cacheService.get<BaseEvent[]>(this.CACHE_PREFIX, cacheKey)) || [];
                return events.slice(0, limit);
            } else {
                // Get events from all types
                const types = ["product", "user", "order"];
                const allEvents: BaseEvent[] = [];

                for (const eventType of types) {
                    const cacheKey = `recent:${eventType}:${userId}`;
                    const events = (await cacheService.get<BaseEvent[]>(this.CACHE_PREFIX, cacheKey)) || [];
                    allEvents.push(...events);
                }

                // Sort by timestamp and return limited results
                return allEvents
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, limit);
            }
        } catch (error) {
            logger.error("Error getting recent events:", error);
            return [];
        }
    }

    /**
     * Get analytics data
     */
    async getAnalytics(type: string, period: "daily" | "hourly" = "daily"): Promise<Record<string, number>> {
        try {
            const today = new Date().toISOString().split("T")[0];
            const analytics: Record<string, number> = {};

            if (period === "daily") {
                // Get last 7 days
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split("T")[0];
                    const key = `daily:${dateStr}:${type}`;
                    const count = (await cacheService.get<number>(this.ANALYTICS_PREFIX, key)) || 0;
                    analytics[dateStr] = count;
                }
            } else {
                // Get last 24 hours
                for (let i = 0; i < 24; i++) {
                    const hour = (new Date().getHours() - i + 24) % 24;
                    const key = `hourly:${today}:${hour}:${type}`;
                    const count = (await cacheService.get<number>(this.ANALYTICS_PREFIX, key)) || 0;
                    analytics[`${hour}:00`] = count;
                }
            }

            return analytics;
        } catch (error) {
            logger.error("Error getting analytics:", error);
            return {};
        }
    }

    /**
     * Get product analytics
     */
    async getProductAnalytics(productId: string): Promise<Record<string, number>> {
        try {
            const actions = ["view", "add_to_cart", "remove_from_cart", "purchase"];
            const analytics: Record<string, number> = {};

            for (const action of actions) {
                const key = `product:${productId}:${action}`;
                const count = (await cacheService.get<number>(this.ANALYTICS_PREFIX, key)) || 0;
                analytics[action] = count;
            }

            return analytics;
        } catch (error) {
            logger.error("Error getting product analytics:", error);
            return {};
        }
    }

    /**
     * Setup default event handlers
     */
    private setupEventHandlers(): void {
        // Product events
        this.on("product:view", (event: ProductEvent) => {
            logger.debug(`Product viewed: ${event.productId} by user: ${event.userId}`);
        });

        this.on("product:add_to_cart", (event: ProductEvent) => {
            logger.debug(`Product added to cart: ${event.productId} by user: ${event.userId}`);
        });

        this.on("product:purchase", (event: ProductEvent) => {
            logger.info(`Product purchased: ${event.productId} by user: ${event.userId} for $${event.price}`);
        });

        // User events
        this.on("user:login", (event: UserEvent) => {
            logger.debug(`User logged in: ${event.userId}`);
        });

        this.on("user:register", (event: UserEvent) => {
            logger.info(`New user registered: ${event.userId}`);
        });

        // Order events
        this.on("order:created", (event: OrderEvent) => {
            logger.info(`Order created: ${event.orderId} by user: ${event.userId} value: $${event.orderValue}`);
        });

        this.on("order:shipped", (event: OrderEvent) => {
            logger.info(`Order shipped: ${event.orderId}`);
        });

        // Error handling
        this.on("error", (error) => {
            logger.error("Event service error:", error);
        });
    }

    /**
     * Start queue processor for batch operations
     */
    private startQueueProcessor(): void {
        setInterval(async () => {
            if (this.eventQueue.length > 0 && !this.processingQueue) {
                this.processingQueue = true;

                try {
                    const events = this.eventQueue.splice(0, 100); // Process in batches of 100

                    // Here you could send events to external analytics services
                    // like Google Analytics, Mixpanel, etc.

                    logger.debug(`Processed ${events.length} events in batch`);
                } catch (error) {
                    logger.error("Error processing event queue:", error);
                } finally {
                    this.processingQueue = false;
                }
            }
        }, 5000); // Process every 5 seconds
    }

    /**
     * Clear analytics data (admin function)
     */
    async clearAnalytics(): Promise<void> {
        try {
            await cacheService.invalidatePattern(this.ANALYTICS_PREFIX, "*");
            logger.info("Analytics data cleared");
        } catch (error) {
            logger.error("Error clearing analytics:", error);
            throw error;
        }
    }
}

export const eventService = new EventService();

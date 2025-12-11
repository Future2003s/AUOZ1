"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastJsonService = void 0;
const fast_json_stringify_1 = __importDefault(require("fast-json-stringify"));
const logger_1 = require("../utils/logger");
const flexibleDataSchema = {
    anyOf: [
        {
            type: "array",
            items: {
                type: "object",
                additionalProperties: true
            }
        },
        {
            type: "object",
            additionalProperties: true
        },
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" }
    ]
};
/**
 * Fast JSON Stringify Service
 * Pre-compiled JSON schemas for 10x faster serialization
 */
class FastJsonService {
    schemas = new Map();
    constructor() {
        this.initializeSchemas();
    }
    initializeSchemas() {
        // Product schema
        this.schemas.set("product", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                _id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                originalPrice: { type: "number" },
                discount: { type: "number" },
                category: { type: "string" },
                brand: { type: "string" },
                images: {
                    type: "array",
                    items: { type: "string" }
                },
                rating: { type: "number" },
                reviewCount: { type: "number" },
                stock: { type: "number" },
                isVisible: { type: "boolean" },
                isFeatured: { type: "boolean" },
                tags: {
                    type: "array",
                    items: { type: "string" }
                },
                specifications: { type: "object" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" }
            }
        }));
        // Product list schema
        this.schemas.set("productList", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                data: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            _id: { type: "string" },
                            name: { type: "string" },
                            price: { type: "number" },
                            images: {
                                type: "array",
                                items: { type: "string" }
                            },
                            rating: { type: "number" },
                            reviewCount: { type: "number" },
                            stock: { type: "number" }
                        }
                    }
                },
                pagination: {
                    type: "object",
                    properties: {
                        page: { type: "number" },
                        limit: { type: "number" },
                        total: { type: "number" },
                        pages: { type: "number" },
                        hasNext: { type: "boolean" },
                        hasPrev: { type: "boolean" }
                    }
                },
                timestamp: { type: "string" }
            }
        }));
        // User schema
        this.schemas.set("user", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                _id: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                avatar: { type: "string" },
                isActive: { type: "boolean" },
                preferences: { type: "object" },
                createdAt: { type: "string" },
                lastLogin: { type: "string" }
            }
        }));
        // Order schema
        this.schemas.set("order", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                _id: { type: "string" },
                orderNumber: { type: "string" },
                user: { type: "string" },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            product: { type: "string" },
                            quantity: { type: "number" },
                            price: { type: "number" },
                            total: { type: "number" }
                        }
                    }
                },
                totalAmount: { type: "number" },
                status: { type: "string" },
                paymentStatus: { type: "string" },
                shippingAddress: { type: "object" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" }
            }
        }));
        // API Response schema - more flexible to handle various response types
        this.schemas.set("apiResponse", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                data: flexibleDataSchema,
                language: { type: "string" },
                pagination: {
                    type: "object",
                    properties: {
                        page: { type: "number" },
                        limit: { type: "number" },
                        total: { type: "number" },
                        pages: { type: "number" },
                        hasNext: { type: "boolean" },
                        hasPrev: { type: "boolean" }
                    }
                },
                meta: {
                    type: "object",
                    properties: {
                        requestId: { type: "string" },
                        processingTime: { type: "number" },
                        cached: { type: "boolean" },
                        version: { type: "string" }
                    }
                },
                timestamp: { type: "string" }
            },
            additionalProperties: true // Allow any additional properties at root level
        }));
        // Auth Response schema - specific for authentication endpoints
        this.schemas.set("authResponse", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                data: {
                    type: "object",
                    properties: {
                        user: {
                            type: "object",
                            properties: {
                                _id: { type: "string" },
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                email: { type: "string" },
                                role: { type: "string" },
                                avatar: { type: "string" },
                                isActive: { type: "boolean" },
                                isEmailVerified: { type: "boolean" },
                                phone: { type: "string" },
                                preferences: {
                                    type: "object",
                                    properties: {
                                        language: { type: "string" },
                                        currency: { type: "string" },
                                        notifications: {
                                            type: "object",
                                            properties: {
                                                email: { type: "boolean" },
                                                sms: { type: "boolean" },
                                                push: { type: "boolean" }
                                            }
                                        }
                                    }
                                },
                                addresses: { type: "array" },
                                createdAt: { type: "string" },
                                updatedAt: { type: "string" },
                                lastLogin: { type: "string" }
                            },
                            additionalProperties: true
                        },
                        token: { type: "string" },
                        refreshToken: { type: "string" }
                    },
                    additionalProperties: true
                },
                timestamp: { type: "string" }
            },
            additionalProperties: true
        }));
        // Translation schema
        this.schemas.set("translation", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                _id: { type: "string" },
                key: { type: "string" },
                category: { type: "string" },
                translations: {
                    type: "object",
                    properties: {
                        vi: { type: "string" },
                        en: { type: "string" },
                        ja: { type: "string" }
                    }
                },
                description: { type: "string" },
                isActive: { type: "boolean" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" }
            }
        }));
        // Analytics schema
        this.schemas.set("analytics", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                overview: {
                    type: "object",
                    properties: {
                        totalProducts: { type: "number" },
                        totalUsers: { type: "number" },
                        totalOrders: { type: "number" },
                        timestamp: { type: "string" }
                    }
                },
                events: { type: "object" },
                performance: {
                    type: "object",
                    properties: {
                        requestCount: { type: "number" },
                        averageResponseTime: { type: "number" },
                        errorRate: { type: "number" },
                        cacheHitRate: { type: "number" }
                    }
                }
            }
        }));
        // Error schema
        this.schemas.set("error", (0, fast_json_stringify_1.default)({
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                error: {
                    type: "object",
                    properties: {
                        code: { type: "string" },
                        details: { type: "string" },
                        stack: { type: "string" }
                    }
                },
                timestamp: { type: "string" }
            }
        }));
        logger_1.logger.info(`FastJSON schemas initialized: ${this.schemas.size} schemas`);
    }
    /**
     * Stringify object using pre-compiled schema
     */
    stringify(schemaName, data) {
        try {
            const schema = this.schemas.get(schemaName);
            if (!schema) {
                logger_1.logger.warn(`FastJSON schema not found: ${schemaName}, falling back to JSON.stringify`);
                return JSON.stringify(data);
            }
            return schema(data);
        }
        catch (error) {
            logger_1.logger.error(`FastJSON stringify error for schema ${schemaName}:`, error);
            // Fallback to regular JSON.stringify
            return JSON.stringify(data);
        }
    }
    /**
     * Add custom schema
     */
    addSchema(name, schema) {
        try {
            this.schemas.set(name, (0, fast_json_stringify_1.default)(schema));
            logger_1.logger.debug(`FastJSON schema added: ${name}`);
        }
        catch (error) {
            logger_1.logger.error(`Error adding FastJSON schema ${name}:`, error);
        }
    }
    /**
     * Remove schema
     */
    removeSchema(name) {
        const removed = this.schemas.delete(name);
        if (removed) {
            logger_1.logger.debug(`FastJSON schema removed: ${name}`);
        }
        return removed;
    }
    /**
     * Get available schemas
     */
    getSchemas() {
        return Array.from(this.schemas.keys());
    }
    /**
     * Benchmark stringify performance
     */
    benchmark(schemaName, data, iterations = 1000) {
        const schema = this.schemas.get(schemaName);
        if (!schema) {
            throw new Error(`Schema not found: ${schemaName}`);
        }
        // Benchmark fast-json-stringify
        const fastStart = process.hrtime.bigint();
        for (let i = 0; i < iterations; i++) {
            schema(data);
        }
        const fastEnd = process.hrtime.bigint();
        const fastTime = Number(fastEnd - fastStart) / 1000000; // Convert to milliseconds
        // Benchmark regular JSON.stringify
        const regularStart = process.hrtime.bigint();
        for (let i = 0; i < iterations; i++) {
            JSON.stringify(data);
        }
        const regularEnd = process.hrtime.bigint();
        const regularTime = Number(regularEnd - regularStart) / 1000000;
        const speedup = regularTime / fastTime;
        return {
            iterations,
            fastJsonTime: fastTime.toFixed(2) + "ms",
            regularJsonTime: regularTime.toFixed(2) + "ms",
            speedup: speedup.toFixed(2) + "x faster",
            schema: schemaName
        };
    }
    /**
     * Get performance stats
     */
    getStats() {
        return {
            schemasCount: this.schemas.size,
            availableSchemas: this.getSchemas(),
            memoryUsage: process.memoryUsage()
        };
    }
}
exports.fastJsonService = new FastJsonService();

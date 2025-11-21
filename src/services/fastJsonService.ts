import fastJson, { Schema } from "fast-json-stringify";
import { logger } from "../utils/logger";

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
} as Schema;

/**
 * Fast JSON Stringify Service
 * Pre-compiled JSON schemas for 10x faster serialization
 */
class FastJsonService {
    private schemas: Map<string, any> = new Map();

    constructor() {
        this.initializeSchemas();
    }

    private initializeSchemas(): void {
        // Product schema
        this.schemas.set(
            "product",
            fastJson({
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
            })
        );

        // Product list schema
        this.schemas.set(
            "productList",
            fastJson({
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
            })
        );

        // User schema
        this.schemas.set(
            "user",
            fastJson({
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
            })
        );

        // Order schema
        this.schemas.set(
            "order",
            fastJson({
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
            })
        );

        // API Response schema - more flexible to handle various response types
        this.schemas.set(
            "apiResponse",
            fastJson({
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
            })
        );

        // Auth Response schema - specific for authentication endpoints
        this.schemas.set(
            "authResponse",
            fastJson({
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
            })
        );

        // Translation schema
        this.schemas.set(
            "translation",
            fastJson({
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
            })
        );

        // Analytics schema
        this.schemas.set(
            "analytics",
            fastJson({
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
            })
        );

        // Error schema
        this.schemas.set(
            "error",
            fastJson({
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
            })
        );

        logger.info(`FastJSON schemas initialized: ${this.schemas.size} schemas`);
    }

    /**
     * Stringify object using pre-compiled schema
     */
    stringify(schemaName: string, data: any): string {
        try {
            const schema = this.schemas.get(schemaName);
            if (!schema) {
                logger.warn(`FastJSON schema not found: ${schemaName}, falling back to JSON.stringify`);
                return JSON.stringify(data);
            }

            return schema(data);
        } catch (error) {
            logger.error(`FastJSON stringify error for schema ${schemaName}:`, error);
            // Fallback to regular JSON.stringify
            return JSON.stringify(data);
        }
    }

    /**
     * Add custom schema
     */
    addSchema(name: string, schema: any): void {
        try {
            this.schemas.set(name, fastJson(schema));
            logger.debug(`FastJSON schema added: ${name}`);
        } catch (error) {
            logger.error(`Error adding FastJSON schema ${name}:`, error);
        }
    }

    /**
     * Remove schema
     */
    removeSchema(name: string): boolean {
        const removed = this.schemas.delete(name);
        if (removed) {
            logger.debug(`FastJSON schema removed: ${name}`);
        }
        return removed;
    }

    /**
     * Get available schemas
     */
    getSchemas(): string[] {
        return Array.from(this.schemas.keys());
    }

    /**
     * Benchmark stringify performance
     */
    benchmark(schemaName: string, data: any, iterations = 1000): any {
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
    getStats(): any {
        return {
            schemasCount: this.schemas.size,
            availableSchemas: this.getSchemas(),
            memoryUsage: process.memoryUsage()
        };
    }
}

export const fastJsonService = new FastJsonService();

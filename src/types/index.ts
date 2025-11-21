/**
 * Optimized types for ShopDev E-commerce Platform
 * Performance-focused type definitions with strict typing
 */

import { SupportedLanguages } from "../models/Translation";

// ============= CORE API TYPES =============

export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    fields?: string;
    cursor?: string; // For cursor-based pagination
}

export interface SearchQuery extends PaginationQuery {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
    rating?: number;
    tags?: string[];
    inStock?: boolean;
    featured?: boolean;
    dateFrom?: string;
    dateTo?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    language?: SupportedLanguages;
    pagination?: PaginationMeta;
    meta?: ResponseMeta;
    timestamp: string;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
}

export interface ResponseMeta {
    requestId?: string;
    processingTime?: number;
    cached?: boolean;
    cacheExpiry?: number;
    version?: string;
}

// ============= AUTHENTICATION TYPES =============

export interface JWTPayload {
    id: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
    sessionId?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: "Bearer";
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
    deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
    userAgent: string;
    ip: string;
    platform?: string;
    browser?: string;
}

// ============= COMMUNICATION TYPES =============

export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    template?: string;
    context?: Record<string, any>;
    attachments?: EmailAttachment[];
    priority?: "high" | "normal" | "low";
    language?: SupportedLanguages;
}

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
    cid?: string;
}

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    userId?: string;
    channels: NotificationChannel[];
    priority?: "high" | "normal" | "low";
    scheduledAt?: Date;
}

// ============= FILE UPLOAD TYPES =============

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    url?: string;
    thumbnails?: FileVariant[];
}

export interface FileVariant {
    size: "small" | "medium" | "large";
    width: number;
    height: number;
    url: string;
    path: string;
}

export interface Address {
    type: "home" | "work" | "other";
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
}

export interface CartItem {
    product: string;
    quantity: number;
    price: number;
    variant?: {
        size?: string;
        color?: string;
        [key: string]: any;
    };
}

export interface OrderItem extends CartItem {
    name: string;
    image: string;
}

export interface PaymentResult {
    id: string;
    status: string;
    update_time: string;
    email_address: string;
}

export interface ShippingInfo {
    address: Address;
    method: string;
    cost: number;
    estimatedDelivery: Date;
}

export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}

export enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}

export enum UserRole {
    CUSTOMER = "customer",
    ADMIN = "admin",
    SELLER = "seller",
    TRANSLATOR = "translator"
}

// ============= NOTIFICATION TYPES =============

export enum NotificationType {
    ORDER_CREATED = "order_created",
    ORDER_UPDATED = "order_updated",
    ORDER_SHIPPED = "order_shipped",
    ORDER_DELIVERED = "order_delivered",
    PAYMENT_SUCCESS = "payment_success",
    PAYMENT_FAILED = "payment_failed",
    PRODUCT_BACK_IN_STOCK = "product_back_in_stock",
    PRICE_DROP = "price_drop",
    PROMOTION = "promotion",
    SYSTEM_MAINTENANCE = "system_maintenance"
}

export enum NotificationChannel {
    EMAIL = "email",
    SMS = "sms",
    PUSH = "push",
    IN_APP = "in_app",
    WEBHOOK = "webhook"
}

// ============= PRODUCT TYPES =============

export enum ProductStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    INACTIVE = "inactive",
    OUT_OF_STOCK = "out_of_stock",
    DISCONTINUED = "discontinued"
}

export enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED_AMOUNT = "fixed_amount",
    FREE_SHIPPING = "free_shipping",
    BUY_X_GET_Y = "buy_x_get_y"
}

// ============= PERFORMANCE TYPES =============

export interface PerformanceMetrics {
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
    timestamp: Date;
}

export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
    evictions: number;
}

// ============= EVENT TYPES =============

export interface BaseEvent {
    id: string;
    type: string;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

export interface ProductEvent extends BaseEvent {
    productId: string;
    action: "view" | "add_to_cart" | "remove_from_cart" | "purchase";
    quantity?: number;
    price?: number;
}

export interface UserEvent extends BaseEvent {
    action: "login" | "logout" | "register" | "profile_update";
    deviceInfo?: DeviceInfo;
}

export interface OrderEvent extends BaseEvent {
    orderId: string;
    action: "created" | "updated" | "cancelled" | "shipped" | "delivered";
    orderValue?: number;
    items?: OrderItem[];
}

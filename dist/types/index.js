"use strict";
/**
 * Optimized types for ShopDev E-commerce Platform
 * Performance-focused type definitions with strict typing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountType = exports.ProductStatus = exports.NotificationChannel = exports.NotificationType = exports.UserRole = exports.PaymentStatus = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "customer";
    UserRole["ADMIN"] = "admin";
    UserRole["SELLER"] = "seller";
    UserRole["TRANSLATOR"] = "translator";
})(UserRole || (exports.UserRole = UserRole = {}));
// ============= NOTIFICATION TYPES =============
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_CREATED"] = "order_created";
    NotificationType["ORDER_UPDATED"] = "order_updated";
    NotificationType["ORDER_SHIPPED"] = "order_shipped";
    NotificationType["ORDER_DELIVERED"] = "order_delivered";
    NotificationType["PAYMENT_SUCCESS"] = "payment_success";
    NotificationType["PAYMENT_FAILED"] = "payment_failed";
    NotificationType["PRODUCT_BACK_IN_STOCK"] = "product_back_in_stock";
    NotificationType["PRICE_DROP"] = "price_drop";
    NotificationType["PROMOTION"] = "promotion";
    NotificationType["SYSTEM_MAINTENANCE"] = "system_maintenance";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["IN_APP"] = "in_app";
    NotificationChannel["WEBHOOK"] = "webhook";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// ============= PRODUCT TYPES =============
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["DRAFT"] = "draft";
    ProductStatus["ACTIVE"] = "active";
    ProductStatus["INACTIVE"] = "inactive";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
    ProductStatus["DISCONTINUED"] = "discontinued";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
    DiscountType["FREE_SHIPPING"] = "free_shipping";
    DiscountType["BUY_X_GET_Y"] = "buy_x_get_y";
})(DiscountType || (exports.DiscountType = DiscountType = {}));

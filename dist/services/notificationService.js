"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const Notification_1 = require("../models/Notification");
const logger_1 = require("../utils/logger");
class NotificationService {
    /**
     * Create a new notification
     */
    async createNotification(data) {
        try {
            // Default: send to all employees if no recipients specified
            const recipients = data.recipients || [{ allEmployees: true }];
            const notification = await Notification_1.Notification.create({
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data || {},
                recipients
            });
            logger_1.logger.info(`Notification created: ${notification._id} - ${data.type}`);
            return notification;
        }
        catch (error) {
            logger_1.logger.error("Error creating notification:", error);
            throw error;
        }
    }
    /**
     * Create order notification (helper method)
     */
    async createOrderNotification(orderData) {
        const buyerName = orderData.isGuest ? "Khách hàng" : "Khách hàng";
        const orderNumber = orderData.orderNumber || orderData.orderId.slice(-8).toUpperCase();
        return this.createNotification({
            type: "order_created",
            title: "Đơn hàng mới",
            message: `Đơn hàng ${orderNumber} - ${orderData.itemCount} sản phẩm - ${this.formatCurrency(orderData.total)}`,
            data: {
                orderId: orderData.orderId,
                orderNumber: orderNumber,
                total: orderData.total,
                itemCount: orderData.itemCount,
                userId: orderData.userId,
                isGuest: orderData.isGuest
            },
            recipients: [{ allEmployees: true }] // Send to all employees
        });
    }
    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId, role, options = {}) {
        try {
            const { limit = 50, skip = 0, unreadOnly = false } = options;
            // Build query for recipients
            const recipientQuery = {
                $or: [
                    { "recipients.allEmployees": true },
                    ...(role ? [{ "recipients.role": role }] : []),
                    ...(userId ? [{ "recipients.userId": userId }] : [])
                ]
            };
            // Build query
            let query = recipientQuery;
            // If unreadOnly, exclude notifications read by this user
            if (unreadOnly && userId) {
                query = {
                    ...recipientQuery,
                    readBy: { $ne: userId }
                };
            }
            // Get notifications
            const notifications = await Notification_1.Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
            // Get total count
            const total = await Notification_1.Notification.countDocuments(query);
            // Get unread count
            const unreadCount = userId
                ? await Notification_1.Notification.countDocuments({
                    ...recipientQuery,
                    readBy: { $ne: userId }
                })
                : 0;
            return {
                notifications: notifications,
                total,
                unreadCount
            };
        }
        catch (error) {
            logger_1.logger.error("Error getting user notifications:", error);
            throw error;
        }
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification_1.Notification.findByIdAndUpdate(notificationId, { $addToSet: { readBy: userId } }, { new: true });
            if (!notification) {
                return null;
            }
            logger_1.logger.debug(`Notification ${notificationId} marked as read by user ${userId}`);
            return notification;
        }
        catch (error) {
            logger_1.logger.error("Error marking notification as read:", error);
            throw error;
        }
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId, role) {
        try {
            // Build query for recipients
            const recipientQuery = {
                $or: [
                    { "recipients.allEmployees": true },
                    ...(role ? [{ "recipients.role": role }] : []),
                    { "recipients.userId": userId }
                ],
                readBy: { $ne: userId } // Only unread notifications
            };
            const result = await Notification_1.Notification.updateMany(recipientQuery, {
                $addToSet: { readBy: userId }
            });
            logger_1.logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
            return result.modifiedCount;
        }
        catch (error) {
            logger_1.logger.error("Error marking all notifications as read:", error);
            throw error;
        }
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        try {
            const result = await Notification_1.Notification.findByIdAndDelete(notificationId);
            return !!result;
        }
        catch (error) {
            logger_1.logger.error("Error deleting notification:", error);
            throw error;
        }
    }
    /**
     * Delete old notifications (cleanup)
     */
    async deleteOldNotifications(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const result = await Notification_1.Notification.deleteMany({
                createdAt: { $lt: cutoffDate }
            });
            logger_1.logger.info(`Deleted ${result.deletedCount} old notifications (older than ${daysOld} days)`);
            return result.deletedCount;
        }
        catch (error) {
            logger_1.logger.error("Error deleting old notifications:", error);
            throw error;
        }
    }
    /**
     * Helper: Format currency
     */
    formatCurrency(value) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(value);
    }
}
exports.notificationService = new NotificationService();

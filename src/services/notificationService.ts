import { Notification, INotification } from "../models/Notification";
import { logger } from "../utils/logger";

interface CreateNotificationData {
    type: "order_created" | "order_updated" | "order_cancelled" | "order_shipped" | "order_delivered" | "system";
    title: string;
    message: string;
    data?: {
        orderId?: string;
        orderNumber?: string;
        total?: number;
        itemCount?: number;
        userId?: string;
        isGuest?: boolean;
        [key: string]: any;
    };
    recipients?: {
        userId?: string;
        role?: string;
        allEmployees?: boolean;
    }[];
}

class NotificationService {
    /**
     * Create a new notification
     */
    async createNotification(data: CreateNotificationData): Promise<INotification> {
        try {
            // Default: send to all employees if no recipients specified
            const recipients = data.recipients || [{ allEmployees: true }];

            const notification = await Notification.create({
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data || {},
                recipients
            });

            logger.info(`Notification created: ${notification._id} - ${data.type}`);
            return notification;
        } catch (error) {
            logger.error("Error creating notification:", error);
            throw error;
        }
    }

    /**
     * Create order notification (helper method)
     */
    async createOrderNotification(orderData: {
        orderId: string;
        orderNumber?: string;
        total: number;
        itemCount: number;
        userId?: string;
        isGuest?: boolean;
    }): Promise<INotification> {
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
    async getUserNotifications(
        userId?: string,
        role?: string,
        options: {
            limit?: number;
            skip?: number;
            unreadOnly?: boolean;
        } = {}
    ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
        try {
            const { limit = 50, skip = 0, unreadOnly = false } = options;

            // Build query for recipients
            const recipientQuery: any = {
                $or: [
                    { "recipients.allEmployees": true },
                    ...(role ? [{ "recipients.role": role }] : []),
                    ...(userId ? [{ "recipients.userId": userId }] : [])
                ]
            };

            // Build query
            let query: any = recipientQuery;

            // If unreadOnly, exclude notifications read by this user
            if (unreadOnly && userId) {
                query = {
                    ...recipientQuery,
                    readBy: { $ne: userId }
                };
            }

            // Get notifications
            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Get total count
            const total = await Notification.countDocuments(query);

            // Get unread count
            const unreadCount = userId
                ? await Notification.countDocuments({
                      ...recipientQuery,
                      readBy: { $ne: userId }
                  })
                : 0;

            return {
                notifications: notifications as INotification[],
                total,
                unreadCount
            };
        } catch (error) {
            logger.error("Error getting user notifications:", error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { $addToSet: { readBy: userId } },
                { new: true }
            );

            if (!notification) {
                return null;
            }

            logger.debug(`Notification ${notificationId} marked as read by user ${userId}`);
            return notification;
        } catch (error) {
            logger.error("Error marking notification as read:", error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string, role?: string): Promise<number> {
        try {
            // Build query for recipients
            const recipientQuery: any = {
                $or: [
                    { "recipients.allEmployees": true },
                    ...(role ? [{ "recipients.role": role }] : []),
                    { "recipients.userId": userId }
                ],
                readBy: { $ne: userId } // Only unread notifications
            };

            const result = await Notification.updateMany(recipientQuery, {
                $addToSet: { readBy: userId }
            });

            logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
            return result.modifiedCount;
        } catch (error) {
            logger.error("Error marking all notifications as read:", error);
            throw error;
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string): Promise<boolean> {
        try {
            const result = await Notification.findByIdAndDelete(notificationId);
            return !!result;
        } catch (error) {
            logger.error("Error deleting notification:", error);
            throw error;
        }
    }

    /**
     * Delete old notifications (cleanup)
     */
    async deleteOldNotifications(daysOld: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await Notification.deleteMany({
                createdAt: { $lt: cutoffDate }
            });

            logger.info(`Deleted ${result.deletedCount} old notifications (older than ${daysOld} days)`);
            return result.deletedCount;
        } catch (error) {
            logger.error("Error deleting old notifications:", error);
            throw error;
        }
    }

    /**
     * Helper: Format currency
     */
    private formatCurrency(value: number): string {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(value);
    }
}

export const notificationService = new NotificationService();


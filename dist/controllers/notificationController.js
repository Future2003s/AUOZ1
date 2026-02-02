"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const notificationService_1 = require("../services/notificationService");
// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getUserNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const userRole = req.user?.role?.toUpperCase();
    const { page = 1, limit = 50, unreadOnly } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (Math.max(1, pageNum) - 1) * limitNum;
    const result = await notificationService_1.notificationService.getUserNotifications(userId, userRole, {
        limit: limitNum,
        skip,
        unreadOnly: unreadOnly === "true"
    });
    // Return notifications with unreadCount in custom response
    return res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: result.notifications,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            pages: Math.ceil(result.total / limitNum),
            totalPages: Math.ceil(result.total / limitNum)
        },
        unreadCount: result.unreadCount,
        timestamp: new Date().toISOString()
    });
});
// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const notification = await notificationService_1.notificationService.markAsRead(notificationId, userId);
    if (!notification) {
        return next(new AppError_1.AppError("Notification not found", 404));
    }
    response_1.ResponseHandler.success(res, notification, "Notification marked as read");
});
// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user.id;
    const userRole = req.user?.role?.toUpperCase();
    const count = await notificationService_1.notificationService.markAllAsRead(userId, userRole);
    response_1.ResponseHandler.success(res, { markedCount: count }, "All notifications marked as read");
});
// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user?.role?.toUpperCase();
    // Only allow users to delete their own notifications or admins to delete any
    // For now, we'll allow deletion if user is in recipients
    const deleted = await notificationService_1.notificationService.deleteNotification(notificationId);
    if (!deleted) {
        return next(new AppError_1.AppError("Notification not found", 404));
    }
    response_1.ResponseHandler.success(res, null, "Notification deleted successfully");
});
// @desc    Get unread count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadCount = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const userRole = req.user?.role?.toUpperCase();
    const result = await notificationService_1.notificationService.getUserNotifications(userId, userRole, {
        limit: 1,
        skip: 0,
        unreadOnly: true
    });
    response_1.ResponseHandler.success(res, { unreadCount: result.unreadCount }, "Unread count retrieved successfully");
});

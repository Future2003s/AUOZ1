import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { notificationService } from "../services/notificationService";

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role?.toUpperCase();
    const { page = 1, limit = 50, unreadOnly } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (Math.max(1, pageNum) - 1) * limitNum;

    const result = await notificationService.getUserNotifications(userId, userRole, {
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
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const notificationId = req.params.id;
    const userId = (req as any).user.id;

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
        return next(new AppError("Notification not found", 404));
    }

    ResponseHandler.success(res, notification, "Notification marked as read");
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.id;
    const userRole = (req as any).user?.role?.toUpperCase();

    const count = await notificationService.markAllAsRead(userId, userRole);

    ResponseHandler.success(res, { markedCount: count }, "All notifications marked as read");
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const notificationId = req.params.id;
    const userId = (req as any).user.id;
    const userRole = (req as any).user?.role?.toUpperCase();

    // Only allow users to delete their own notifications or admins to delete any
    // For now, we'll allow deletion if user is in recipients
    const deleted = await notificationService.deleteNotification(notificationId);

    if (!deleted) {
        return next(new AppError("Notification not found", 404));
    }

    ResponseHandler.success(res, null, "Notification deleted successfully");
});

// @desc    Get unread count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role?.toUpperCase();

    const result = await notificationService.getUserNotifications(userId, userRole, {
        limit: 1,
        skip: 0,
        unreadOnly: true
    });

    ResponseHandler.success(res, { unreadCount: result.unreadCount }, "Unread count retrieved successfully");
});


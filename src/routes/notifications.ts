import { Router } from "express";
import { protect } from "../middleware/auth";
import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount
} from "../controllers/notificationController";

const router = Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get("/", getUserNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark notification as read
router.put("/:id/read", markNotificationAsRead);

// Mark all as read
router.put("/read-all", markAllNotificationsAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

export default router;


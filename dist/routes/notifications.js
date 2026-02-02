"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
// Get user notifications
router.get("/", notificationController_1.getUserNotifications);
// Get unread count
router.get("/unread-count", notificationController_1.getUnreadCount);
// Mark notification as read
router.put("/:id/read", notificationController_1.markNotificationAsRead);
// Mark all as read
router.put("/read-all", notificationController_1.markAllNotificationsAsRead);
// Delete notification
router.delete("/:id", notificationController_1.deleteNotification);
exports.default = router;

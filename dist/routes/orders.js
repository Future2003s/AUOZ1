"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const orderHistoryService_1 = require("../services/orderHistoryService");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
// Guest checkout (no authentication required)
router.post("/guest", unifiedValidation_1.validateCreateOrder, orderController_1.createOrder);
// All other routes require authentication
router.use(auth_1.protect);
// Customer routes (authentication required)
router.get("/", unifiedValidation_1.validatePagination, orderController_1.getUserOrders);
router.get("/:id", unifiedValidation_1.validateOrderId, orderController_1.getOrder);
router.post("/", unifiedValidation_1.validateCreateOrder, orderController_1.createOrder);
router.put("/:id/cancel", unifiedValidation_1.validateOrderId, orderController_1.cancelOrder);
router.get("/:id/tracking", unifiedValidation_1.validateOrderId, orderController_1.getOrderTracking);
// Admin routes
router.get("/admin/all", (0, auth_1.authorize)("admin", "ADMIN"), unifiedValidation_1.validatePagination, orderController_1.getAllOrders);
router.put("/:id/status", (0, auth_1.authorize)("admin", "ADMIN"), unifiedValidation_1.validateOrderId, unifiedValidation_1.validateOrderStatus, orderController_1.updateOrderStatus);
// Get order history
router.get("/:id/history", (0, auth_1.authorize)("admin", "ADMIN"), (req, res) => {
    try {
        const orderId = req.params.id;
        // Get history from service
        const orderHistory = orderHistoryService_1.orderHistoryService.getOrderHistory(orderId);
        // If no history exists, create some sample data for demo
        if (orderHistory.length === 0) {
            const sampleHistory = [
                {
                    orderId,
                    oldStatus: "PENDING",
                    newStatus: "PROCESSING",
                    changedBy: "Admin",
                    note: "Đơn hàng đã được xác nhận và đang xử lý"
                },
                {
                    orderId,
                    oldStatus: "PROCESSING",
                    newStatus: "SHIPPED",
                    changedBy: "Admin",
                    note: "Đơn hàng đã được giao cho đơn vị vận chuyển"
                }
            ];
            sampleHistory.forEach((entry) => {
                orderHistoryService_1.orderHistoryService.addEntry(entry);
            });
            // Get the updated history
            const updatedHistory = orderHistoryService_1.orderHistoryService.getOrderHistory(orderId);
            return res.json({
                success: true,
                data: updatedHistory
            });
        }
        res.json({
            success: true,
            data: orderHistory
        });
    }
    catch (error) {
        console.error("Error fetching order history:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.default = router;

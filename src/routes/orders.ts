import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    validateCreateOrder,
    validateOrderId,
    validateOrderStatus,
    validatePagination
} from "../middleware/unifiedValidation";
import { orderHistoryService } from "../services/orderHistoryService";
import {
    createOrder,
    getUserOrders,
    getOrder,
    cancelOrder,
    getOrderTracking,
    getAllOrders,
    updateOrderStatus
} from "../controllers/orderController";

const router = Router();

// Guest checkout (no authentication required)
router.post("/guest", validateCreateOrder, createOrder);

// All other routes require authentication
router.use(protect);

// Customer routes (authentication required)
router.get("/", validatePagination, getUserOrders);
router.get("/:id", validateOrderId, getOrder);
router.post("/", validateCreateOrder, createOrder);
router.put("/:id/cancel", validateOrderId, cancelOrder);
router.get("/:id/tracking", validateOrderId, getOrderTracking);

// Admin routes
router.get("/admin/all", authorize("admin", "ADMIN"), validatePagination, getAllOrders);
router.put("/:id/status", authorize("admin", "ADMIN"), validateOrderId, validateOrderStatus, updateOrderStatus);

// Get order history
router.get("/:id/history", authorize("admin", "ADMIN"), (req, res) => {
    try {
        const orderId = req.params.id;

        // Get history from service
        const orderHistory = orderHistoryService.getOrderHistory(orderId);

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
                orderHistoryService.addEntry(entry);
            });

            // Get the updated history
            const updatedHistory = orderHistoryService.getOrderHistory(orderId);
            return res.json({
                success: true,
                data: updatedHistory
            });
        }

        res.json({
            success: true,
            data: orderHistory
        });
    } catch (error) {
        console.error("Error fetching order history:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;

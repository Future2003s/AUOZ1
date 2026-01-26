import { Router } from "express";
import { protect } from "../middleware/auth";
import {
    getEmployeeMetrics,
    getIncompleteInvoices,
    getUndeliveredOrders,
    getUnpaidOrders,
    getOrdersNotInDebt
} from "../controllers/employeeMetricsController";
import {
    getEmployeeNavUsage,
    recordEmployeeNavUsage
} from "../controllers/employeeNavController";

const router = Router();

// All routes require authentication and employee/admin role
router.use(protect);
router.use((req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const userRole = (req.user.role || "").toUpperCase();
    if (!["ADMIN", "EMPLOYEE"].includes(userRole)) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
});

// Metrics routes
router.get("/metrics", getEmployeeMetrics);
router.get("/metrics/incomplete-invoices", getIncompleteInvoices);
router.get("/metrics/undelivered-orders", getUndeliveredOrders);
router.get("/metrics/unpaid-orders", getUnpaidOrders);
router.get("/metrics/not-in-debt", getOrdersNotInDebt);

// Navigation usage routes
router.get("/nav-usage", getEmployeeNavUsage);
router.post("/nav-usage", recordEmployeeNavUsage);

export default router;


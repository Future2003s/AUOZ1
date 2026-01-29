"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const employeeMetricsController_1 = require("../controllers/employeeMetricsController");
const employeeNavController_1 = require("../controllers/employeeNavController");
const router = (0, express_1.Router)();
// All routes require authentication and employee/admin role
router.use(auth_1.protect);
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
router.get("/metrics", employeeMetricsController_1.getEmployeeMetrics);
router.get("/metrics/incomplete-invoices", employeeMetricsController_1.getIncompleteInvoices);
router.get("/metrics/undelivered-orders", employeeMetricsController_1.getUndeliveredOrders);
router.get("/metrics/unpaid-orders", employeeMetricsController_1.getUnpaidOrders);
router.get("/metrics/not-in-debt", employeeMetricsController_1.getOrdersNotInDebt);
// Navigation usage routes
router.get("/nav-usage", employeeNavController_1.getEmployeeNavUsage);
router.post("/nav-usage", employeeNavController_1.recordEmployeeNavUsage);
exports.default = router;

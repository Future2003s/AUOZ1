"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const debtController_1 = require("../controllers/debtController");
const upload_1 = require("../middleware/upload");
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
// Routes
router.get("/", debtController_1.getAllDebts);
router.get("/:id", debtController_1.getDebt);
router.post("/", debtController_1.createDebt);
router.put("/:id", debtController_1.updateDebt);
router.put("/:id/paid", debtController_1.markDebtPaid);
router.post("/:id/proof", upload_1.uploadProductImage, debtController_1.uploadPaymentProof);
exports.default = router;

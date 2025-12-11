"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const shippingController_1 = require("../controllers/shippingController");
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
router.post("/proof", upload_1.uploadShippingProof, shippingController_1.uploadShippingProof);
router.get("/proof/:orderId", shippingController_1.getShippingProofs);
exports.default = router;

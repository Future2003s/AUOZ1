"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const buyerController_1 = require("../controllers/buyerController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
// All routes require Employee or Admin role (case-insensitive check)
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
router.route("/")
    .get(buyerController_1.getAllBuyers)
    .post(buyerController_1.createBuyer);
router.route("/:id")
    .get(buyerController_1.getBuyer)
    .put(buyerController_1.updateBuyer)
    .delete(buyerController_1.deleteBuyer);
exports.default = router;

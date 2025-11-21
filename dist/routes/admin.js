"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(auth_1.protect, (0, auth_1.authorize)("admin"));
// Dashboard stats
router.get("/dashboard", (req, res) => {
    res.json({ message: "Get dashboard stats - Coming soon" });
});
// User management
router.get("/users", unifiedValidation_1.validatePagination, userController_1.getAllUsers);
router.post("/users", userController_1.createUser);
router.put("/users/:id", unifiedValidation_1.validateUserId, userController_1.updateUser);
router.put("/users/:id/role", unifiedValidation_1.validateUserId, userController_1.updateUserRole);
router.put("/users/:id/status", unifiedValidation_1.validateUserId, userController_1.updateUserStatus);
router.delete("/users/:id", unifiedValidation_1.validateUserId, userController_1.deleteUser);
router.post("/users/:id/reset-login-attempts", unifiedValidation_1.validateUserId, userController_1.resetLoginAttempts);
router.get("/users/:id/login-attempts", unifiedValidation_1.validateUserId, userController_1.getLoginAttempts);
// Product management
router.get("/products", unifiedValidation_1.validatePagination, (req, res) => {
    res.json({ message: "Get all products (Admin) - Coming soon" });
});
// Order management
router.get("/orders", unifiedValidation_1.validatePagination, (req, res) => {
    res.json({ message: "Get all orders (Admin) - Coming soon" });
});
// Analytics
router.get("/analytics/sales", (req, res) => {
    res.json({ message: "Get sales analytics - Coming soon" });
});
router.get("/analytics/users", (req, res) => {
    res.json({ message: "Get user analytics - Coming soon" });
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const upload_1 = require("../middleware/upload");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
// Profile management
router.get("/profile", userController_1.getProfile);
router.put("/profile", userController_1.updateProfile);
router.post("/avatar", upload_1.uploadAvatar, userController_1.uploadAvatar);
router.delete("/account", userController_1.deleteAccount);
// Address management
router.get("/addresses", userController_1.getAddresses);
router.post("/addresses", unifiedValidation_1.validateAddress, userController_1.addAddress);
router.put("/addresses/:addressId", unifiedValidation_1.validateUserId, unifiedValidation_1.validateAddress, userController_1.updateAddress);
router.delete("/addresses/:addressId", unifiedValidation_1.validateUserId, userController_1.deleteAddress);
router.put("/addresses/:addressId/default", unifiedValidation_1.validateUserId, userController_1.setDefaultAddress);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const voucherController_1 = require("../controllers/voucherController");
const router = (0, express_1.Router)();
router.post("/apply", auth_1.optionalAuth, voucherController_1.applyVoucher);
router.route("/")
    .get(auth_1.protect, (0, auth_1.authorize)("admin"), voucherController_1.getVouchers)
    .post(auth_1.protect, (0, auth_1.authorize)("admin"), voucherController_1.createVoucher);
router.route("/:id")
    .get(auth_1.protect, (0, auth_1.authorize)("admin"), voucherController_1.getVoucher)
    .put(auth_1.protect, (0, auth_1.authorize)("admin"), voucherController_1.updateVoucher)
    .delete(auth_1.protect, (0, auth_1.authorize)("admin"), voucherController_1.deleteVoucher);
exports.default = router;

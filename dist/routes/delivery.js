"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deliveryController_1 = require("../controllers/deliveryController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
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
router.get("/new", deliveryController_1.createDraftOrder);
router.route("/")
    .get(deliveryController_1.getAllDeliveryOrders)
    .post(deliveryController_1.createDeliveryOrder);
router.route("/code/:orderCode")
    .get(deliveryController_1.getDeliveryOrderByCode);
router.route("/:id")
    .get(deliveryController_1.getDeliveryOrder)
    .put(deliveryController_1.updateDeliveryOrder)
    .delete(deliveryController_1.deleteDeliveryOrder);
router.route("/:id/upload-proof")
    .get(deliveryController_1.getDeliveryProofImage)
    .post(upload_1.uploadDeliveryProof, deliveryController_1.uploadProofImage)
    .put(upload_1.uploadDeliveryProof, deliveryController_1.uploadProofImage); // allow replacing proof image
exports.default = router;

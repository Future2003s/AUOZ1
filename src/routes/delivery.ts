import { Router } from "express";
import {
    createDraftOrder,
    createDeliveryOrder,
    getAllDeliveryOrders,
    getDeliveryOrder,
    getDeliveryOrderByCode,
    updateDeliveryOrder,
    uploadProofImage,
    getDeliveryProofImage,
    deleteDeliveryOrder,
} from "../controllers/deliveryController";
import { protect } from "../middleware/auth";
import { uploadProductImage, uploadDeliveryProof } from "../middleware/upload";

const router = Router();

// All routes require authentication
router.use(protect);

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
router.get("/new", createDraftOrder);
router.route("/")
    .get(getAllDeliveryOrders)
    .post(createDeliveryOrder);

router.route("/code/:orderCode")
    .get(getDeliveryOrderByCode);

router.route("/:id")
    .get(getDeliveryOrder)
    .put(updateDeliveryOrder)
    .delete(deleteDeliveryOrder);

router.route("/:id/upload-proof")
    .get(getDeliveryProofImage)
    .post(uploadDeliveryProof, uploadProofImage)
    .put(uploadDeliveryProof, uploadProofImage); // allow replacing proof image

export default router;


import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    uploadShippingProof,
    getShippingProofs
} from "../controllers/shippingController";
import { uploadShippingProof as uploadShippingProofMiddleware } from "../middleware/upload";

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

// Routes
router.post("/proof", uploadShippingProofMiddleware, uploadShippingProof);
router.get("/proof/:orderId", getShippingProofs);

export default router;


import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    getAllDebts,
    getDebt,
    createDebt,
    updateDebt,
    markDebtPaid,
    uploadPaymentProof
} from "../controllers/debtController";
import { uploadProductImage } from "../middleware/upload";

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
router.get("/", getAllDebts);
router.get("/:id", getDebt);
router.post("/", createDebt);
router.put("/:id", updateDebt);
router.put("/:id/paid", markDebtPaid);
router.post("/:id/proof", uploadProductImage, uploadPaymentProof);

export default router;


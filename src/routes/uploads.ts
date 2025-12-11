import { Router } from "express";
import { uploadFile } from "../controllers/uploadController";
import { protect } from "../middleware/auth";
import { uploadProductImage } from "../middleware/upload";

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
router.post("/", uploadProductImage, uploadFile);

export default router;


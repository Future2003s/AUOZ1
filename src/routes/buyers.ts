import { Router } from "express";
import {
    getAllBuyers,
    getBuyer,
    createBuyer,
    updateBuyer,
    deleteBuyer,
} from "../controllers/buyerController";
import { protect } from "../middleware/auth";

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
router.route("/")
    .get(getAllBuyers)
    .post(createBuyer);

router.route("/:id")
    .get(getBuyer)
    .put(updateBuyer)
    .delete(deleteBuyer);

export default router;


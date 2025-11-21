import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
    getActiveAdvertisement,
    getAllAdvertisements,
    getAdvertisementById,
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    toggleAdvertisement
} from "../controllers/advertisementController";

const router = Router();

// Public route - Get active advertisement
router.get("/active", staticDataCache(60), getActiveAdvertisement); // Cache for 1 minute

// Protected routes - Admin only
router.get("/", protect, authorize("admin"), adminRateLimit, getAllAdvertisements);
router.get("/:id", protect, authorize("admin"), adminRateLimit, getAdvertisementById);
router.post("/", protect, authorize("admin"), adminRateLimit, createAdvertisement);
router.put("/:id", protect, authorize("admin"), adminRateLimit, updateAdvertisement);
router.patch("/:id/toggle", protect, authorize("admin"), adminRateLimit, toggleAdvertisement);
router.delete("/:id", protect, authorize("admin"), adminRateLimit, deleteAdvertisement);

export default router;


import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import {
  createNews,
  deleteNews,
  getAdminNews,
  getNewsBySlug,
  getPublicNews,
  updateNews,
} from "../controllers/newsController";

const router = Router();

// Admin routes
router.post("/", protect, authorize("admin"), adminRateLimit, createNews);
router.get(
  "/admin/list",
  protect,
  authorize("admin"),
  adminRateLimit,
  getAdminNews
);
router.put(
  "/admin/:id",
  protect,
  authorize("admin"),
  adminRateLimit,
  updateNews
);
router.delete(
  "/admin/:id",
  protect,
  authorize("admin"),
  adminRateLimit,
  deleteNews
);

// Public routes
router.get("/", generalRateLimit, getPublicNews);
router.get("/:slug", generalRateLimit, getNewsBySlug);

export default router;


import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import {
  getComplaintSettings,
  updateComplaintSettings,
} from "../controllers/complaintSettingsController";
import {
  createComplaintRequest,
  getComplaintRequests,
  updateComplaintRequest,
} from "../controllers/complaintController";

const router = Router();

router.get("/", generalRateLimit, getComplaintSettings);
router.put(
  "/",
  protect,
  authorize("admin"),
  adminRateLimit,
  updateComplaintSettings
);

router.post("/requests", generalRateLimit, createComplaintRequest);
router.get(
  "/requests",
  protect,
  authorize("admin"),
  adminRateLimit,
  getComplaintRequests
);
router.patch(
  "/requests/:id",
  protect,
  authorize("admin"),
  adminRateLimit,
  updateComplaintRequest
);

export default router;



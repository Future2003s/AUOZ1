import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import {
  getComplaintSettings,
  updateComplaintSettings,
} from "../controllers/complaintSettingsController";

const router = Router();

router.get("/", generalRateLimit, getComplaintSettings);
router.put("/", protect, authorize("admin"), adminRateLimit, updateComplaintSettings);

export default router;



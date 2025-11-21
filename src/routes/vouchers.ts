import { Router } from "express";
import { protect, authorize, optionalAuth } from "../middleware/auth";
import {
    applyVoucher,
    createVoucher,
    deleteVoucher,
    getVoucher,
    getVouchers,
    updateVoucher
} from "../controllers/voucherController";

const router = Router();

router.post("/apply", optionalAuth, applyVoucher);

router.route("/")
    .get(protect, authorize("admin"), getVouchers)
    .post(protect, authorize("admin"), createVoucher);

router.route("/:id")
    .get(protect, authorize("admin"), getVoucher)
    .put(protect, authorize("admin"), updateVoucher)
    .delete(protect, authorize("admin"), deleteVoucher);

export default router;


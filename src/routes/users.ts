import { Router } from "express";
import { protect } from "../middleware/auth";
import { validateAddress, validateUserId } from "../middleware/unifiedValidation";
import { uploadAvatar as uploadAvatarMiddleware } from "../middleware/upload";
import {
    getProfile,
    updateProfile,
    deleteAccount,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    uploadAvatar
} from "../controllers/userController";

const router = Router();

// All routes require authentication
router.use(protect);

// Profile management
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/avatar", uploadAvatarMiddleware, uploadAvatar);
router.delete("/account", deleteAccount);

// Address management
router.get("/addresses", getAddresses);
router.post("/addresses", validateAddress, addAddress);
router.put("/addresses/:addressId", validateUserId, validateAddress, updateAddress);
router.delete("/addresses/:addressId", validateUserId, deleteAddress);
router.put("/addresses/:addressId/default", validateUserId, setDefaultAddress);

export default router;

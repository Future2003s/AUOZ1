import { Router } from "express";
import {
    getAllPastoralImages,
    createPastoralImage,
    updatePastoralImage,
    deletePastoralImage
} from "../controllers/pastoralController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", getAllPastoralImages);

// Protected routes
router.use(protect);
router.use(authorize("admin", "staff", "employee"));

router.post("/", createPastoralImage);
router.put("/:id", updatePastoralImage);
router.delete("/:id", deletePastoralImage);

export default router;

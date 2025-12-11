import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    getAllInvoices,
    getInvoice,
    createInvoice,
    issueInvoice,
    remindInvoice,
    uploadInvoiceFile,
    updateInvoice
} from "../controllers/invoiceController";
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
router.get("/", getAllInvoices);
router.get("/:id", getInvoice);
router.post("/", createInvoice);
router.put("/:id", updateInvoice);
router.put("/:id/issue", issueInvoice);
router.put("/:id/remind", remindInvoice);
router.post("/:id/upload", uploadProductImage, uploadInvoiceFile);

export default router;


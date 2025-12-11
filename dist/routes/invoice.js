"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const invoiceController_1 = require("../controllers/invoiceController");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes require authentication and employee/admin role
router.use(auth_1.protect);
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
router.get("/", invoiceController_1.getAllInvoices);
router.get("/:id", invoiceController_1.getInvoice);
router.post("/", invoiceController_1.createInvoice);
router.put("/:id", invoiceController_1.updateInvoice);
router.put("/:id/issue", invoiceController_1.issueInvoice);
router.put("/:id/remind", invoiceController_1.remindInvoice);
router.post("/:id/upload", upload_1.uploadProductImage, invoiceController_1.uploadInvoiceFile);
exports.default = router;

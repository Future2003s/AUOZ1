import { Request, Response, NextFunction } from "express";
import { purchaseService } from "../services/purchaseService";

const envelope = <T>(data: T, meta?: Record<string, unknown>) => ({
    success: true,
    data,
    meta: meta ?? null,
    errors: null,
});

type AuthRequest = Request & { user?: { id: string } };

export const purchaseController = {
    // ─── Purchase Requisitions ─────────────────────────────────────────

    async listPRs(req: Request, res: Response, next: NextFunction) {
        try {
            const { PurchaseRequisition } = await import("../models/PurchaseRequisition.js");
            const { page = "1", limit = "20", status } = req.query as Record<string, string>;
            const filter: Record<string, unknown> = { isDeleted: false };
            if (status) filter.status = status;

            const pageNum = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

            const [prs, total] = await Promise.all([
                PurchaseRequisition.find(filter)
                    .populate("requestedBy", "name email")
                    .populate("approvedBy", "name email")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),
                PurchaseRequisition.countDocuments(filter),
            ]);

            res.json(envelope(prs, { total, page: pageNum, limit: limitNum }));
        } catch (err) {
            next(err);
        }
    },

    async createPR(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }

            const { lines, neededBy, note } = req.body;
            if (!lines?.length) {
                res.status(400).json({ success: false, errors: "At least one line item is required" });
                return;
            }

            const pr = await purchaseService.createPR({ lines, neededBy, note, userId });
            res.status(201).json(envelope(pr));
        } catch (err) {
            next(err);
        }
    },

    async approvePR(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }
            const approve = req.body.approve !== false;
            const pr = await purchaseService.approvePR(req.params.id, userId, approve, req.body.reason);
            res.json(envelope(pr));
        } catch (err) {
            next(err);
        }
    },

    // ─── Purchase Orders ───────────────────────────────────────────────

    async listPOs(req: Request, res: Response, next: NextFunction) {
        try {
            const { PurchaseOrder } = await import("../models/PurchaseOrder.js");
            const { page = "1", limit = "20", status, vendorId } = req.query as Record<string, string>;
            const filter: Record<string, unknown> = { isDeleted: false };
            if (status) filter.status = status;
            if (vendorId) filter.vendorId = vendorId;

            const pageNum = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

            const [pos, total] = await Promise.all([
                PurchaseOrder.find(filter)
                    .populate("vendorId", "name code")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),
                PurchaseOrder.countDocuments(filter),
            ]);

            res.json(envelope(pos, { total, page: pageNum, limit: limitNum }));
        } catch (err) {
            next(err);
        }
    },

    async getPO(req: Request, res: Response, next: NextFunction) {
        try {
            const { PurchaseOrder, PurchaseOrderLine } = await import("../models/PurchaseOrder.js");
            const po = await PurchaseOrder.findOne({ _id: req.params.id, isDeleted: false })
                .populate("vendorId", "name code currency paymentTermsDays")
                .populate("approvedBy", "name email")
                .lean();
            if (!po) { res.status(404).json({ success: false, errors: "PO not found" }); return; }

            const lines = await PurchaseOrderLine.find({ poId: req.params.id, isDeleted: false })
                .populate("itemId", "name sku unit")
                .populate("uomId", "code name")
                .lean();

            res.json(envelope({ ...po, lines }));
        } catch (err) {
            next(err);
        }
    },

    async createPO(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }

            const { vendorId, lines } = req.body;
            if (!vendorId || !lines?.length) {
                res.status(400).json({ success: false, errors: "vendorId and at least one line are required" });
                return;
            }

            const po = await purchaseService.createPO({ ...req.body, userId });
            res.status(201).json(envelope(po));
        } catch (err) {
            next(err);
        }
    },

    async approvePO(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }
            const { PurchaseOrder } = await import("../models/PurchaseOrder.js");
            const po = await PurchaseOrder.findById(req.params.id);
            if (!po) { res.status(404).json({ success: false, errors: "PO not found" }); return; }
            if (po.status !== "PENDING_APPROVAL") {
                res.status(400).json({ success: false, errors: `Cannot approve PO in status: ${po.status}` });
                return;
            }
            po.status = "APPROVED";
            po.approvedBy = (req as AuthRequest & { user: { id: string } }).user.id as unknown as typeof po.approvedBy;
            po.approvedAt = new Date();
            await po.save();
            res.json(envelope(po));
        } catch (err) {
            next(err);
        }
    },

    // ─── Goods Receipts ────────────────────────────────────────────────

    async listGRs(req: Request, res: Response, next: NextFunction) {
        try {
            const { GoodsReceipt } = await import("../models/GoodsReceipt.js");
            const { page = "1", limit = "20", poId } = req.query as Record<string, string>;
            const filter: Record<string, unknown> = { isDeleted: false };
            if (poId) filter.poId = poId;

            const pageNum = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

            const [grs, total] = await Promise.all([
                GoodsReceipt.find(filter)
                    .populate("poId", "poNo")
                    .populate("vendorId", "name code")
                    .sort({ receivedDate: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),
                GoodsReceipt.countDocuments(filter),
            ]);
            res.json(envelope(grs, { total, page: pageNum, limit: limitNum }));
        } catch (err) {
            next(err);
        }
    },

    async receiveGoods(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }

            const { poId, lines } = req.body;
            if (!poId || !lines?.length) {
                res.status(400).json({ success: false, errors: "poId and lines are required" });
                return;
            }

            const gr = await purchaseService.receiveGoods({ ...req.body, userId });
            res.status(201).json(envelope(gr));
        } catch (err) {
            next(err);
        }
    },

    async threeWayMatch(req: Request, res: Response, next: NextFunction) {
        try {
            const { poId, grId, invoiceLines } = req.body;
            if (!poId || !grId || !invoiceLines?.length) {
                res.status(400).json({ success: false, errors: "poId, grId, and invoiceLines are required" });
                return;
            }
            const result = await purchaseService.threeWayMatch(poId, grId, invoiceLines);
            res.json(envelope(result));
        } catch (err) {
            next(err);
        }
    },
};

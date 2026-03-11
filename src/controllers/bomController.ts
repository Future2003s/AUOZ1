import { Request, Response, NextFunction } from "express";
import { bomService, CreateBomInput, BomLineInput } from "../services/bomService";

/** Standard response envelope */
const envelope = <T>(data: T, meta?: Record<string, unknown>) => ({
    success: true,
    data,
    meta: meta ?? null,
    errors: null,
});

export const bomController = {
    /**
     * GET /api/v1/boms
     * List BOMs with filter and pagination.
     */
    async listBoms(req: Request, res: Response, next: NextFunction) {
        try {
            const { page = "1", limit = "20", status, productId } = req.query as Record<string, string>;
            const { BomHeader } = await import("../models/BomHeader.js");
            const { Inventory } = await import("../models/Inventory.js");

            const filter: Record<string, unknown> = { isDeleted: false };
            if (status) filter.status = status;
            if (productId) filter.productId = productId;

            const pageNum = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

            const [boms, total] = await Promise.all([
                BomHeader.find(filter)
                    .populate("productId", "name sku")
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean(),
                BomHeader.countDocuments(filter),
            ]);

            res.json(
                envelope(boms, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) })
            );
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/v1/boms
     * Create new BOM.
     */
    async createBom(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as Request & { user?: { id: string } }).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, errors: "Unauthorized" });
                return;
            }

            const input: CreateBomInput = {
                productId: req.body.productId,
                description: req.body.description,
                effectivityStart: req.body.effectivityStart ? new Date(req.body.effectivityStart) : undefined,
                effectivityEnd: req.body.effectivityEnd ? new Date(req.body.effectivityEnd) : undefined,
                outputQty: req.body.outputQty ?? 1,
                outputUomId: req.body.outputUomId,
                lines: (req.body.lines ?? []) as BomLineInput[],
                userId,
            };

            if (!input.productId || !input.outputUomId) {
                res.status(400).json({ success: false, errors: "productId and outputUomId are required" });
                return;
            }

            const bom = await bomService.createBom(input);
            res.status(201).json(envelope(bom));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/boms/:id
     * BOM detail with lines.
     */
    async getBom(req: Request, res: Response, next: NextFunction) {
        try {
            const { BomHeader } = await import("../models/BomHeader.js");
            const { BomLine } = await import("../models/BomLine.js");

            const bom = await BomHeader.findOne({
                _id: req.params.id,
                isDeleted: false,
            })
                .populate("productId", "name sku unit")
                .populate("outputUomId", "code name")
                .lean();

            if (!bom) {
                res.status(404).json({ success: false, errors: "BOM not found" });
                return;
            }

            const lines = await BomLine.find({ bomId: req.params.id, isDeleted: false })
                .populate("componentId", "name sku unit")
                .populate("uomId", "code name")
                .sort({ level: 1, sortOrder: 1 })
                .lean();

            res.json(envelope({ ...bom, lines }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * PUT /api/v1/boms/:id/status
     * Change BOM status (DRAFT → ACTIVE, ACTIVE → OBSOLETE, etc.).
     */
    async changeStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as Request & { user?: { id: string } }).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, errors: "Unauthorized" });
                return;
            }
            const { status, reason } = req.body;
            if (!status) {
                res.status(400).json({ success: false, errors: "status is required" });
                return;
            }
            const bom = await bomService.changeBomStatus(req.params.id, status, userId, reason);
            res.json(envelope(bom));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/boms/:id/explosion
     * Flat material requirements list.
     */
    async getExplosion(req: Request, res: Response, next: NextFunction) {
        try {
            const qty = parseFloat((req.query.qty as string) ?? "1");
            const requirements = await bomService.explodeBomFlat(req.params.id, qty);
            const totalCostCents = requirements.reduce((s, r) => s + r.totalCostCents, 0);
            const hasShortage = requirements.some((r) => r.shortage > 0);
            res.json(envelope(requirements, { qty, totalCostCents, hasShortage, count: requirements.length }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/boms/:id/tree
     * Recursive BOM tree (for BOMTreeViewer component).
     */
    async getTree(req: Request, res: Response, next: NextFunction) {
        try {
            const qty = parseFloat((req.query.qty as string) ?? "1");
            const tree = await bomService.explodeBomTree(req.params.id, qty);
            res.json(envelope(tree, { qty }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/items/:itemId/where-used
     * Find all BOMs that use a given item as a component.
     */
    async whereUsed(req: Request, res: Response, next: NextFunction) {
        try {
            const boms = await bomService.whereUsed(req.params.itemId);
            res.json(envelope(boms, { count: boms.length }));
        } catch (err) {
            next(err);
        }
    },
};

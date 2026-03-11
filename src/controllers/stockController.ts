import { Request, Response, NextFunction } from "express";
import { stockService } from "../services/stockService";
import { MovementType } from "../models/StockLedger";

const envelope = <T>(data: T, meta?: Record<string, unknown>) => ({
    success: true,
    data,
    meta: meta ?? null,
    errors: null,
});

type AuthRequest = Request & { user?: { id: string } };

const VALID_MOVEMENT_TYPES: MovementType[] = [
    "RECEIPT", "ISSUE", "TRANSFER_IN", "TRANSFER_OUT",
    "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RETURN_IN", "RETURN_OUT",
    "OPENING", "SCRAP",
];

export const stockController = {
    /**
     * POST /api/v1/stock-movements
     * Record any stock movement through the ledger.
     */
    async recordMovement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user?.id;
            if (!userId) { res.status(401).json({ success: false, errors: "Unauthorized" }); return; }

            const { itemId, locationId, warehouseId, movementType, qty, unitCostCents, uomId, lotId, note } = req.body;

            if (!itemId || !locationId || !warehouseId || !movementType || qty == null || !uomId) {
                res.status(400).json({
                    success: false,
                    errors: "itemId, locationId, warehouseId, movementType, qty, uomId are required",
                });
                return;
            }

            if (!VALID_MOVEMENT_TYPES.includes(movementType as MovementType)) {
                res.status(400).json({ success: false, errors: `Invalid movementType: ${movementType}` });
                return;
            }

            if (typeof qty !== "number" || qty <= 0) {
                res.status(400).json({ success: false, errors: "qty must be a positive number" });
                return;
            }

            const entry = await stockService.recordMovement({
                itemId, locationId, warehouseId,
                movementType: movementType as MovementType,
                qty, unitCostCents: unitCostCents ?? 0, uomId,
                lotId, note, userId,
            });

            res.status(201).json(envelope(entry));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/stock-movements
     * Movement history for an item.
     */
    async getMovements(req: Request, res: Response, next: NextFunction) {
        try {
            const { itemId, locationId, page = "1", limit = "20" } = req.query as Record<string, string>;

            if (!itemId) {
                res.status(400).json({ success: false, errors: "itemId query param is required" });
                return;
            }

            const result = await stockService.getMovementHistory(itemId, {
                page: parseInt(page, 10),
                limit: Math.min(100, parseInt(limit, 10)),
                locationId,
            });

            res.json(envelope(result.entries, { total: result.total, page: result.page, limit: result.limit }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/items/:id/stock
     * Current stock summary for an item across all locations.
     */
    async getItemStock(req: Request, res: Response, next: NextFunction) {
        try {
            const summary = await stockService.getStockSummary(req.params.id);
            res.json(envelope(summary));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/items/:id/fifo-value
     * FIFO valuation for an item.
     */
    async getFIFOValue(req: Request, res: Response, next: NextFunction) {
        try {
            const valuation = await stockService.calculateFIFOValue(req.params.id);
            res.json(envelope(valuation));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/warehouses
     */
    async listWarehouses(req: Request, res: Response, next: NextFunction) {
        try {
            const { Warehouse } = await import("../models/Warehouse.js");
            const { isActive } = req.query as Record<string, string>;
            const filter: Record<string, unknown> = { isDeleted: false };
            if (isActive !== undefined) filter.isActive = isActive === "true";

            const warehouses = await Warehouse.find(filter).sort({ isDefault: -1, name: 1 }).lean();
            res.json(envelope(warehouses, { count: warehouses.length }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/warehouses/:id/locations
     */
    async listLocations(req: Request, res: Response, next: NextFunction) {
        try {
            const { WarehouseLocation } = await import("../models/WarehouseLocation.js");
            const locations = await WarehouseLocation.find({
                warehouseId: req.params.id,
                isDeleted: false,
                isActive: true,
            })
                .sort({ code: 1 })
                .lean();
            res.json(envelope(locations, { count: locations.length }));
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/v1/stock-snapshots
     * Low-stock query: items where qtyAvailable < item.minStock.
     */
    async getLowStock(req: Request, res: Response, next: NextFunction) {
        try {
            const { StockSnapshot } = await import("../models/StockSnapshot.js");
            const { Inventory } = await import("../models/Inventory.js");

            // Get all items with minStock
            const items = await Inventory.find({ isDeleted: false }, { _id: 1, name: 1, sku: 1, minStock: 1 }).lean();
            const itemIds = items.map((i) => i._id);

            // Get snapshots for those items
            const snapshots = await StockSnapshot.find({ itemId: { $in: itemIds } })
                .populate("locationId", "code name")
                .lean();

            // Group by item and find low stock
            const stockByItem = new Map<string, number>();
            snapshots.forEach((s) => {
                const id = s.itemId.toString();
                stockByItem.set(id, (stockByItem.get(id) ?? 0) + s.qtyAvailable);
            });

            const lowStock = items
                .map((item) => ({
                    itemId: item._id,
                    name: item.name,
                    sku: (item as { sku?: string }).sku,
                    minStock: item.minStock,
                    qtyAvailable: stockByItem.get(item._id.toString()) ?? 0,
                }))
                .filter((i) => i.qtyAvailable < i.minStock)
                .sort((a, b) => a.qtyAvailable - b.qtyAvailable);

            res.json(envelope(lowStock, { count: lowStock.length }));
        } catch (err) {
            next(err);
        }
    },
};

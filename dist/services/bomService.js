"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bomService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BomHeader_1 = require("../models/BomHeader");
const BomLine_1 = require("../models/BomLine");
const BomChangeLog_1 = require("../models/BomChangeLog");
const StockSnapshot_1 = require("../models/StockSnapshot");
const Inventory_1 = require("../models/Inventory");
const DocumentSequence_1 = require("../models/DocumentSequence");
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [new winston_1.default.transports.Console()],
});
exports.bomService = {
    /**
     * Create a new BOM with version auto-increment.
     * Validates: product must exist, all component items must exist,
     * no item can reference itself (circular detected 1 level up).
     */
    async createBom(input) {
        const { productId, description, effectivityStart, effectivityEnd, outputQty = 1, outputUomId, lines, userId } = input;
        // Validate product exists
        const product = await Inventory_1.Inventory.findById(productId);
        if (!product) {
            throw Object.assign(new Error("Product item not found"), { statusCode: 404 });
        }
        // Validate no component equals product (direct self-reference)
        for (const line of lines) {
            if (line.componentId === productId) {
                throw Object.assign(new Error(`Component ${line.componentId} cannot be the same as the product (circular reference)`), { statusCode: 400, code: "BOM_CIRCULAR_REF" });
            }
        }
        // Get next version for this product
        const latestBom = await BomHeader_1.BomHeader.findOne({ productId: new mongoose_1.default.Types.ObjectId(productId), isDeleted: false }, { version: 1 }, { sort: { version: -1 } });
        const nextVersion = (latestBom?.version ?? 0) + 1;
        // Generate BOM number
        const bomNo = await DocumentSequence_1.DocumentSequence.nextNumber("BOM", undefined, 4);
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const [bom] = await BomHeader_1.BomHeader.create([
                {
                    bomNo,
                    productId: new mongoose_1.default.Types.ObjectId(productId),
                    version: nextVersion,
                    status: "DRAFT",
                    description,
                    effectivityStart,
                    effectivityEnd,
                    outputQty,
                    outputUomId: new mongoose_1.default.Types.ObjectId(outputUomId),
                    createdBy: new mongoose_1.default.Types.ObjectId(userId),
                },
            ], { session });
            // Create BOM lines
            if (lines.length > 0) {
                await BomLine_1.BomLine.insertMany(lines.map((l, idx) => ({
                    bomId: bom._id,
                    parentLineId: l.parentLineId ? new mongoose_1.default.Types.ObjectId(l.parentLineId) : null,
                    componentId: new mongoose_1.default.Types.ObjectId(l.componentId),
                    qty: l.qty,
                    uomId: new mongoose_1.default.Types.ObjectId(l.uomId),
                    scrapBps: l.scrapBps ?? 0,
                    level: 1, // will be recalculated on explosion
                    sortOrder: l.sortOrder ?? idx,
                    createdBy: new mongoose_1.default.Types.ObjectId(userId),
                })), { session });
            }
            // Recalculate levels (needed if parentLineId provided)
            await this._recalculateLevels(bom._id.toString(), session);
            // Write audit log
            await BomChangeLog_1.BomChangeLog.create([
                {
                    bomId: bom._id,
                    action: "CREATED",
                    newValue: { bomNo, productId, version: nextVersion, linesCount: lines.length },
                    changedBy: new mongoose_1.default.Types.ObjectId(userId),
                },
            ], { session });
            await session.commitTransaction();
            session.endSession();
            logger.info("BOM created", { bomId: bom._id, bomNo, productId, version: nextVersion });
            return bom;
        }
        catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },
    /**
     * Explode a BOM into a recursive tree of BomNodes.
     * Supports infinite depth via DFS with cycle detection.
     */
    async explodeBomTree(bomId, topQty = 1) {
        const bom = await BomHeader_1.BomHeader.findById(bomId);
        if (!bom || bom.isDeleted) {
            throw Object.assign(new Error("BOM not found"), { statusCode: 404 });
        }
        const allLines = await BomLine_1.BomLine.find({ bomId: new mongoose_1.default.Types.ObjectId(bomId), isDeleted: false }, null, { sort: { sortOrder: 1 } })
            .populate("componentId", "name sku minStock")
            .populate("uomId", "code")
            .lean();
        // Detect circular references before building tree
        this._detectCircularRef(allLines);
        // Build tree recursively
        const buildNodes = async (parentLineId, multiplier, visited) => {
            const levelLines = allLines.filter((l) => (parentLineId === null && l.parentLineId === null) ||
                l.parentLineId?.toString() === parentLineId);
            const nodes = [];
            for (const line of levelLines) {
                const comp = line.componentId;
                const uom = line.uomId;
                const lineId = line._id.toString();
                const compId = comp._id.toString();
                if (visited.has(compId))
                    continue; // skip circular
                const visitedBranch = new Set(visited).add(compId);
                const scrapFactor = 1 + line.scrapBps / 10000;
                const effectiveQty = line.qty * scrapFactor * multiplier;
                // Get stock for this component
                const snapshots = await StockSnapshot_1.StockSnapshot.find({ itemId: comp._id }, { qtyOnHand: 1, qtyAvailable: 1 }).lean();
                const stockOnHand = snapshots.reduce((s, sn) => s + sn.qtyOnHand, 0);
                const stockAvailable = snapshots.reduce((s, sn) => s + sn.qtyAvailable, 0);
                let stockStatus;
                if (stockAvailable <= 0)
                    stockStatus = "OUT";
                else if (stockAvailable < effectiveQty)
                    stockStatus = "LOW";
                else
                    stockStatus = "OK";
                const unitCost = line.unitCostCents;
                const totalCost = Math.round(effectiveQty * unitCost);
                const children = await buildNodes(lineId, effectiveQty / topQty, visitedBranch);
                nodes.push({
                    id: `${bomId}-${lineId}`,
                    lineId,
                    itemId: compId,
                    itemName: comp.name,
                    sku: comp.sku,
                    qty: line.qty,
                    effectiveQty,
                    uomCode: uom?.code ?? "",
                    level: line.level,
                    scrapPct: line.scrapBps / 10000,
                    unitCostCents: unitCost,
                    totalCostCents: totalCost,
                    stockOnHand,
                    stockAvailable,
                    stockStatus,
                    children,
                });
            }
            return nodes;
        };
        return buildNodes(null, topQty, new Set());
    },
    /**
     * Flatten BOM explosion into material requirements list.
     * Aggregates same item across multiple levels.
     */
    async explodeBomFlat(bomId, qty = 1) {
        const tree = await this.explodeBomTree(bomId, qty);
        const aggregated = new Map();
        const flatten = (nodes) => {
            for (const node of nodes) {
                // Only include leaf nodes (raw materials) in flat explosion
                const isLeaf = node.children.length === 0;
                if (isLeaf) {
                    const existing = aggregated.get(node.itemId);
                    if (existing) {
                        existing.totalQtyRequired += node.effectiveQty;
                        existing.shortage = Math.max(0, existing.totalQtyRequired - existing.stockAvailable);
                        existing.totalCostCents += node.totalCostCents;
                    }
                    else {
                        aggregated.set(node.itemId, {
                            itemId: node.itemId,
                            itemName: node.itemName,
                            sku: node.sku,
                            uomCode: node.uomCode,
                            totalQtyRequired: node.effectiveQty,
                            stockAvailable: node.stockAvailable,
                            shortage: Math.max(0, node.effectiveQty - node.stockAvailable),
                            unitCostCents: node.unitCostCents,
                            totalCostCents: node.totalCostCents,
                        });
                    }
                }
                if (node.children.length > 0) {
                    flatten(node.children);
                }
            }
        };
        flatten(tree);
        return Array.from(aggregated.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
    },
    /**
     * Find all BOMs that use a given component item.
     */
    async whereUsed(componentId) {
        const lines = await BomLine_1.BomLine.find({ componentId: new mongoose_1.default.Types.ObjectId(componentId), isDeleted: false }, { bomId: 1 }).lean();
        const bomIds = [...new Set(lines.map((l) => l.bomId.toString()))];
        const boms = await BomHeader_1.BomHeader.find({ _id: { $in: bomIds }, isDeleted: false }, { bomNo: 1, productId: 1, version: 1, status: 1 })
            .populate("productId", "name sku")
            .lean();
        return boms.map((b) => ({
            ...b,
            usageCount: lines.filter((l) => l.bomId.toString() === b._id.toString()).length,
        }));
    },
    /**
     * Change BOM status. Creates a new version on ACTIVE → edit flow.
     */
    async changeBomStatus(bomId, newStatus, userId, reason) {
        const bom = await BomHeader_1.BomHeader.findById(bomId);
        if (!bom || bom.isDeleted) {
            throw Object.assign(new Error("BOM not found"), { statusCode: 404 });
        }
        const prevStatus = bom.status;
        bom.status = newStatus;
        bom.updatedBy = new mongoose_1.default.Types.ObjectId(userId);
        await bom.save();
        await BomChangeLog_1.BomChangeLog.create({
            bomId: bom._id,
            action: "STATUS_CHANGED",
            previousValue: { status: prevStatus },
            newValue: { status: newStatus },
            reason,
            changedBy: new mongoose_1.default.Types.ObjectId(userId),
        });
        return bom;
    },
    /**
     * DFS circular reference detection.
     * Throws if an item appears as both ancestor and descendant.
     */
    _detectCircularRef(lines) {
        const lineMap = new Map();
        lines.forEach((l) => lineMap.set(l._id.toString(), l));
        const parentMap = new Map();
        lines.forEach((l) => {
            parentMap.set(l._id.toString(), l.parentLineId?.toString() ?? null);
        });
        const getAncestorComponents = (lineId, visited) => {
            if (visited.has(lineId))
                return visited;
            visited.add(lineId);
            const parentId = parentMap.get(lineId);
            if (parentId) {
                const parentLine = lineMap.get(parentId);
                if (parentLine) {
                    visited.add(parentLine.componentId.toString());
                    getAncestorComponents(parentId, visited);
                }
            }
            return visited;
        };
        for (const line of lines) {
            const ancestors = getAncestorComponents(line._id.toString(), new Set());
            ancestors.delete(line._id.toString()); // remove self
            if (ancestors.has(line.componentId.toString())) {
                throw Object.assign(new Error(`Circular reference detected for component ${line.componentId}`), { statusCode: 400, code: "BOM_CIRCULAR_REF" });
            }
        }
    },
    /**
     * Recalculate level numbers for all lines in a BOM (BFS traversal).
     */
    async _recalculateLevels(bomId, session) {
        const lines = await BomLine_1.BomLine.find({ bomId: new mongoose_1.default.Types.ObjectId(bomId), isDeleted: false }, null, {
            session,
        }).lean();
        const levelMap = new Map();
        const queue = lines.filter((l) => !l.parentLineId);
        queue.forEach((l) => levelMap.set(l._id.toString(), 1));
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current._id.toString()))
                continue;
            visited.add(current._id.toString());
            const children = lines.filter((l) => l.parentLineId?.toString() === current._id.toString());
            children.forEach((c) => {
                levelMap.set(c._id.toString(), (levelMap.get(current._id.toString()) ?? 1) + 1);
                queue.push(c);
            });
        }
        // Batch update levels
        const ops = Array.from(levelMap.entries()).map(([id, level]) => ({
            updateOne: {
                filter: { _id: new mongoose_1.default.Types.ObjectId(id) },
                update: { $set: { level } },
            },
        }));
        if (ops.length > 0) {
            await BomLine_1.BomLine.bulkWrite(ops, { session });
        }
    },
};

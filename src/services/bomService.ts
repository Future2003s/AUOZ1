import mongoose from "mongoose";
import { BomHeader, IBomHeader, BomStatus } from "../models/BomHeader";
import { BomLine, IBomLine } from "../models/BomLine";
import { BomChangeLog } from "../models/BomChangeLog";
import { StockSnapshot } from "../models/StockSnapshot";
import { Inventory } from "../models/Inventory";
import { DocumentSequence } from "../models/DocumentSequence";
import winston from "winston";

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()],
});

export interface BomLineInput {
    parentLineId?: string;
    componentId: string;
    qty: number;
    uomId: string;
    scrapBps?: number;
    sortOrder?: number;
    note?: string;
}

export interface CreateBomInput {
    productId: string;
    description?: string;
    effectivityStart?: Date;
    effectivityEnd?: Date;
    outputQty?: number;
    outputUomId: string;
    lines: BomLineInput[];
    userId: string;
}

export interface BomNode {
    id: string;
    lineId: string;
    itemId: string;
    itemName: string;
    sku: string | undefined;
    qty: number;
    effectiveQty: number;      // qty × (1 + scrapBps/10000)
    uomCode: string;
    level: number;
    scrapPct: number;          // decimal e.g. 0.05 = 5%
    unitCostCents: number;
    totalCostCents: number;
    stockOnHand: number;
    stockAvailable: number;
    stockStatus: "OK" | "LOW" | "OUT";
    children: BomNode[];
}

export interface MaterialRequirement {
    itemId: string;
    itemName: string;
    sku: string | undefined;
    uomCode: string;
    totalQtyRequired: number;
    stockAvailable: number;
    shortage: number;
    unitCostCents: number;
    totalCostCents: number;
}

export const bomService = {
    /**
     * Create a new BOM with version auto-increment.
     * Validates: product must exist, all component items must exist,
     * no item can reference itself (circular detected 1 level up).
     */
    async createBom(input: CreateBomInput): Promise<IBomHeader> {
        const { productId, description, effectivityStart, effectivityEnd,
            outputQty = 1, outputUomId, lines, userId } = input;

        // Validate product exists
        const product = await Inventory.findById(productId);
        if (!product) {
            throw Object.assign(new Error("Product item not found"), { statusCode: 404 });
        }

        // Validate no component equals product (direct self-reference)
        for (const line of lines) {
            if (line.componentId === productId) {
                throw Object.assign(
                    new Error(`Component ${line.componentId} cannot be the same as the product (circular reference)`),
                    { statusCode: 400, code: "BOM_CIRCULAR_REF" }
                );
            }
        }

        // Get next version for this product
        const latestBom = await BomHeader.findOne(
            { productId: new mongoose.Types.ObjectId(productId), isDeleted: false },
            { version: 1 },
            { sort: { version: -1 } }
        );
        const nextVersion = (latestBom?.version ?? 0) + 1;

        // Generate BOM number
        const bomNo = await DocumentSequence.nextNumber("BOM", undefined, 4);

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const [bom] = await BomHeader.create(
                [
                    {
                        bomNo,
                        productId: new mongoose.Types.ObjectId(productId),
                        version: nextVersion,
                        status: "DRAFT" as BomStatus,
                        description,
                        effectivityStart,
                        effectivityEnd,
                        outputQty,
                        outputUomId: new mongoose.Types.ObjectId(outputUomId),
                        createdBy: new mongoose.Types.ObjectId(userId),
                    },
                ],
                { session }
            );

            // Create BOM lines
            if (lines.length > 0) {
                await BomLine.insertMany(
                    lines.map((l, idx) => ({
                        bomId: bom._id,
                        parentLineId: l.parentLineId ? new mongoose.Types.ObjectId(l.parentLineId) : null,
                        componentId: new mongoose.Types.ObjectId(l.componentId),
                        qty: l.qty,
                        uomId: new mongoose.Types.ObjectId(l.uomId),
                        scrapBps: l.scrapBps ?? 0,
                        level: 1,                  // will be recalculated on explosion
                        sortOrder: l.sortOrder ?? idx,
                        createdBy: new mongoose.Types.ObjectId(userId),
                    })),
                    { session }
                );
            }

            // Recalculate levels (needed if parentLineId provided)
            await this._recalculateLevels((bom as any)._id.toString(), session);

            // Write audit log
            await BomChangeLog.create(
                [
                    {
                        bomId: (bom as typeof bom & { _id: mongoose.Types.ObjectId })._id,
                        action: "CREATED",
                        newValue: { bomNo, productId, version: nextVersion, linesCount: lines.length },
                        changedBy: new mongoose.Types.ObjectId(userId),
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            logger.info("BOM created", { bomId: bom._id, bomNo, productId, version: nextVersion });
            return bom;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },

    /**
     * Explode a BOM into a recursive tree of BomNodes.
     * Supports infinite depth via DFS with cycle detection.
     */
    async explodeBomTree(bomId: string, topQty = 1): Promise<BomNode[]> {
        const bom = await BomHeader.findById(bomId);
        if (!bom || bom.isDeleted) {
            throw Object.assign(new Error("BOM not found"), { statusCode: 404 });
        }

        const allLines = await BomLine.find(
            { bomId: new mongoose.Types.ObjectId(bomId), isDeleted: false },
            null,
            { sort: { sortOrder: 1 } }
        )
            .populate("componentId", "name sku minStock")
            .populate("uomId", "code")
            .lean();

        // Detect circular references before building tree
        this._detectCircularRef(allLines as any[]);

        // Build tree recursively
        const buildNodes = async (
            parentLineId: string | null,
            multiplier: number,
            visited: Set<string>
        ): Promise<BomNode[]> => {
            const levelLines = allLines.filter(
                (l) =>
                    (parentLineId === null && l.parentLineId === null) ||
                    l.parentLineId?.toString() === parentLineId
            );

            const nodes: BomNode[] = [];
            for (const line of levelLines) {
                const comp = line.componentId as unknown as {
                    _id: mongoose.Types.ObjectId; name: string; sku?: string; minStock: number;
                };
                const uom = line.uomId as unknown as { code: string };
                const lineId = line._id.toString();
                const compId = comp._id.toString();

                if (visited.has(compId)) continue; // skip circular
                const visitedBranch = new Set(visited).add(compId);

                const scrapFactor = 1 + line.scrapBps / 10000;
                const effectiveQty = line.qty * scrapFactor * multiplier;

                // Get stock for this component
                const snapshots = await StockSnapshot.find(
                    { itemId: comp._id },
                    { qtyOnHand: 1, qtyAvailable: 1 }
                ).lean();

                const stockOnHand = snapshots.reduce((s, sn) => s + sn.qtyOnHand, 0);
                const stockAvailable = snapshots.reduce((s, sn) => s + sn.qtyAvailable, 0);

                let stockStatus: "OK" | "LOW" | "OUT";
                if (stockAvailable <= 0) stockStatus = "OUT";
                else if (stockAvailable < effectiveQty) stockStatus = "LOW";
                else stockStatus = "OK";

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

        return buildNodes(null, topQty, new Set<string>());
    },

    /**
     * Flatten BOM explosion into material requirements list.
     * Aggregates same item across multiple levels.
     */
    async explodeBomFlat(bomId: string, qty = 1): Promise<MaterialRequirement[]> {
        const tree = await this.explodeBomTree(bomId, qty);
        const aggregated = new Map<string, MaterialRequirement>();

        const flatten = (nodes: BomNode[]) => {
            for (const node of nodes) {
                // Only include leaf nodes (raw materials) in flat explosion
                const isLeaf = node.children.length === 0;
                if (isLeaf) {
                    const existing = aggregated.get(node.itemId);
                    if (existing) {
                        existing.totalQtyRequired += node.effectiveQty;
                        existing.shortage = Math.max(0, existing.totalQtyRequired - existing.stockAvailable);
                        existing.totalCostCents += node.totalCostCents;
                    } else {
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
    async whereUsed(componentId: string): Promise<(IBomHeader & { usageCount: number })[]> {
        const lines = await BomLine.find(
            { componentId: new mongoose.Types.ObjectId(componentId), isDeleted: false },
            { bomId: 1 }
        ).lean();

        const bomIds = [...new Set(lines.map((l) => l.bomId.toString()))];

        const boms = await BomHeader.find(
            { _id: { $in: bomIds }, isDeleted: false },
            { bomNo: 1, productId: 1, version: 1, status: 1 }
        )
            .populate("productId", "name sku")
            .lean();

        type BomWithId = IBomHeader & { _id: mongoose.Types.ObjectId };
        return boms.map((b) => ({
            ...(b as unknown as BomWithId),
            usageCount: lines.filter((l) => l.bomId.toString() === (b as unknown as BomWithId)._id.toString()).length,
        })) as (IBomHeader & { usageCount: number })[];
    },

    /**
     * Change BOM status. Creates a new version on ACTIVE → edit flow.
     */
    async changeBomStatus(
        bomId: string,
        newStatus: BomStatus,
        userId: string,
        reason?: string
    ): Promise<IBomHeader> {
        const bom = await BomHeader.findById(bomId);
        if (!bom || bom.isDeleted) {
            throw Object.assign(new Error("BOM not found"), { statusCode: 404 });
        }

        const prevStatus = bom.status;
        bom.status = newStatus;
        bom.updatedBy = new mongoose.Types.ObjectId(userId);
        await bom.save();

        await BomChangeLog.create({
            bomId: bom._id,
            action: "STATUS_CHANGED",
            previousValue: { status: prevStatus },
            newValue: { status: newStatus },
            reason,
            changedBy: new mongoose.Types.ObjectId(userId),
        });

        return bom;
    },

    /**
     * DFS circular reference detection.
     * Throws if an item appears as both ancestor and descendant.
     */
    _detectCircularRef(lines: any[]): void {
        const lineMap = new Map<string, any>();
        lines.forEach((l) => lineMap.set(l._id.toString(), l));

        const parentMap = new Map<string, string | null>();
        lines.forEach((l) => {
            parentMap.set(l._id.toString(), l.parentLineId?.toString() ?? null);
        });

        const getAncestorComponents = (lineId: string, visited: Set<string>): Set<string> => {
            if (visited.has(lineId)) return visited;
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
            const ancestors = getAncestorComponents(line._id.toString(), new Set<string>());
            ancestors.delete(line._id.toString()); // remove self
            if (ancestors.has(line.componentId.toString())) {
                throw Object.assign(
                    new Error(`Circular reference detected for component ${line.componentId}`),
                    { statusCode: 400, code: "BOM_CIRCULAR_REF" }
                );
            }
        }
    },

    /**
     * Recalculate level numbers for all lines in a BOM (BFS traversal).
     */
    async _recalculateLevels(bomId: string, session?: mongoose.ClientSession): Promise<void> {
        const lines = await BomLine.find({ bomId: new mongoose.Types.ObjectId(bomId), isDeleted: false }, null, {
            session,
        }).lean();

        const levelMap = new Map<string, number>();

        // BFS from root (parentLineId = null)
        type LineWithId = IBomLine & { _id: mongoose.Types.ObjectId };
        const queue = (lines as unknown as LineWithId[]).filter((l) => !l.parentLineId);
        queue.forEach((l) => levelMap.set(l._id.toString(), 1));

        const visited = new Set<string>();
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current._id.toString())) continue;
            visited.add(current._id.toString());

            const children = (lines as unknown as LineWithId[]).filter(
                (l) => l.parentLineId?.toString() === current._id.toString()
            );
            children.forEach((c) => {
                levelMap.set(c._id.toString(), (levelMap.get(current._id.toString()) ?? 1) + 1);
                queue.push(c);
            });
        }

        // Batch update levels
        const ops = Array.from(levelMap.entries()).map(([id, level]: [string, number]) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update: { $set: { level } },
            },
        }));

        if (ops.length > 0) {
            await BomLine.bulkWrite(ops, { session });
        }
    },
};

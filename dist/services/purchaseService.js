"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PurchaseRequisition_1 = require("../models/PurchaseRequisition");
const PurchaseOrder_1 = require("../models/PurchaseOrder");
const GoodsReceipt_1 = require("../models/GoodsReceipt");
const DocumentSequence_1 = require("../models/DocumentSequence");
const stockService_1 = require("./stockService");
const Vendor_1 = require("../models/Vendor");
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [new winston_1.default.transports.Console()],
});
/** 5% tolerance for 3-way match */
const THREE_WAY_MATCH_TOLERANCE_PCT = 5;
exports.purchaseService = {
    /**
     * Create Purchase Requisition with auto-generated PR number.
     */
    async createPR(input) {
        const prNo = await DocumentSequence_1.DocumentSequence.nextNumber("PR", undefined, 4);
        const totalEstimatedCents = input.lines.reduce((sum, l) => sum + l.qty * l.estimatedPriceCents, 0);
        const pr = await PurchaseRequisition_1.PurchaseRequisition.create({
            prNo,
            status: "DRAFT",
            requestedBy: new mongoose_1.default.Types.ObjectId(input.userId),
            neededBy: input.neededBy,
            note: input.note,
            lines: input.lines.map((l) => ({
                itemId: new mongoose_1.default.Types.ObjectId(l.itemId),
                description: l.description,
                qty: l.qty,
                uomId: new mongoose_1.default.Types.ObjectId(l.uomId),
                estimatedPriceCents: l.estimatedPriceCents,
                neededBy: l.neededBy,
                note: l.note,
            })),
            totalEstimatedCents,
            createdBy: new mongoose_1.default.Types.ObjectId(input.userId),
        });
        logger.info("PR created", { prNo, userId: input.userId, linesCount: input.lines.length });
        return pr;
    },
    /**
     * Approve a PR. Changes status SUBMITTED → APPROVED.
     */
    async approvePR(prId, userId, approve, reason) {
        const pr = await PurchaseRequisition_1.PurchaseRequisition.findById(prId);
        if (!pr || pr.isDeleted) {
            throw Object.assign(new Error("Purchase Requisition not found"), { statusCode: 404 });
        }
        if (pr.status !== "SUBMITTED") {
            throw Object.assign(new Error(`PR cannot be approved in status: ${pr.status}`), { statusCode: 400 });
        }
        pr.status = approve ? "APPROVED" : "REJECTED";
        if (approve) {
            pr.approvedBy = new mongoose_1.default.Types.ObjectId(userId);
            pr.approvedAt = new Date();
        }
        else {
            pr.rejectedBy = new mongoose_1.default.Types.ObjectId(userId);
            pr.rejectionReason = reason;
        }
        pr.updatedBy = new mongoose_1.default.Types.ObjectId(userId);
        await pr.save();
        return pr;
    },
    /**
     * Create a Purchase Order (optionally from PR).
     * Validates vendor exists and has sufficient credit.
     */
    async createPO(input) {
        const vendor = await Vendor_1.Vendor.findById(input.vendorId);
        if (!vendor || vendor.isDeleted || !vendor.isActive) {
            throw Object.assign(new Error("Vendor not found or inactive"), { statusCode: 404 });
        }
        const poNo = await DocumentSequence_1.DocumentSequence.nextNumber("PO", undefined, 4);
        const totalAmountCents = input.lines.reduce((sum, l) => sum + l.qty * l.unitPriceCents, 0);
        // Check vendor credit limit
        if (vendor.creditLimitCents > 0) {
            const newOutstanding = vendor.outstandingCents + totalAmountCents;
            if (newOutstanding > vendor.creditLimitCents) {
                throw Object.assign(new Error(`PO would exceed vendor credit limit. Limit: ${vendor.creditLimitCents} cents, Outstanding: ${vendor.outstandingCents} cents`), { statusCode: 400, code: "CREDIT_LIMIT_EXCEEDED" });
            }
        }
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const [po] = await PurchaseOrder_1.PurchaseOrder.create([
                {
                    poNo,
                    prId: input.prId ? new mongoose_1.default.Types.ObjectId(input.prId) : null,
                    vendorId: new mongoose_1.default.Types.ObjectId(input.vendorId),
                    status: "DRAFT",
                    currency: input.currency ?? "VND",
                    paymentTermsDays: input.paymentTermsDays ?? vendor.paymentTermsDays,
                    expectedDeliveryDate: input.expectedDeliveryDate,
                    note: input.note,
                    totalAmountCents,
                    createdBy: new mongoose_1.default.Types.ObjectId(input.userId),
                },
            ], { session });
            await PurchaseOrder_1.PurchaseOrderLine.insertMany(input.lines.map((l) => ({
                poId: po._id,
                prLineRef: l.prLineRef ? new mongoose_1.default.Types.ObjectId(l.prLineRef) : null,
                itemId: new mongoose_1.default.Types.ObjectId(l.itemId),
                description: l.description,
                qty: l.qty,
                unitPriceCents: l.unitPriceCents,
                uomId: new mongoose_1.default.Types.ObjectId(l.uomId),
                promisedDate: l.promisedDate,
                qtyReceived: 0,
                lineTotalCents: l.qty * l.unitPriceCents,
            })), { session });
            // Mark PR as converted if source PR provided
            if (input.prId) {
                await PurchaseRequisition_1.PurchaseRequisition.findByIdAndUpdate(input.prId, { status: "CONVERTED", updatedBy: new mongoose_1.default.Types.ObjectId(input.userId) }, { session });
            }
            await session.commitTransaction();
            session.endSession();
            logger.info("PO created", { poNo, vendorId: input.vendorId, totalAmountCents });
            return po;
        }
        catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },
    /**
     * Receive goods against a PO.
     * Validates: GR qty per line ≤ (PO qty − already received).
     * On confirmation, writes StockLedger entries for accepted qty.
     */
    async receiveGoods(input) {
        const po = await PurchaseOrder_1.PurchaseOrder.findById(input.poId);
        if (!po || po.isDeleted) {
            throw Object.assign(new Error("Purchase Order not found"), { statusCode: 404 });
        }
        if (!["APPROVED", "SENT", "PARTIAL"].includes(po.status)) {
            throw Object.assign(new Error(`Cannot receive against PO in status: ${po.status}`), {
                statusCode: 400,
            });
        }
        const poLines = await PurchaseOrder_1.PurchaseOrderLine.find({ poId: po._id });
        // Validate GR quantities
        for (const grLine of input.lines) {
            const poLine = poLines.find((l) => l._id.toString() === grLine.poLineId);
            if (!poLine) {
                throw Object.assign(new Error(`PO line ${grLine.poLineId} not found`), { statusCode: 404 });
            }
            const remaining = poLine.qty - poLine.qtyReceived;
            if (grLine.qtyReceived > remaining + 0.0001) {
                throw Object.assign(new Error(`GR qty (${grLine.qtyReceived}) exceeds remaining PO qty (${remaining}) for line ${grLine.poLineId}`), { statusCode: 400, code: "GR_QTY_EXCEEDS_PO" });
            }
        }
        const grNo = await DocumentSequence_1.DocumentSequence.nextNumber("GR", undefined, 4);
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const [gr] = await GoodsReceipt_1.GoodsReceipt.create([
                {
                    grNo,
                    poId: po._id,
                    vendorId: po.vendorId,
                    status: "CONFIRMED",
                    receivedDate: input.receivedDate ?? new Date(),
                    receivedBy: new mongoose_1.default.Types.ObjectId(input.userId),
                    note: input.note,
                    confirmedAt: new Date(),
                    confirmedBy: new mongoose_1.default.Types.ObjectId(input.userId),
                    createdBy: new mongoose_1.default.Types.ObjectId(input.userId),
                },
            ], { session });
            // Capture the GR id once to avoid unknown _id type on each usage
            const grId = gr._id;
            const grIdStr = grId.toString();
            // Create GR lines + update PO line receipts + write stock ledger
            for (const grLine of input.lines) {
                await GoodsReceipt_1.GoodsReceiptLine.create([
                    {
                        grId,
                        poLineId: new mongoose_1.default.Types.ObjectId(grLine.poLineId),
                        itemId: new mongoose_1.default.Types.ObjectId(grLine.itemId),
                        qtyReceived: grLine.qtyReceived,
                        qtyAccepted: grLine.qtyAccepted,
                        qtyRejected: grLine.qtyRejected,
                        uomId: new mongoose_1.default.Types.ObjectId(grLine.uomId),
                        locationId: new mongoose_1.default.Types.ObjectId(grLine.locationId),
                        lotId: grLine.lotId ? new mongoose_1.default.Types.ObjectId(grLine.lotId) : null,
                        unitCostCents: grLine.unitCostCents,
                        note: grLine.note,
                    },
                ], { session });
                // Update PO line received qty
                await PurchaseOrder_1.PurchaseOrderLine.findByIdAndUpdate(grLine.poLineId, { $inc: { qtyReceived: grLine.qtyReceived } }, { session });
                // Write stock entry for accepted qty
                if (grLine.qtyAccepted > 0) {
                    await stockService_1.stockService.recordMovement({
                        itemId: grLine.itemId,
                        locationId: grLine.locationId,
                        warehouseId: grLine.warehouseId,
                        movementType: "RECEIPT",
                        qty: grLine.qtyAccepted,
                        unitCostCents: grLine.unitCostCents,
                        uomId: grLine.uomId,
                        lotId: grLine.lotId,
                        referenceId: grIdStr,
                        referenceType: "GoodsReceipt",
                        referenceNo: grNo,
                        note: grLine.note,
                        userId: input.userId,
                        session,
                    });
                }
            }
            // Update PO status
            const updatedPoLines = await PurchaseOrder_1.PurchaseOrderLine.find({ poId: po._id }, null, { session });
            const allFullyReceived = updatedPoLines.every((l) => l.qtyReceived >= l.qty);
            const anyReceived = updatedPoLines.some((l) => l.qtyReceived > 0);
            const newPoStatus = allFullyReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status;
            await PurchaseOrder_1.PurchaseOrder.findByIdAndUpdate(po._id, { status: newPoStatus }, { session });
            await session.commitTransaction();
            session.endSession();
            logger.info("Goods received", { grNo, poId: input.poId, linesCount: input.lines.length });
            return gr;
        }
        catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },
    /**
     * 3-way match: compare Invoice vs PO vs GR quantities and prices.
     * Auto-approves if all discrepancies are within tolerance.
     */
    async threeWayMatch(poId, grId, invoiceLines) {
        const grLines = await GoodsReceipt_1.GoodsReceiptLine.find({ grId });
        const poLines = await PurchaseOrder_1.PurchaseOrderLine.find({ poId });
        const discrepancies = [];
        for (const inv of invoiceLines) {
            const po = poLines.find((l) => l.itemId.toString() === inv.itemId);
            const gr = grLines.find((l) => l.itemId.toString() === inv.itemId);
            if (!po || !gr)
                continue;
            const qtyVariance = Math.abs(inv.qty - gr.qtyAccepted);
            const priceVariance = Math.abs(inv.unitPriceCents - po.unitPriceCents);
            const qtyTolerance = (THREE_WAY_MATCH_TOLERANCE_PCT / 100) * po.qty;
            const priceTolerance = (THREE_WAY_MATCH_TOLERANCE_PCT / 100) * po.unitPriceCents;
            if (qtyVariance > qtyTolerance) {
                discrepancies.push({
                    field: `qty:${inv.itemId}`,
                    poValue: po.qty,
                    grValue: gr.qtyAccepted,
                    invoiceValue: inv.qty,
                    variance: qtyVariance,
                    withinTolerance: false,
                });
            }
            if (priceVariance > priceTolerance) {
                discrepancies.push({
                    field: `price:${inv.itemId}`,
                    poValue: po.unitPriceCents,
                    grValue: gr.unitCostCents,
                    invoiceValue: inv.unitPriceCents,
                    variance: priceVariance,
                    withinTolerance: false,
                });
            }
        }
        const isAutoApproved = discrepancies.length === 0;
        return {
            poId,
            grId,
            status: discrepancies.length === 0 ? "MATCHED" : "DISCREPANCY",
            discrepancies,
            isAutoApproved,
        };
    },
};

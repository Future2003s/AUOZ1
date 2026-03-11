"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSequence = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DocumentSequenceSchema = new mongoose_1.Schema({
    prefix: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    year: { type: Number, required: true },
    lastNumber: { type: Number, required: true, default: 0, min: 0 },
    format: {
        type: String,
        required: true,
        default: "{PREFIX}-{YEAR}-{NUMBER}",
        maxlength: 50,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
DocumentSequenceSchema.index({ prefix: 1, year: 1 }, { unique: true });
/**
 * Generate the next document number for a given prefix.
 * @returns e.g. "PO-2026-0042"
 */
DocumentSequenceSchema.statics.nextNumber = async function (prefix, year, padLength = 4) {
    const targetYear = year ?? new Date().getFullYear();
    const doc = await this.findOneAndUpdate({ prefix: prefix.toUpperCase(), year: targetYear }, { $inc: { lastNumber: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const num = String(doc.lastNumber).padStart(padLength, "0");
    return `${prefix.toUpperCase()}-${targetYear}-${num}`;
};
exports.DocumentSequence = mongoose_1.default.model("DocumentSequence", DocumentSequenceSchema);

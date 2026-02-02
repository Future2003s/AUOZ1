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
exports.Notification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NotificationSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["order_created", "order_updated", "order_cancelled", "order_shipped", "order_delivered", "system"]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    recipients: [
        {
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "User",
                required: false
            },
            role: {
                type: String,
                required: false
            },
            allEmployees: {
                type: Boolean,
                default: false
            }
        }
    ],
    readBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
}, {
    timestamps: true,
    collection: "notifications"
});
// Indexes for better query performance
NotificationSchema.index({ "recipients.userId": 1, createdAt: -1 });
NotificationSchema.index({ "recipients.role": 1, createdAt: -1 });
NotificationSchema.index({ "recipients.allEmployees": 1, createdAt: -1 });
NotificationSchema.index({ readBy: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
// Create compound index for common queries
NotificationSchema.index({ "recipients.allEmployees": 1, readBy: 1, createdAt: -1 });
exports.Notification = mongoose_1.default.model("Notification", NotificationSchema);

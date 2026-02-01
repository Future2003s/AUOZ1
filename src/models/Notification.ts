import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
    type: "order_created" | "order_updated" | "order_cancelled" | "order_shipped" | "order_delivered" | "system";
    title: string;
    message: string;
    data?: {
        orderId?: string;
        orderNumber?: string;
        total?: number;
        itemCount?: number;
        userId?: string;
        isGuest?: boolean;
        [key: string]: any;
    };
    recipients: {
        userId?: string;
        role?: string; // "EMPLOYEE", "ADMIN", etc.
        allEmployees?: boolean; // If true, send to all employees
    }[];
    readBy: string[]; // Array of user IDs who have read this notification
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
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
            type: Schema.Types.Mixed,
            default: {}
        },
        recipients: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
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
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true,
        collection: "notifications"
    }
);

// Indexes for better query performance
NotificationSchema.index({ "recipients.userId": 1, createdAt: -1 });
NotificationSchema.index({ "recipients.role": 1, createdAt: -1 });
NotificationSchema.index({ "recipients.allEmployees": 1, createdAt: -1 });
NotificationSchema.index({ readBy: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Create compound index for common queries
NotificationSchema.index({ "recipients.allEmployees": 1, readBy: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>("Notification", NotificationSchema);


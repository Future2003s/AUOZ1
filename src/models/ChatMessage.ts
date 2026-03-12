import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    text?: string;
    images?: string[];
    file?: {
        name: string;
        size: number;
        url?: string;
    };
    replyTo?: {
        messageId: mongoose.Types.ObjectId;
        senderId: mongoose.Types.ObjectId;
        text?: string;
        image?: string;
        fileName?: string;
    };
    readBy: mongoose.Types.ObjectId[];
    recalled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: "ChatConversation",
            required: true,
            index: true
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            maxlength: 5000
        },
        images: [{ type: String }],
        file: {
            name: String,
            size: Number,
            url: String
        },
        replyTo: {
            messageId: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
            senderId: { type: Schema.Types.ObjectId, ref: "User" },
            text: String,
            image: String,
            fileName: String
        },
        readBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        recalled: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Compound index for fetching messages in a conversation sorted by time
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1 });

export const ChatMessage = mongoose.model<IChatMessage>(
    "ChatMessage",
    ChatMessageSchema
);

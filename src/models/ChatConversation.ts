import mongoose, { Document, Schema } from "mongoose";

export interface IChatConversation extends Document {
    type: "direct" | "group";
    name?: string;
    avatar?: string;
    color?: string;
    participants: mongoose.Types.ObjectId[];
    admins?: mongoose.Types.ObjectId[];
    lastMessage?: {
        senderId: mongoose.Types.ObjectId;
        text?: string;
        time: Date;
    };
    createdBy: mongoose.Types.ObjectId;
    hiddenBy?: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const ChatConversationSchema = new Schema<IChatConversation>(
    {
        type: {
            type: String,
            enum: ["direct", "group"],
            required: true
        },
        name: {
            type: String,
            trim: true,
            maxlength: 100
        },
        avatar: {
            type: String,
            maxlength: 10
        },
        color: {
            type: String,
            maxlength: 20
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        admins: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        lastMessage: {
            senderId: { type: Schema.Types.ObjectId, ref: "User" },
            text: String,
            time: Date
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        hiddenBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
ChatConversationSchema.index({ participants: 1 });
ChatConversationSchema.index({ type: 1, participants: 1 });
ChatConversationSchema.index({ updatedAt: -1 });

export const ChatConversation = mongoose.model<IChatConversation>(
    "ChatConversation",
    ChatConversationSchema
);

import mongoose, { Document, Schema } from "mongoose";

export interface IComment extends Document {
    product: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    content: string;
    parentComment?: mongoose.Types.ObjectId | null;
    replyCount: number;
    likeCount: number;
    isEdited: boolean;
    status: "visible" | "hidden" | "removed";
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, "Comment cannot be empty"],
            maxlength: [1000, "Comment cannot exceed 1000 characters"],
            set: function (value: string) {
                if (typeof value === "string") {
                    return value.normalize("NFC");
                }
                return value;
            }
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
            index: true
        },
        replyCount: {
            type: Number,
            default: 0,
            min: 0
        },
        likeCount: {
            type: Number,
            default: 0,
            min: 0
        },
        isEdited: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ["visible", "hidden", "removed"],
            default: "visible",
            index: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

CommentSchema.index({ product: 1, parentComment: 1, createdAt: -1 });
CommentSchema.index({ user: 1, createdAt: -1 });
CommentSchema.index({ status: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);


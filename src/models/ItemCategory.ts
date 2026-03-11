import mongoose, { Document, Schema } from "mongoose";

export interface IItemCategory extends Document {
    code: string;
    name: string;
    description?: string;
    parentId?: mongoose.Types.ObjectId;
    level: number;            // 0 = root, 1 = child, 2 = grandchild, ...
    path: string;             // materialised path e.g. "root/parent/child"
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ItemCategorySchema = new Schema<IItemCategory>(
    {
        code: {
            type: String,
            required: [true, "Category code is required"],
            trim: true,
            uppercase: true,
            maxlength: [20, "Code must be ≤ 20 characters"],
        },
        name: {
            type: String,
            required: [true, "Category name is required"],
            trim: true,
            maxlength: [100, "Name must be ≤ 100 characters"],
        },
        description: { type: String, trim: true, maxlength: 500 },
        parentId: { type: Schema.Types.ObjectId, ref: "ItemCategory", default: null },
        level: { type: Number, required: true, default: 0, min: 0 },
        path: { type: String, required: true, default: "/" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

ItemCategorySchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
ItemCategorySchema.index({ parentId: 1 });
ItemCategorySchema.index({ path: 1 });
ItemCategorySchema.index({ isDeleted: 1, isActive: 1 });

export const ItemCategory = mongoose.model<IItemCategory>("ItemCategory", ItemCategorySchema);

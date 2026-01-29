import mongoose, { Document, Schema } from "mongoose";

export interface IFlowerLogCatalog extends Document {
  key: string; // singleton key, e.g. "default"
  categories: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const FlowerLogCatalogSchema = new Schema<IFlowerLogCatalog>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      trim: true,
      maxlength: 100,
    },
    categories: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FlowerLogCatalogSchema.index({ key: 1 }, { unique: true });

export const FlowerLogCatalog = mongoose.model<IFlowerLogCatalog>(
  "FlowerLogCatalog",
  FlowerLogCatalogSchema
);


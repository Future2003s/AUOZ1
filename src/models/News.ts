import mongoose, { Document, Schema } from "mongoose";

export type NewsStatus = "draft" | "published";

export interface INews extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category?: string;
  tags: string[];
  authorName?: string;
  authorRole?: string;
  readTime?: string;
  locale: string;
  status: NewsStatus;
  isFeatured: boolean;
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema<INews>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    authorName: { type: String },
    authorRole: { type: String },
    readTime: { type: String },
    locale: { type: String, default: "vi", index: true },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const News = mongoose.model<INews>("News", NewsSchema);


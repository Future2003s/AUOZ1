import mongoose, { Document, Schema } from "mongoose";

export type ComplaintStatus = "new" | "in_progress" | "resolved" | "rejected";

export interface IComplaintHistory {
  action: string;
  note?: string;
  status?: ComplaintStatus;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IComplaint extends Document {
  fullName: string;
  orderCode: string;
  email: string;
  phone?: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  adminNotes?: string;
  history: IComplaintHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintHistorySchema = new Schema<IComplaintHistory>(
  {
    action: { type: String, required: true },
    note: { type: String },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "rejected"],
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const ComplaintSchema = new Schema<IComplaint>(
  {
    fullName: { type: String, required: true, trim: true },
    orderCode: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "rejected"],
      default: "new",
    },
    adminNotes: { type: String },
    history: { type: [ComplaintHistorySchema], default: [] },
  },
  { timestamps: true }
);

export const Complaint = mongoose.model<IComplaint>(
  "Complaint",
  ComplaintSchema
);


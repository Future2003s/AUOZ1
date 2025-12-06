import mongoose, { Document, Schema } from "mongoose";

export type TaskStatus = "todo" | "pending" | "done";

export interface ITask extends Document {
  date: string; // YYYY-MM-DD format
  title: string;
  assignee: string;
  tag: string;
  status: TaskStatus;
  description?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    date: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    assignee: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      required: true,
      trim: true,
      default: "Chung",
    },
    status: {
      type: String,
      enum: ["todo", "pending", "done"],
      default: "todo",
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
TaskSchema.index({ date: 1, status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ assignee: 1 });

export const Task = mongoose.model<ITask>("Task", TaskSchema);


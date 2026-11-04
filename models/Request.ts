import mongoose, { Model, Schema } from "mongoose";

export type RequestStatus = "Pending" | "Assigned" | "Collected" | "Completed" | "Cancelled";
export type WasteType = "Plastic" | "Organic" | "E-waste" | "Glass" | "Other";

export type RequestDocument = {
  userId: mongoose.Types.ObjectId;
  type: WasteType;
  location: string;
  date: string;
  quantity: string;
  status: RequestStatus;
  collector: string;
  description: string;
  photo: boolean;
  history: {
    status: RequestStatus;
    note: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

const historySchema = new Schema(
  {
    status: { type: String, enum: ["Pending", "Assigned", "Collected", "Completed", "Cancelled"], required: true },
    note: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const requestSchema = new Schema<RequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["Plastic", "Organic", "E-waste", "Glass", "Other"], required: true },
    location: { type: String, required: true, trim: true, maxlength: 300 },
    date: { type: String, required: true },
    quantity: { type: String, required: true, trim: true, maxlength: 80 },
    status: { type: String, enum: ["Pending", "Assigned", "Collected", "Completed", "Cancelled"], default: "Pending" },
    collector: { type: String, default: "Unassigned", trim: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    photo: { type: Boolean, default: false },
    history: { type: [historySchema], default: [] }
  },
  { timestamps: true }
);

export const WasteRequest: Model<RequestDocument> =
  mongoose.models.WasteRequest ?? mongoose.model<RequestDocument>("WasteRequest", requestSchema);

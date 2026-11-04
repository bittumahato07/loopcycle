import mongoose, { Model, Schema } from "mongoose";

export type SupportTicketDocument = {
  userId: mongoose.Types.ObjectId;
  category: "Account" | "Request" | "Technical" | "Other";
  subject: string;
  message: string;
  status: "Open" | "In progress" | "Resolved";
  createdAt: Date;
  updatedAt: Date;
};

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: ["Account", "Request", "Technical", "Other"], required: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["Open", "In progress", "Resolved"], default: "Open" }
  },
  { timestamps: true }
);

export const SupportTicket: Model<SupportTicketDocument> =
  mongoose.models.SupportTicket ?? mongoose.model<SupportTicketDocument>("SupportTicket", supportTicketSchema);

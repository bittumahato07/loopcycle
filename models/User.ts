import mongoose, { Model, Schema } from "mongoose";

export type UserRole = "citizen" | "admin";

export type UserDocument = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  preferences: {
    pickupReminders: boolean;
    impactUpdates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["citizen", "admin"], default: "citizen" },
    preferences: {
      pickupReminders: { type: Boolean, default: false },
      impactUpdates: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

export const User: Model<UserDocument> = mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);

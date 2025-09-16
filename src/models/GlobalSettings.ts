/**
 * GlobalSettings Model
 * Stores global application settings including default referral policy
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for GlobalSettings document
 */
export interface IGlobalSettings extends Document {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GlobalSettings Schema
 */
const globalSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Settings key is required"],
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Settings value is required"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

export default mongoose.model<IGlobalSettings>("GlobalSettings", globalSettingsSchema);
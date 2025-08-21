/**
 * Package Model
 * Represents subscription packages with duration-based pricing plans
 * Used to define different subscription tiers for trading bot access
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for Package document
 * @interface IPackage
 * @extends {Document}
 */
export interface IPackage extends Document {
  /** Unique name of the subscription package */
  name: string;
  /** Duration of the package in days */
  duration: number;
  /** Document creation timestamp */
  createdAt: Date;
  /** Document last update timestamp */
  updatedAt: Date;
}

/**
 * Package Schema Definition
 * Defines validation rules and structure for subscription package documents
 */
const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      unique: true, // Ensures package names are unique
      trim: true,
      minlength: [2, "Package name must be at least 2 characters long"],
      maxlength: [50, "Package name cannot exceed 50 characters"],
    },
    duration: {
      type: Number,
      required: [true, "Package duration is required"],
      min: [1, "Duration must be at least 1 day"],
      max: [365, "Duration cannot exceed 365 days"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    versionKey: false, // Removes __v field
    toJSON: {
      // Transform output to use 'id' instead of '_id'
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

// Create and export the Package model
const Package = mongoose.model<IPackage>("Package", packageSchema);

export default Package;


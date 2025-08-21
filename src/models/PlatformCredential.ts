/**
 * Platform Credential Model
 * Stores API keys and authentication credentials for various trading platforms
 * Enables users to connect their trading accounts for automated trading
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for Platform Credential document
 * @interface IPlatformCredential
 * @extends {Document}
 */
export interface IPlatformCredential extends Document {
  /** Reference to the user who owns these credentials */
  userId: mongoose.Types.ObjectId;
  /** Name of the trading platform (e.g., Binance, Delta, etc.) */
  platformName: string;
  /** Platform-specific credentials object (API keys, secrets, etc.) */
  credentials: Record<string, any>;
  /** Document creation timestamp */
  createdAt: Date;
  /** Document last update timestamp */
  updatedAt: Date;
}

/**
 * Platform Credential Schema Definition
 * Defines structure for storing encrypted trading platform credentials
 */
const platformCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    platformName: {
      type: String,
      required: [true, "Platform name is required"],
      trim: true,
      minlength: [2, "Platform name must be at least 2 characters"],
      maxlength: [50, "Platform name cannot exceed 50 characters"],
    },
    credentials: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for different platform credential formats
      required: [true, "Credentials are required"],
      validate: {
        validator: function(value: any) {
          return typeof value === 'object' && value !== null && !Array.isArray(value);
        },
        message: "Credentials must be an object"
      }
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

// Ensure unique platform credentials per user
platformCredentialSchema.index(
  { userId: 1, platformName: 1 },
  { unique: true }
);

// Performance indexes
platformCredentialSchema.index({ userId: 1 }); // Find all credentials for a user
platformCredentialSchema.index({ platformName: 1 }); // Find credentials by platform

// Create and export the PlatformCredential model
const PlatformCredential = mongoose.model<IPlatformCredential>(
  "PlatformCredential",
  platformCredentialSchema
);

export default PlatformCredential;

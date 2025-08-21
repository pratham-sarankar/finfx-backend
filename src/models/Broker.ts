/**
 * Broker Model
 * Represents trading brokers/platforms that users can connect to
 * Used for managing different trading platform integrations
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for Broker document
 * @interface IBroker
 * @extends {Document}
 */
export interface IBroker extends Document {
  /** Unique name of the trading broker/platform */
  name: string;
  /** Document creation timestamp */
  createdAt: Date;
  /** Document last update timestamp */
  updatedAt: Date;
}

/**
 * Broker Schema Definition
 * Defines validation rules and structure for trading broker documents
 */
const brokerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Broker name is required"],
      trim: true,
      unique: true, // Ensures broker names are unique
      minlength: [2, "Broker name must be at least 2 characters"],
      maxlength: [100, "Broker name cannot exceed 100 characters"],
      validate: {
        validator: function(value: string) {
          // Allow alphanumeric characters, spaces, and common broker name symbols
          return /^[a-zA-Z0-9\s&.-]+$/.test(value);
        },
        message: "Broker name contains invalid characters"
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

// Create and export the Broker model
const Broker = mongoose.model<IBroker>("Broker", brokerSchema);

export default Broker; 
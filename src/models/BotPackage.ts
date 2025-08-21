/**
 * BotPackage Model
 * Represents the association between trading bots and subscription packages with pricing
 * Defines specific pricing for bot-package combinations
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for BotPackage document
 * @interface IBotPackage
 * @extends {Document}
 */
export interface IBotPackage extends Document {
  /** Reference to the Bot document */
  botId: mongoose.Types.ObjectId;
  /** Reference to the Package document */
  packageId: mongoose.Types.ObjectId;
  /** Price for this specific bot-package combination */
  price: number;
  /** Document creation timestamp */
  createdAt: Date;
  /** Document last update timestamp */
  updatedAt: Date;
}

/**
 * BotPackage Schema Definition
 * Links bots with packages and defines pricing for each combination
 */
const botPackageSchema = new mongoose.Schema(
  {
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
      required: [true, "Bot ID is required"],
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package", 
      required: [true, "Package ID is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a non-negative number"],
      max: [999999.99, "Price cannot exceed 999,999.99"],
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

// Ensure unique bot-package combinations to prevent duplicates
botPackageSchema.index({ botId: 1, packageId: 1 }, { unique: true });

// Create and export the BotPackage model
const BotPackage = mongoose.model<IBotPackage>("BotPackage", botPackageSchema);

export default BotPackage;

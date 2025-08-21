/**
 * Bot Model
 * Represents trading bots with their configuration and performance metrics
 * Used for algorithmic trading strategies and signal generation
 */
import mongoose, { Document } from "mongoose";

/**
 * Interface for Bot document
 * @interface IBot
 * @extends {Document}
 */
export interface IBot extends Document {
  /** Unique name identifier for the trading bot */
  name: string;
  /** Detailed description of the bot's trading strategy and purpose */
  description: string;
  /** Recommended capital amount for optimal bot performance */
  recommendedCapital: number;
  /** Optional duration string indicating performance tracking period */
  performanceDuration?: string;
  /** Optional script/symbol that the bot trades */
  script?: string;
  /** Document creation timestamp */
  createdAt: Date;
  /** Document last update timestamp */
  updatedAt: Date;
}

/**
 * Bot Schema Definition
 * Defines validation rules and structure for trading bot documents
 */
const botSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Bot name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Bot description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    recommendedCapital: {
      type: Number,
      required: [true, "Recommended capital is required"],
      min: [0, "Recommended capital cannot be negative"],
    },
    performanceDuration: {
      type: String,
      enum: {
        values: ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"],
        message:
          "Performance duration must be one of: 1D, 1W, 1M, 3M, 6M, 1Y, ALL",
      },
      default: "1M", // Default performance tracking period
    },
    script: {
      type: String,
      trim: true,
      maxlength: [10, "Script code cannot exceed 10 characters"],
      default: "USD", // Default trading script/symbol
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

// Create and export the Bot model
const Bot = mongoose.model<IBot>("Bot", botSchema);

export default Bot;

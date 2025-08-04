import mongoose, { Document } from "mongoose";
import User from "./User";
import { AppError } from "../middleware/errorHandler";
import Bot from "./Bot";
import BotPackage from "./BotPackage";

/**
 * Interface for BotSubscription document
 */
export interface IBotSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  botPackageId: mongoose.Types.ObjectId;
  lotSize: Number;
  status: "active"| "pause"| "expired";
  subscribedAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BotSubscription Schema
 */
const botSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
      required: true,
    },
    botPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BotPackage",
      required: true,
    },
    lotSize: {
      type: Number,
      required: true,
      min: [0.1, "lotSize must be at least 0.1"],
    },
    status: {
      type: String,
      enum: ["active", "pause", "expired"],
      default: "active",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    versionKey: false,
    id: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: { virtuals: true },
  }
);

botSubscriptionSchema.virtual("bot", {
  ref: "Bot",
  localField: "botId",
  foreignField: "_id",
  justOne: true,
});

// Indexes for faster queries
botSubscriptionSchema.index({ userId: 1, status: 1 });
botSubscriptionSchema.index({ botId: 1, status: 1 });

botSubscriptionSchema.pre<IBotSubscription>("save", async function (next) {
  // Only run this validation for new documents or if the foreign key fields are modified
  if (
    this.isNew ||
    this.isModified("userId") ||
    this.isModified("botId") ||
    this.isModified("botPackageId")
  ) {
    // Check if user exists
    const userExists = await User.findById(this.userId);
    if (!userExists) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Check if bot exists
    const botExists = await Bot.findById(this.botId);
    if (!botExists) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if bot package exists
    const botPackageExists = await BotPackage.findById(this.botPackageId);
    if (!botPackageExists) {
      throw new AppError("Bot package not found", 404, "bot-package-not-found");
    }
    next();
  }
});

export default mongoose.model<IBotSubscription>(
  "BotSubscription",
  botSubscriptionSchema
);

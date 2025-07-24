import mongoose, { Document } from "mongoose";

/**
 * Interface for BotSubscription document
 */
export interface IBotSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  botPackageId:mongoose.Types.ObjectId;
  lotSize: Number;
  status: "active" | "cancelled";
  subscribedAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiryDate:Date;
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
    botPackageId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"BotPackage",
      required:true
    },
    lotSize:{
      type:Number,
      required:true,
      min:[0.1,"lotSize must be at least 0.1"]
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
    },
    expiryDate: { type: Date }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure one subscription per user per bot
botSubscriptionSchema.index({ userId: 1, botId: 1 }, { unique: true });

// Indexes for faster queries
botSubscriptionSchema.index({ userId: 1, status: 1 });
botSubscriptionSchema.index({ botId: 1, status: 1 });

export default mongoose.model<IBotSubscription>(
  "BotSubscription",
  botSubscriptionSchema
);

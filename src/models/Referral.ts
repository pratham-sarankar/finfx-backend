/**
 * Referral Model
 * Tracks referral relationships between users
 */
import mongoose, { Document } from "mongoose";
import { IReferralRewardPolicy } from "./User";

/**
 * Interface for Referral document
 */
export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredUserId: mongoose.Types.ObjectId;
  referralCode: string;
  rewardPolicySnapshot: IReferralRewardPolicy;
  status: "pending" | "cancelled" | "rejected" | "settled";
  rewardAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Referral Schema
 * Defines the structure and validation rules for referral documents
 */
const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referrer ID is required"],
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referred user ID is required"],
      unique: true, // Prevent duplicate referrals for the same user
      index: true,
    },
    referralCode: {
      type: String,
      required: [true, "Referral code is required"],
      trim: true,
      minlength: [8, "Referral code must be at least 8 characters long"],
      maxlength: [8, "Referral code must be exactly 8 characters long"],
    },
    rewardPolicySnapshot: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        required: [true, "Referral reward type is required"],
      },
      value: {
        type: Number,
        required: [true, "Referral reward value is required"],
        min: [0, "Referral reward value cannot be negative"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "cancelled", "rejected", "settled"],
      default: "pending",
      required: [true, "Status is required"],
    },
    rewardAmount: {
      type: Number,
      default: null,
      min: [0, "Reward amount cannot be negative"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index for efficient queries
referralSchema.index({ referrerId: 1, status: 1 });

export default mongoose.model<IReferral>("Referral", referralSchema);
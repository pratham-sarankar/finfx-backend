/**
 * Referrals Controller
 * Handles referral validation and management
 */
import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Referral from "../models/Referral";

/**
 * Validate a referral code
 * @route GET /api/referrals/validate/:referralCode
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const validateReferralCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { referralCode } = req.params;

    // Basic validation
    if (!referralCode || referralCode.length !== 8) {
      res.json({ valid: false });
      return;
    }

    // Find user with the referral code
    const referrer = await User.findOne({ 
      referralCode: referralCode.trim().toUpperCase(),
      status: "active" // Only active users can refer others
    }).select("_id fullName referralRewardPolicy");

    if (!referrer) {
      res.json({ valid: false });
      return;
    }

    // Return valid response with referrer information
    res.json({
      valid: true,
      referrerId: referrer._id,
      referrerName: referrer.fullName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a referral entry during user signup
 * This function is called internally by the auth controller
 * @param {string} referralCode - The referral code used
 * @param {string} referredUserId - The new user's ID
 * @returns {Promise<IReferral | null>} Created referral document or null if failed
 */
export const createReferralEntry = async (
  referralCode: string,
  referredUserId: string
): Promise<any> => {
  try {
    // Find the referrer user
    const referrer = await User.findOne({
      referralCode: referralCode.trim().toUpperCase(),
      status: "active",
    });

    if (!referrer) {
      return null; // Invalid referral code, but don't throw error
    }

    // Check if this user already has a referral entry
    const existingReferral = await Referral.findOne({ referredUserId });
    if (existingReferral) {
      return null; // Prevent duplicate referrals
    }

    // Create referral document
    const referral = await Referral.create({
      referrerId: referrer._id,
      referredUserId,
      referralCode: referralCode.trim().toUpperCase(),
      rewardPolicySnapshot: referrer.referralRewardPolicy,
      status: "pending",
      rewardAmount: null,
    });

    return referral;
  } catch (error) {
    // Log the error but don't throw it - referral creation failure should not block signup
    console.error("Error creating referral entry:", error);
    return null;
  }
};
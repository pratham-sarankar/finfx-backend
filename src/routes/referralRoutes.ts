/**
 * Referral Routes
 * Defines API endpoints for referral validation and management
 */
import express from "express";
import { validateReferralCode } from "../controllers/referralController";
import { param } from "express-validator";
import validate from "../middleware/validate";

const router = express.Router();

/**
 * @route GET /api/referrals/validate/:referralCode
 * @desc Validate a referral code
 * @access Public
 */
router.get(
  "/validate/:referralCode",
  param("referralCode")
    .notEmpty()
    .withMessage("Referral code is required")
    .isLength({ min: 8, max: 8 })
    .withMessage("Referral code must be exactly 8 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Referral code must contain only uppercase letters and numbers"),
  validate,
  validateReferralCode
);

export default router;
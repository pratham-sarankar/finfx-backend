import express from "express";
import {
  updatePhoneAndSendOTP,
  verifyPhoneOTP,
  setPin,
  verifyPin,
  updatePassword,
  updateProfile,
} from "../controllers/profileController";
import { auth } from "../middleware/auth";
import { getMe } from "../controllers/authController";
import validate from "../middleware/validate";
import { body } from "express-validator";

const router = express.Router();

// Get user profile
router.get("/me", auth, getMe);

// All profile routes require authentication
router.use(auth);

// Profile management routes
router.put(
  "/", 
  body("fullName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  validate,
  updateProfile
);
router.post(
  "/phone", 
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
  validate,
  updatePhoneAndSendOTP
);
router.post(
  "/verify-phone", 
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must be numeric"),
  validate,
  verifyPhoneOTP
);
router.post(
  "/pin", 
  body("pin")
    .notEmpty()
    .withMessage("PIN is required")
    .matches(/^\d{6}$/)
    .withMessage("PIN must be a 6-digit number"),
  validate,
  setPin
);
router.post(
  "/verify-pin", 
  body("pin")
    .notEmpty()
    .withMessage("PIN is required")
    .matches(/^\d{6}$/)
    .withMessage("PIN must be a 6-digit number"),
  validate,
  verifyPin
);
router.put(
  "/password", 
  body("password")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long"),
  validate,
  updatePassword
);

export default router;

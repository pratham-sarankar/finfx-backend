/**
 * Authentication Routes
 * Defines API endpoints for user authentication and account management
 * Includes signup, login, password reset, email verification, and Google OAuth
 */
import express from "express";
import {
  signup,
  login,
  googleAuth,
  sendEmailOTP,
  verifyEmailOTP,
  forgotPassword,
  resetPassword,
  getResetPasswordPage,
  validateResetToken,
} from "../controllers/authController";
import validate from "../middleware/validate";
import { body } from "express-validator";

const router = express.Router();

/**
 * @route GET /api/auth/reset-password
 * @desc Serve password reset page (HTML)
 * @access Public
 */
router.get("/reset-password", getResetPasswordPage);

/**
 * @route POST /api/auth/signup
 * @desc Register a new user account
 * @access Public
 */
router.post(
  "/signup", 
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  validate,
  signup
);

/**
 * @route POST /api/auth/login
 * @desc User login with email and password
 * @access Public
 */
router.post(
  "/login", 
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  validate,
  login
);

/**
 * @route POST /api/auth/google
 * @desc Authenticate user with Google OAuth
 * @access Public
 */
router.post(
  "/google", 
  body("idToken")
    .notEmpty()
    .withMessage("ID token is required"),
  validate,
  googleAuth
);

/**
 * @route POST /api/auth/send-email-otp
 * @desc Send OTP to user's email for verification
 * @access Public
 */
router.post(
  "/send-email-otp", 
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  validate,
  sendEmailOTP
);

/**
 * @route POST /api/auth/verify-email-otp
 * @desc Verify email OTP and activate account
 * @access Public
 */
router.post(
  "/verify-email-otp", 
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must be numeric"),
  validate,
  verifyEmailOTP
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset via email
 * @access Public
 */
router.post(
  "/forgot-password", 
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  validate,
  forgotPassword
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using reset token
 * @access Public
 */
router.post(
  "/reset-password", 
  body("token")
    .notEmpty()
    .withMessage("Reset token is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  validate,
  resetPassword
);

/**
 * @route POST /api/auth/validate-reset-token
 * @desc Validate password reset token
 * @access Public
 */
router.post(
  "/validate-reset-token", 
  body("token")
    .notEmpty()
    .withMessage("Reset token is required"),
  validate,
  validateResetToken
);

export default router;

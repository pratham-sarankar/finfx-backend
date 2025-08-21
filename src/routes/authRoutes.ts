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
router.post("/signup", signup);

/**
 * @route POST /api/auth/login
 * @desc User login with email and password
 * @access Public
 */
router.post("/login", login);

/**
 * @route POST /api/auth/google
 * @desc Authenticate user with Google OAuth
 * @access Public
 */
router.post("/google", googleAuth);

/**
 * @route POST /api/auth/send-email-otp
 * @desc Send OTP to user's email for verification
 * @access Public
 */
router.post("/send-email-otp", sendEmailOTP);

/**
 * @route POST /api/auth/verify-email-otp
 * @desc Verify email OTP and activate account
 * @access Public
 */
router.post("/verify-email-otp", verifyEmailOTP);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset via email
 * @access Public
 */
router.post("/forgot-password", forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using reset token
 * @access Public
 */
router.post("/reset-password", resetPassword);

/**
 * @route POST /api/auth/validate-reset-token
 * @desc Validate password reset token
 * @access Public
 */
router.post("/validate-reset-token", validateResetToken);

export default router;

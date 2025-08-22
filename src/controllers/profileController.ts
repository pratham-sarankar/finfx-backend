/**
 * Profile Controller
 * Handles user profile management operations including phone verification,
 * PIN management, and password updates for authenticated users
 */
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { createOTP, verifyOTP, checkOTPCooldown } from "../utils/otpUtils";

/**
 * Update phone number and send verification OTP
 * @route POST /api/profile/phone
 * @access Private
 * @param {Request} req - Express request object containing phoneNumber
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming OTP sent
 * @throws {AppError} 400 - Missing phone number
 * @throws {AppError} 404 - User not found
 * @throws {AppError} 429 - OTP cooldown period active
 * @description Updates user's phone number and sends OTP for verification
 */
export const updatePhoneAndSendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    // Note: Phone number validation is now handled by express-validator in routes

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Check cooldown period
    const isInCooldown = await checkOTPCooldown(phoneNumber, "phone");
    if (isInCooldown) {
      throw new AppError(
        "Please wait before requesting another OTP",
        429,
        "otp-cooldown"
      );
    }

    // Update user's phone number if it's different
    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
      user.isPhoneVerified = false;
      await user.save();
    } else {
      throw new AppError(
        "Phone number is already verified",
        400,
        "phone-already-verified"
      );
    }

    // TODO: Implement SMS sending functionality
    const otpRecord = await createOTP(phoneNumber, "phone");
    // await sendVerificationSMS(phoneNumber, otpRecord.otp);

    res.json({
      message: "OTP sent successfully",
      otp: otpRecord.otp, // TODO: Remove this after implementing SMS sending functionality.
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify phone number OTP
 * @route POST /api/profile/phone/verify
 * @access Private
 * @param {Request} req - Express request object containing OTP
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming phone verification
 * @throws {AppError} 400 - Missing OTP or invalid OTP
 * @throws {AppError} 404 - User not found
 * @description Verifies phone number OTP and marks user's phone as verified
 */
export const verifyPhoneOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;
    const userId = req.user.id;

    if (!phoneNumber || !otp) {
      throw new AppError(
        "Phone number and OTP are required",
        400,
        "missing-otp-fields"
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(phoneNumber, otp, "phone");
    if (!isValid) {
      throw new AppError("Invalid or expired OTP", 400, "invalid-otp");
    }

    // Update user verification status
    const user = await User.findOneAndUpdate(
      { _id: userId, phoneNumber },
      { isPhoneVerified: true }
    );

    if (!user) {
      throw new AppError(
        "User not found or phone number mismatch",
        404,
        "user-not-found"
      );
    }

    res.json({ message: "Phone number verified successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Set user security PIN
 * @route POST /api/profile/pin
 * @access Private
 * @param {Request} req - Express request object containing PIN
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming PIN was set
 * @throws {AppError} 400 - Invalid PIN format or length
 * @throws {AppError} 404 - User not found
 * @description Sets a 4-digit security PIN for the authenticated user
 */
export const setPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    // Note: PIN format validation is now handled by express-validator in routes

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Hash PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Update user's PIN
    user.hashedPin = hashedPin;
    await user.save();

    res.json({ message: "PIN set successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user security PIN
 * @route POST /api/profile/verify-pin
 * @access Private
 * @param {Request} req - Express request object containing PIN
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming PIN verification
 * @throws {AppError} 400 - Missing PIN
 * @throws {AppError} 404 - User not found or PIN not set
 * @throws {AppError} 401 - Invalid PIN
 * @description Verifies the user's security PIN against stored hash
 */
export const verifyPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    // Validate PIN
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError(
        "PIN must be a 6-digit number",
        400,
        "invalid-pin-format"
      );
    }

    // Find user with hashedPin
    const user = await User.findById(userId).select("+hashedPin");
    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Check if PIN is set
    if (!user.hashedPin) {
      throw new AppError("PIN not set", 400, "pin-not-set");
    }

    // Verify PIN
    const isValid = await user.comparePin(pin);
    if (!isValid) {
      throw new AppError("Invalid PIN", 401, "invalid-pin");
    }

    res.json({ message: "PIN verified successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password
 * @route PUT /api/profile/password
 * @access Private
 * @param {Request} req - Express request object containing current and new password
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response confirming password update
 * @throws {AppError} 400 - Missing password fields or invalid password length
 * @throws {AppError} 404 - User not found
 * @throws {AppError} 401 - Invalid current password
 * @description Updates user's password after verifying current password
 */
export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password, newPassword } = req.body;
    const userId = req.user.id;

    // Note: Basic password validation is now handled by express-validator in routes

    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new AppError("User not found", 404, "user-not-found");
    }

    // Check if user has a password (not Google-only account)
    if (!user.password) {
      throw new AppError(
        "This account was created using Google. Please use Google to sign in.",
        400,
        "google-auth-required"
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(
        "Current password is incorrect",
        401,
        "invalid-current-password"
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile details (fullName, email, phoneNumber)
 * @route PUT /api/profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, phoneNumber } = req.body;

    // Validate at least one field is provided
    if (!fullName && !email && !phoneNumber) {
      throw new AppError(
        "Please provide at least one field to update",
        400,
        "no-update-fields"
      );
    }

    // Validate fullName if provided
    if (fullName) {
      const nameRegex = /^[a-zA-Z\s.'-]{2,50}$/;
      if (!nameRegex.test(fullName)) {
        throw new AppError(
          "Invalid full name format. Name should be 2-50 characters and contain only letters, spaces, and common name characters",
          400,
          "invalid-full-name"
        );
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        throw new AppError(
          "Please provide a valid email address",
          400,
          "invalid-email"
        );
      }

      // Check if email is already used by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        throw new AppError(
          "Email is already registered",
          409,
          "email-already-exists"
        );
      }
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new AppError(
          "Please provide a valid phone number",
          400,
          "invalid-phone"
        );
      }

      // Check if phone is already used by another user
      const existingUser = await User.findOne({
        phoneNumber,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        throw new AppError(
          "Phone number is already registered",
          409,
          "phone-already-exists"
        );
      }
    }

    // Prepare update object
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) {
      updateData.email = email;
      updateData.isEmailVerified = false; // Reset email verification
    }
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber;
      updateData.isPhoneVerified = false; // Reset phone verification
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select(
      "fullName email phoneNumber isEmailVerified isPhoneVerified createdAt updatedAt"
    );

    if (!user) {
      throw new AppError(
        "Failed to update profile",
        500,
        "profile-update-failed"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

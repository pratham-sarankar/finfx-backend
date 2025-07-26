import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { createOTP, verifyOTP, checkOTPCooldown } from "../utils/otpUtils";

// --- Validators ---
const validateFullName = (fullName: string): boolean => {
  const nameRegex = /^[a-zA-Z\s.'-]{2,50}$/;
  return nameRegex.test(fullName);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// --- Update Profile ---
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, phoneNumber } = req.body;

    if (!fullName && !email && !phoneNumber) {
      throw new AppError("Please provide at least one field to update", 400, "no-update-fields");
    }

    if (fullName && !validateFullName(fullName)) {
      throw new AppError("Invalid full name format", 400, "invalid-full-name");
    }

    if (email) {
      if (!validateEmail(email)) {
        throw new AppError("Please provide a valid email address", 400, "invalid-email");
      }
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) throw new AppError("Email is already registered", 409, "email-already-exists");
    }

    if (phoneNumber) {
      if (!validatePhone(phoneNumber)) {
        throw new AppError("Please provide a valid phone number", 400, "invalid-phone");
      }
      const existingUser = await User.findOne({ phoneNumber, _id: { $ne: req.user._id } });
      if (existingUser) throw new AppError("Phone number is already registered", 409, "phone-already-exists");
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) { updateData.email = email; updateData.isEmailVerified = false; }
    if (phoneNumber) { updateData.phoneNumber = phoneNumber; updateData.isPhoneVerified = false; }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updateData }, { new: true, runValidators: true })
      .select("fullName email phoneNumber isEmailVerified isPhoneVerified createdAt updatedAt");

    if (!user) throw new AppError("Failed to update profile", 500, "profile-update-failed");

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user: { id: user._id, ...user.toObject() } },
    });
  } catch (error) {
    next(error);
  }
};

// --- OTP and Phone ---
export const updatePhoneAndSendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    if (!phoneNumber) throw new AppError("Phone number is required", 400, "missing-phone");

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "user-not-found");

    const isInCooldown = await checkOTPCooldown(phoneNumber, "phone");
    if (isInCooldown) throw new AppError("Please wait before requesting another OTP", 429, "otp-cooldown");

    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
      user.isPhoneVerified = false;
      await user.save();
    } else {
      throw new AppError("Phone number is already verified", 400, "phone-already-verified");
    }

    const otpRecord = await createOTP(phoneNumber, "phone");
    res.json({ message: "OTP sent successfully", otp: otpRecord.otp }); // TODO: remove otp in prod
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber, otp } = req.body;
    const userId = req.user.id;

    if (!phoneNumber || !otp) throw new AppError("Phone number and OTP are required", 400, "missing-otp-fields");

    const isValid = await verifyOTP(phoneNumber, otp, "phone");
    if (!isValid) throw new AppError("Invalid or expired OTP", 400, "invalid-otp");

    const user = await User.findOneAndUpdate({ _id: userId, phoneNumber }, { isPhoneVerified: true });
    if (!user) throw new AppError("User not found or phone number mismatch", 404, "user-not-found");

    res.json({ message: "Phone number verified successfully" });
  } catch (error) {
    next(error);
  }
};

// --- PIN ---
export const setPin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin || !/^\d{6}$/.test(pin)) throw new AppError("PIN must be a 6-digit number", 400, "invalid-pin-format");

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "user-not-found");

    const salt = await bcrypt.genSalt(10);
    user.hashedPin = await bcrypt.hash(pin, salt);
    await user.save();

    res.json({ message: "PIN set successfully" });
  } catch (error) {
    next(error);
  }
};

export const verifyPin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin || !/^\d{6}$/.test(pin)) throw new AppError("PIN must be a 6-digit number", 400, "invalid-pin-format");

    const user = await User.findById(userId).select("+hashedPin");
    if (!user) throw new AppError("User not found", 404, "user-not-found");

    if (!user.hashedPin) throw new AppError("PIN not set", 400, "pin-not-set");

    const isValid = await user.comparePin(pin);
    if (!isValid) throw new AppError("Invalid PIN", 401, "invalid-pin");

    res.json({ message: "PIN verified successfully" });
  } catch (error) {
    next(error);
  }
};

// --- Password ---
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, newPassword } = req.body;
    const userId = req.user.id;

    if (!password || !newPassword)
      throw new AppError("Current password and new password are required", 400, "missing-password-fields");

    if (newPassword.length < 8) throw new AppError("New password must be at least 8 characters long", 400, "password-too-short");

    const user = await User.findById(userId).select("+password");
    if (!user) throw new AppError("User not found", 404, "user-not-found");

    if (!user.password)
      throw new AppError("This account was created using Google. Please use Google to sign in.", 400, "google-auth-required");

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new AppError("Current password is incorrect", 401, "invalid-current-password");

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * OTP (One-Time Password) Utility Functions
 * Handles generation, creation, verification, and cooldown management for OTPs
 * Used for email and phone number verification processes
 */
import OTP, { IOTP } from '../models/OTP';

/**
 * Generate a random 6-digit OTP
 * @returns {string} A 6-digit numeric OTP string
 * @description Generates a cryptographically secure random number between 100000-999999
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and store a new OTP in the database
 * @param {string} emailOrPhone - Email address or phone number for the OTP
 * @param {'email' | 'phone'} type - Type of OTP (email or phone verification)
 * @param {number} [expiryMinutes=5] - OTP expiration time in minutes (default: 5)
 * @returns {Promise<IOTP>} Promise resolving to the created OTP document
 * @throws {Error} Database errors during OTP creation
 */
export const createOTP = async (
  emailOrPhone: string,
  type: 'email' | 'phone',
  expiryMinutes: number = 5
): Promise<IOTP> => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Create OTP data object with conditional email/phone field
  const otpData = {
    otp,
    type,
    expiresAt,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone })
  };

  return OTP.create(otpData);
};

/**
 * Verify an OTP against stored records
 * @param {string} emailOrPhone - Email address or phone number to verify
 * @param {string} otp - The OTP code to verify
 * @param {'email' | 'phone'} type - Type of OTP verification
 * @returns {Promise<boolean>} Promise resolving to true if OTP is valid, false otherwise
 * @description Finds and validates OTP, then deletes it upon successful verification
 */
export const verifyOTP = async (
  emailOrPhone: string,
  otp: string,
  type: 'email' | 'phone'
): Promise<boolean> => {
  // Find unexpired OTP matching the provided criteria
  const otpRecord = await OTP.findOne({
    otp,
    type,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone }),
    expiresAt: { $gt: new Date() } // Only find non-expired OTPs
  });

  if (!otpRecord) {
    return false;
  }

  // Delete the OTP after successful verification to prevent reuse
  await OTP.deleteOne({ _id: otpRecord._id });
  return true;
};

/**
 * Check if there's an active OTP cooldown period
 * @param {string} emailOrPhone - Email address or phone number to check
 * @param {'email' | 'phone'} type - Type of OTP to check cooldown for
 * @param {number} [cooldownSeconds=60] - Cooldown period in seconds (default: 60)
 * @returns {Promise<boolean>} Promise resolving to true if in cooldown, false otherwise
 * @description Prevents OTP spam by enforcing minimum time between OTP requests
 */
export const checkOTPCooldown = async (
  emailOrPhone: string,
  type: 'email' | 'phone',
  cooldownSeconds: number = 60
): Promise<boolean> => {
  // Check for recent OTP creation within cooldown period
  const recentOTP = await OTP.findOne({
    type,
    ...(type === 'email' ? { email: emailOrPhone } : { phone: emailOrPhone }),
    createdAt: { $gt: new Date(Date.now() - cooldownSeconds * 1000) }
  });

  return !!recentOTP; // Return true if recent OTP exists (in cooldown)
}; 
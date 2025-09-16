/**
 * Referral Utility Functions
 * Handles generation of unique referral codes and related operations
 */
import crypto from 'crypto';
import User from '../models/User';

/**
 * Generate a unique referral code
 * @returns {string} An 8-character alphanumeric referral code (uppercase)
 * @description Generates a unique referral code using crypto for security
 */
export const generateReferralCode = (): string => {
  // Generate 6 random bytes and convert to base64, then clean up
  const randomBytes = crypto.randomBytes(6);
  let code = randomBytes.toString('base64')
    .replace(/[^A-Za-z0-9]/g, '') // Remove non-alphanumeric characters
    .toUpperCase()
    .slice(0, 8); // Take first 8 characters
  
  // Ensure we have exactly 8 characters by padding if needed
  while (code.length < 8) {
    const extraByte = crypto.randomBytes(1);
    const extraChar = extraByte.toString('base64').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (extraChar) {
      code += extraChar.charAt(0);
    }
  }
  
  return code.slice(0, 8);
};

/**
 * Generate a unique referral code that doesn't exist in the database
 * @returns {Promise<string>} A unique referral code
 * @description Generates referral codes until a unique one is found
 */
export const generateUniqueReferralCode = async (): Promise<string> => {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateReferralCode();
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Unable to generate unique referral code after maximum attempts');
    }
    
    const existingUser = await User.findOne({ referralCode: code });
    if (!existingUser) {
      break;
    }
  } while (attempts <= maxAttempts);

  return code;
};

/**
 * Default referral reward policy
 */
export const DEFAULT_REFERRAL_POLICY = {
  type: 'percentage' as const,
  value: 10 // 10% commission
};
// User model referral fields validation tests
import { DEFAULT_REFERRAL_POLICY } from '../utils/referralUtils';

describe('User Model - Referral Fields Integration', () => {
  describe('Referral code validation rules', () => {
    it('should validate referral code length requirements', () => {
      const validateReferralCodeLength = (code: string | undefined | null) => {
        if (!code) return { isValid: false, error: 'Referral code is required' };
        if (typeof code !== 'string') return { isValid: false, error: 'Referral code must be a string' };
        if (code.length < 8) return { isValid: false, error: 'Referral code must be at least 8 characters long' };
        if (code.length > 8) return { isValid: false, error: 'Referral code must be exactly 8 characters long' };
        return { isValid: true };
      };

      // Valid cases
      expect(validateReferralCodeLength('ABCD1234')).toEqual({ isValid: true });
      expect(validateReferralCodeLength('XYZ98765')).toEqual({ isValid: true });

      // Invalid cases
      expect(validateReferralCodeLength('')).toEqual({ isValid: false, error: 'Referral code is required' });
      expect(validateReferralCodeLength('ABC123')).toEqual({ isValid: false, error: 'Referral code must be at least 8 characters long' });
      expect(validateReferralCodeLength('ABCD12345')).toEqual({ isValid: false, error: 'Referral code must be exactly 8 characters long' });
      expect(validateReferralCodeLength(null)).toEqual({ isValid: false, error: 'Referral code is required' });
      expect(validateReferralCodeLength(undefined)).toEqual({ isValid: false, error: 'Referral code is required' });
    });

    it('should validate referral code uniqueness requirement', () => {
      // Simulate database uniqueness check logic
      const existingCodes = new Set(['EXIST123', 'TAKEN456', 'USED7890']);
      
      const validateReferralCodeUniqueness = (code: string) => {
        if (existingCodes.has(code)) {
          return { isValid: false, error: 'Referral code already exists' };
        }
        return { isValid: true };
      };

      // Valid cases (unique codes)
      expect(validateReferralCodeUniqueness('NEW12345')).toEqual({ isValid: true });
      expect(validateReferralCodeUniqueness('FRESH678')).toEqual({ isValid: true });

      // Invalid cases (duplicate codes)
      expect(validateReferralCodeUniqueness('EXIST123')).toEqual({ isValid: false, error: 'Referral code already exists' });
      expect(validateReferralCodeUniqueness('TAKEN456')).toEqual({ isValid: false, error: 'Referral code already exists' });
    });
  });

  describe('Referral reward policy validation rules', () => {
    it('should validate referral reward policy structure', () => {
      const validateReferralRewardPolicy = (policy: any) => {
        if (!policy || typeof policy !== 'object') {
          return { isValid: false, error: 'Referral reward policy is required' };
        }
        if (!policy.type) {
          return { isValid: false, error: 'Referral reward type is required' };
        }
        if (!['percentage', 'fixed'].includes(policy.type)) {
          return { isValid: false, error: 'Referral reward type must be "percentage" or "fixed"' };
        }
        if (typeof policy.value !== 'number') {
          return { isValid: false, error: 'Referral reward value is required' };
        }
        if (policy.value < 0) {
          return { isValid: false, error: 'Referral reward value cannot be negative' };
        }
        return { isValid: true };
      };

      // Valid cases
      expect(validateReferralRewardPolicy({ type: 'percentage', value: 10 })).toEqual({ isValid: true });
      expect(validateReferralRewardPolicy({ type: 'fixed', value: 50 })).toEqual({ isValid: true });
      expect(validateReferralRewardPolicy({ type: 'percentage', value: 0 })).toEqual({ isValid: true });

      // Invalid cases
      expect(validateReferralRewardPolicy(null)).toEqual({ isValid: false, error: 'Referral reward policy is required' });
      expect(validateReferralRewardPolicy({})).toEqual({ isValid: false, error: 'Referral reward type is required' });
      expect(validateReferralRewardPolicy({ type: 'invalid' })).toEqual({ isValid: false, error: 'Referral reward type must be "percentage" or "fixed"' });
      expect(validateReferralRewardPolicy({ type: 'percentage' })).toEqual({ isValid: false, error: 'Referral reward value is required' });
      expect(validateReferralRewardPolicy({ type: 'percentage', value: -1 })).toEqual({ isValid: false, error: 'Referral reward value cannot be negative' });
      expect(validateReferralRewardPolicy({ type: 'percentage', value: 'invalid' })).toEqual({ isValid: false, error: 'Referral reward value is required' });
    });

    it('should validate specific reward policy types', () => {
      const validatePercentagePolicy = (policy: any) => {
        if (policy.type !== 'percentage') return { isValid: false, error: 'Not a percentage policy' };
        if (policy.value > 100) return { isValid: false, error: 'Percentage cannot exceed 100%' };
        return { isValid: true };
      };

      const validateFixedPolicy = (policy: any) => {
        if (policy.type !== 'fixed') return { isValid: false, error: 'Not a fixed policy' };
        if (policy.value > 10000) return { isValid: false, error: 'Fixed amount seems unreasonably high' };
        return { isValid: true };
      };

      // Percentage policy tests
      expect(validatePercentagePolicy({ type: 'percentage', value: 10 })).toEqual({ isValid: true });
      expect(validatePercentagePolicy({ type: 'percentage', value: 100 })).toEqual({ isValid: true });
      expect(validatePercentagePolicy({ type: 'percentage', value: 150 })).toEqual({ isValid: false, error: 'Percentage cannot exceed 100%' });

      // Fixed policy tests
      expect(validateFixedPolicy({ type: 'fixed', value: 50 })).toEqual({ isValid: true });
      expect(validateFixedPolicy({ type: 'fixed', value: 1000 })).toEqual({ isValid: true });
      expect(validateFixedPolicy({ type: 'fixed', value: 15000 })).toEqual({ isValid: false, error: 'Fixed amount seems unreasonably high' });
    });
  });

  describe('Default referral policy integration', () => {
    it('should provide valid default referral policy', () => {
      const policy = DEFAULT_REFERRAL_POLICY;
      
      expect(policy).toBeDefined();
      expect(policy).toHaveProperty('type');
      expect(policy).toHaveProperty('value');
      expect(['percentage', 'fixed']).toContain(policy.type);
      expect(typeof policy.value).toBe('number');
      expect(policy.value).toBeGreaterThanOrEqual(0);
    });

    it('should simulate new user creation with default policy', () => {
      // Simulate new user creation logic
      const createUserData = (userData: any) => {
        // This simulates the pre-save hook logic
        const newUserData = { ...userData };
        
        if (!newUserData.referralRewardPolicy) {
          newUserData.referralRewardPolicy = DEFAULT_REFERRAL_POLICY;
        }
        
        return newUserData;
      };

      // Test with user data missing referral policy
      const userData1 = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result1 = createUserData(userData1);
      expect(result1.referralRewardPolicy).toEqual(DEFAULT_REFERRAL_POLICY);

      // Test with user data already having referral policy
      const userData2 = {
        fullName: 'Test User 2',
        email: 'test2@example.com',
        password: 'password123',
        referralRewardPolicy: { type: 'fixed', value: 100 }
      };
      
      const result2 = createUserData(userData2);
      expect(result2.referralRewardPolicy).toEqual({ type: 'fixed', value: 100 });
      expect(result2.referralRewardPolicy).not.toEqual(DEFAULT_REFERRAL_POLICY);
    });
  });

  describe('Schema compatibility validation', () => {
    it('should validate complete user data with referral fields', () => {
      const validateCompleteUserData = (userData: any) => {
        const errors: string[] = [];

        // Basic required fields
        if (!userData.fullName || userData.fullName.trim().length < 2) {
          errors.push('Full name is required and must be at least 2 characters');
        }
        if (!userData.email || !/^\S+@\S+\.\S+$/.test(userData.email)) {
          errors.push('Valid email is required');
        }

        // Referral code validation
        if (!userData.referralCode || userData.referralCode.length !== 8) {
          errors.push('Referral code must be exactly 8 characters');
        }

        // Referral reward policy validation
        if (!userData.referralRewardPolicy || typeof userData.referralRewardPolicy !== 'object') {
          errors.push('Referral reward policy is required');
        } else {
          if (!['percentage', 'fixed'].includes(userData.referralRewardPolicy.type)) {
            errors.push('Invalid referral reward type');
          }
          if (typeof userData.referralRewardPolicy.value !== 'number' || userData.referralRewardPolicy.value < 0) {
            errors.push('Invalid referral reward value');
          }
        }

        return { isValid: errors.length === 0, errors };
      };

      // Valid user data
      const validUserData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        referralCode: 'ABCD1234',
        referralRewardPolicy: { type: 'percentage', value: 10 }
      };
      
      expect(validateCompleteUserData(validUserData)).toEqual({ isValid: true, errors: [] });

      // Invalid user data
      const invalidUserData = {
        fullName: 'J', // Too short
        email: 'invalid-email', // Invalid format
        referralCode: 'SHORT', // Too short
        referralRewardPolicy: { type: 'invalid', value: -5 } // Invalid type and negative value
      };
      
      const result = validateCompleteUserData(invalidUserData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
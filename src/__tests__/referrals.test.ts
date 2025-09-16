/**
 * Referral routes validation tests
 * Tests route validation using mocked controllers (following existing pattern)
 */
import request from 'supertest';
import express from 'express';
import referralRoutes from '../routes/referralRoutes';

// Mock the controller functions since we're only testing validation
jest.mock('../controllers/referralController', () => ({
  validateReferralCode: (_req: any, res: any) => res.status(200).json({ valid: true }),
}));

const app = express();
app.use(express.json());
app.use('/api/referrals', referralRoutes);

describe('Referral Routes - Express Validator Integration', () => {
  describe('GET /api/referrals/validate/:referralCode - Referral Code Validation', () => {
    it('should accept valid 8-character uppercase alphanumeric referral code', async () => {
      const response = await request(app)
        .get('/api/referrals/validate/ABCD1234')
        .expect(200);
      
      expect(response.body).toEqual({ valid: true });
    });

    it('should reject referral code that is too short', async () => {
      const response = await request(app)
        .get('/api/referrals/validate/SHORT')
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Referral code must be exactly 8 characters');
    });

    it('should reject referral code that is too long', async () => {
      const response = await request(app)
        .get('/api/referrals/validate/TOOLONG123')
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Referral code must be exactly 8 characters');
    });

    it('should reject referral code with lowercase characters', async () => {
      const response = await request(app)
        .get('/api/referrals/validate/abcd1234')
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Referral code must contain only uppercase letters and numbers');
    });

    it('should reject referral code with special characters', async () => {
      const response = await request(app)
        .get('/api/referrals/validate/ABC@1234')
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Referral code must contain only uppercase letters and numbers');
    });

    it('should reject empty referral code', async () => {
      await request(app)
        .get('/api/referrals/validate/')
        .expect(404); // Express returns 404 for missing route parameter
    });
  });
});

describe('Auth Routes - Referral Code in Signup', () => {
  // Mock auth controller to focus on validation
  jest.mock('../controllers/authController', () => ({
    signup: (_req: any, res: any) => res.status(201).json({ success: true }),
    login: (_req: any, res: any) => res.status(200).json({ success: true }),
    googleAuth: (_req: any, res: any) => res.status(200).json({ success: true }),
    sendEmailOTP: (_req: any, res: any) => res.status(200).json({ success: true }),
    verifyEmailOTP: (_req: any, res: any) => res.status(200).json({ success: true }),
    forgotPassword: (_req: any, res: any) => res.status(200).json({ success: true }),
    resetPassword: (_req: any, res: any) => res.status(200).json({ success: true }),
    validateResetToken: (_req: any, res: any) => res.status(200).json({ success: true }),
    getResetPasswordPage: (_req: any, res: any) => res.status(200).send('<html></html>'),
  }));

  const authApp = express();
  authApp.use(express.json());
  
  // Import auth routes after mocking
  const authRoutes = require('../routes/authRoutes').default;
  authApp.use('/api/auth', authRoutes);

  describe('POST /api/auth/signup - Referral Code Validation', () => {
    const validSignupData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should accept signup with valid referral code', async () => {
      const response = await request(authApp)
        .post('/api/auth/signup')
        .send({
          ...validSignupData,
          referralCode: 'VALID123'
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
    });

    it('should accept signup without referral code', async () => {
      const response = await request(authApp)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
    });

    it('should reject signup with invalid referral code length', async () => {
      const response = await request(authApp)
        .post('/api/auth/signup')
        .send({
          ...validSignupData,
          referralCode: 'SHORT'
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((err: any) => 
        err.msg === 'Referral code must be exactly 8 characters long'
      )).toBe(true);
    });

    it('should reject signup with referral code containing invalid characters', async () => {
      const response = await request(authApp)
        .post('/api/auth/signup')
        .send({
          ...validSignupData,
          referralCode: 'test@123'
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((err: any) => 
        err.msg === 'Referral code must contain only uppercase letters and numbers'
      )).toBe(true);
    });

    it('should reject signup with lowercase referral code', async () => {
      const response = await request(authApp)
        .post('/api/auth/signup')
        .send({
          ...validSignupData,
          referralCode: 'abcd1234'
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((err: any) => 
        err.msg === 'Referral code must contain only uppercase letters and numbers'
      )).toBe(true);
    });
  });
});
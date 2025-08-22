import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes';

// Mock the controller functions since we're only testing validation
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

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes - Express Validator Integration', () => {
  describe('POST /api/auth/signup - Signup Validation', () => {
    it('should reject missing fullName', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Full name is required');
    });

    it('should reject fullName that is too short', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'A',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Full name must be between 2 and 50 characters');
    });

    it('should reject fullName that is too long', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'A'.repeat(51),
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Full name must be between 2 and 50 characters');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'John Doe',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Email is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'John Doe',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email address');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'John Doe',
          email: 'test@example.com'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Password is required');
    });

    it('should reject password that is too short', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'John Doe',
          email: 'test@example.com',
          password: '1234567'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should pass with valid signup data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'John Doe',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/login - Login Validation', () => {
    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Email is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email address');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Password is required');
    });

    it('should pass with valid login data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/google - Google Auth Validation', () => {
    it('should reject missing idToken', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('ID token is required');
    });

    it('should pass with valid idToken', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'valid-google-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/send-email-otp - Send Email OTP Validation', () => {
    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/send-email-otp')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Email is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/send-email-otp')
        .send({
          email: 'invalid-email'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email address');
    });

    it('should pass with valid email', async () => {
      const response = await request(app)
        .post('/api/auth/send-email-otp')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify-email-otp - Verify Email OTP Validation', () => {
    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          otp: '123456'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Email is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'invalid-email',
          otp: '123456'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email address');
    });

    it('should reject missing otp', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'test@example.com'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('OTP is required');
    });

    it('should reject otp that is too short', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'test@example.com',
          otp: '12345'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('OTP must be 6 digits');
    });

    it('should reject otp that is too long', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'test@example.com',
          otp: '1234567'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('OTP must be 6 digits');
    });

    it('should reject non-numeric otp', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'test@example.com',
          otp: 'abcdef'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('OTP must be numeric');
    });

    it('should pass with valid email and otp', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'test@example.com',
          otp: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password - Forgot Password Validation', () => {
    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Email is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email address');
    });

    it('should pass with valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password - Reset Password Validation', () => {
    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Reset token is required');
    });

    it('should reject missing newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          confirmPassword: 'newpassword123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('New password is required');
    });

    it('should reject newPassword that is too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: '1234567',
          confirmPassword: '1234567'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should reject missing confirmPassword', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Confirm password is required');
    });

    it('should reject mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Passwords do not match');
    });

    it('should pass with valid reset password data', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/validate-reset-token - Validate Reset Token Validation', () => {
    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/validate-reset-token')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Reset token is required');
    });

    it('should pass with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/validate-reset-token')
        .send({
          token: 'valid-reset-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
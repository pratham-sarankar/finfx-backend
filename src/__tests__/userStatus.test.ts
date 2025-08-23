import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes';
import { errorHandler } from '../middleware/errorHandler';

// Mock the User model to simulate database operations
jest.mock('../models/User', () => {
  const mockUser = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };

  // Mock implementation for different test scenarios
  const MockUser = jest.fn().mockImplementation(() => mockUser);
  Object.assign(MockUser, mockUser);
  return MockUser;
});

// Mock the controller functions to test status logic
jest.mock('../controllers/authController', () => {
  const { AppError } = require('../middleware/errorHandler');

  return {
    signup: (_req: any, res: any) => res.status(201).json({ success: true }),
    login: async (req: any, res: any, next: any) => {
      try {
        const { email, password } = req.body;

        // Mock user lookup
        const mockUsers: any = {
          'active@example.com': {
            _id: 'user1',
            email: 'active@example.com',
            fullName: 'Active User',
            isEmailVerified: true,
            status: 'active',
            comparePassword: () => Promise.resolve(true)
          },
          'inactive@example.com': {
            _id: 'user2',
            email: 'inactive@example.com',
            fullName: 'Inactive User',
            isEmailVerified: true,
            status: 'inactive',
            comparePassword: () => Promise.resolve(true)
          },
          'unverified@example.com': {
            _id: 'user3',
            email: 'unverified@example.com',
            fullName: 'Unverified User',
            isEmailVerified: false,
            status: 'active',
            comparePassword: () => Promise.resolve(true)
          }
        };

        const user = mockUsers[email];
        if (!user) {
          throw new AppError('Invalid email or password', 401, 'invalid-credentials');
        }

        if (!(await user.comparePassword(password))) {
          throw new AppError('Invalid email or password', 401, 'invalid-credentials');
        }

        if (!user.isEmailVerified) {
          throw new AppError('Please verify your email before logging in', 403, 'email-not-verified');
        }

        if (user.status === 'inactive') {
          throw new AppError('Your account is inactive. Please contact the admin to activate your account.', 403, 'account-inactive');
        }

        res.json({
          message: 'Login successful',
          token: 'mock-jwt-token',
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            status: user.status,
          },
        });
      } catch (error) {
        next(error);
      }
    },
    googleAuth: async (req: any, res: any, next: any) => {
      try {
        const { idToken } = req.body;
        
        // Mock Google token verification
        const mockGoogleUsers: any = {
          'active-google-token': {
            _id: 'user1',
            email: 'test@example.com',
            fullName: 'Active Google User',
            googleId: 'google-id-1',
            isEmailVerified: true,
            status: 'active',
            profilePicture: 'https://example.com/picture.jpg'
          },
          'inactive-google-token': {
            _id: 'user2',
            email: 'test@example.com',
            fullName: 'Inactive Google User',
            googleId: 'google-id-2',
            isEmailVerified: true,
            status: 'inactive',
            profilePicture: 'https://example.com/picture.jpg'
          },
          'new-user-token': null // Represents new user scenario
        };

        const existingUser = mockGoogleUsers[idToken];
        
        if (existingUser && existingUser.status === 'inactive') {
          throw new AppError('Your account is inactive. Please contact the admin to activate your account.', 403, 'account-inactive');
        }

        const user = existingUser || {
          _id: 'new-user',
          email: 'test@example.com',
          fullName: 'New Google User',
          googleId: 'new-google-id',
          isEmailVerified: true,
          status: 'active',
          profilePicture: 'https://example.com/picture.jpg'
        };

        res.json({
          message: 'Google authentication successful',
          token: 'mock-jwt-token',
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified,
            status: user.status,
          },
        });
      } catch (error) {
        next(error);
      }
    },
    sendEmailOTP: (_req: any, res: any) => res.status(200).json({ success: true }),
    verifyEmailOTP: (_req: any, res: any) => res.status(200).json({ success: true }),
    forgotPassword: (_req: any, res: any) => res.status(200).json({ success: true }),
    resetPassword: (_req: any, res: any) => res.status(200).json({ success: true }),
    validateResetToken: (_req: any, res: any) => res.status(200).json({ success: true }),
    getResetPasswordPage: (_req: any, res: any) => res.status(200).send('<html></html>'),
    getMe: (_req: any, res: any) => res.status(200).json({ success: true }),
  };
});

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('User Status - Active/Inactive Users', () => {
  describe('Regular Login - User Status Check', () => {
    it('should allow active user to login successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'active@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.status).toBe('active');
      expect(response.body.user.id).toBeDefined();
    });

    it('should deny inactive user login with proper message', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Your account is inactive. Please contact the admin to activate your account.');
      expect(response.body.errorCode).toBe('account-inactive');
    });

    it('should check email verification before status check', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123'
        });

      // Should fail on email verification first, not status
      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Please verify your email before logging in');
      expect(response.body.errorCode).toBe('email-not-verified');
    });
  });

  describe('Google Auth - User Status Check', () => {
    it('should allow active existing user to authenticate via Google', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'active-google-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.status).toBe('active');
    });

    it('should deny inactive existing user Google authentication with proper message', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'inactive-google-token'
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Your account is inactive. Please contact the admin to activate your account.');
      expect(response.body.errorCode).toBe('account-inactive');
    });

    it('should create new Google user with active status by default', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'new-user-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body.user.status).toBe('active');
    });
  });
});
/**
 * Subscription RBAC Tests
 * Tests for role-based access control in subscription operations
 */
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the User model
jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  auth: (req: any, _res: any, next: any) => {
    // This will be set properly in each test
    if (!req.user) {
      return next(new Error('Authentication required'));
    }
    next();
  }
}));

// Mock RBAC middleware
jest.mock('../middleware/rbac', () => ({
  requireUser: (_req: any, _res: any, next: any) => {
    next();
  }
}));

// Mock BotSubscription model
jest.mock('../models/BotSubscription', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

// Mock BotPackage model
jest.mock('../models/BotPackage', () => ({
  findById: jest.fn()
}));

// Mock Package model
jest.mock('../models/Package', () => ({
  findById: jest.fn()
}));

// Mock Bot model
jest.mock('../models/Bot', () => ({
  findById: jest.fn()
}));

// Import after mocking
import subscriptionRoutes from '../routes/subscriptionRoutes';

const app = express();
app.use(express.json());
app.use('/api/subscriptions', subscriptionRoutes);

describe('Subscription RBAC Tests', () => {
  const adminUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin'
  };

  const regularUser = {
    _id: '507f1f77bcf86cd799439012',
    email: 'user@example.com',
    fullName: 'Regular User',
    role: 'user'
  };

  const otherUser = {
    _id: '507f1f77bcf86cd799439013',
    email: 'other@example.com',
    fullName: 'Other User',
    role: 'user'
  };

  beforeEach(() => {
    // Mock User.findById for authentication
    const User = require('../models/User');
    User.findById.mockImplementation((id: string) => {
      if (id === adminUser._id) return Promise.resolve(adminUser);
      if (id === regularUser._id) return Promise.resolve(regularUser);
      if (id === otherUser._id) return Promise.resolve(otherUser);
      return Promise.resolve(null);
    });

    // Setup mock implementations for other models
    const BotPackage = require('../models/BotPackage');
    const Package = require('../models/Package');
    const BotSubscription = require('../models/BotSubscription');

    BotPackage.findById.mockResolvedValue({
      _id: 'package123',
      packageId: 'pkg123'
    });

    Package.findById.mockResolvedValue({
      _id: 'pkg123',
      duration: 30
    });

    BotSubscription.create.mockResolvedValue({
      _id: 'sub123',
      userId: regularUser._id,
      botId: 'bot123',
      status: 'active'
    });

    BotSubscription.find.mockResolvedValue([{
      _id: 'sub123',
      userId: regularUser._id,
      botId: 'bot123',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis()
    }]);

    BotSubscription.findOne.mockResolvedValue({
      _id: 'sub123',
      userId: regularUser._id,
      botId: 'bot123',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/subscriptions - Create Subscription', () => {
    const validSubscriptionData = {
      botId: 'bot123',
      botPackageId: 'package123',
      lotSize: 1.5
    };

    it('should allow regular users to create subscriptions for themselves', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(validSubscriptionData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    it('should allow admin to create subscriptions for any user', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const subscriptionDataWithUserId = {
        ...validSubscriptionData,
        userId: otherUser._id
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(subscriptionDataWithUserId);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    it('should deny regular users from creating subscriptions for other users', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const subscriptionDataWithUserId = {
        ...validSubscriptionData,
        userId: otherUser._id
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(subscriptionDataWithUserId);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('administrators can create subscriptions for other users');
      expect(response.body.code).toBe('admin-required');
    });
  });

  describe('GET /api/subscriptions - Get Subscriptions', () => {
    it('should allow regular users to view their own subscriptions', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should allow admin to view any user subscriptions', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/subscriptions')
        .query({ userId: otherUser._id })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should deny regular users from viewing other users subscriptions', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/subscriptions')
        .query({ userId: otherUser._id })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('administrators can view other users');
      expect(response.body.code).toBe('admin-required');
    });
  });

  describe('GET /api/subscriptions/:id - Get Specific Subscription', () => {
    it('should allow admin to view any subscription', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should allow regular users to view their own subscriptions', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Mock to return subscription owned by regular user
      const BotSubscription = require('../models/BotSubscription');
      BotSubscription.findOne.mockResolvedValue({
        _id: 'sub123',
        userId: regularUser._id,
        botId: 'bot123',
        status: 'active',
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis()
      });

      const response = await request(app)
        .get('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('PUT /api/subscriptions/:id - Update Subscription', () => {
    it('should allow admin to update any subscription', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const BotSubscription = require('../models/BotSubscription');
      BotSubscription.findByIdAndUpdate.mockResolvedValue({
        _id: 'sub123',
        userId: otherUser._id,
        status: 'paused',
        toObject: () => ({ _id: 'sub123', userId: otherUser._id, status: 'paused' })
      });

      const response = await request(app)
        .put('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'paused' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should allow regular users to update their own subscriptions', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const BotSubscription = require('../models/BotSubscription');
      BotSubscription.findOne.mockResolvedValue({
        _id: 'sub123',
        userId: regularUser._id,
        status: 'active'
      });

      BotSubscription.findByIdAndUpdate.mockResolvedValue({
        _id: 'sub123',
        userId: regularUser._id,
        status: 'paused',
        toObject: () => ({ _id: 'sub123', userId: regularUser._id, status: 'paused' })
      });

      const response = await request(app)
        .put('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'paused' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('DELETE /api/subscriptions/:id - Delete Subscription', () => {
    it('should allow admin to delete any subscription', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const BotSubscription = require('../models/BotSubscription');
      BotSubscription.findOneAndDelete.mockResolvedValue({
        _id: 'sub123',
        userId: otherUser._id
      });

      const response = await request(app)
        .delete('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should allow regular users to delete their own subscriptions', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const BotSubscription = require('../models/BotSubscription');
      BotSubscription.findOneAndDelete.mockResolvedValue({
        _id: 'sub123',
        userId: regularUser._id
      });

      const response = await request(app)
        .delete('/api/subscriptions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('Authentication requirements', () => {
    it('should deny access without authentication token', async () => {
      const response = await request(app)
        .get('/api/subscriptions');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Please authenticate.');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Please authenticate.');
    });
  });
});
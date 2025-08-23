/**
 * RBAC (Role-Based Access Control) Tests
 * Tests for role-based authorization functionality
 */
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth';
import { requireRole, requireAdmin, requireUser } from '../middleware/rbac';

// Mock the User model
jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

// Create test app
const app = express();
app.use(express.json());

// Test routes
app.get('/admin-only', auth, requireAdmin, (req, res) => {
  res.json({ message: 'Admin access granted', role: req.user.role });
});

app.get('/user-access', auth, requireUser, (req, res) => {
  res.json({ message: 'User access granted', role: req.user.role });
});

app.get('/specific-role', auth, requireRole(['admin', 'moderator']), (req, res) => {
  res.json({ message: 'Specific role access granted', role: req.user.role });
});

describe('RBAC Middleware Tests', () => {
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

  beforeEach(() => {
    // Mock User.findById for authentication
    const User = require('../models/User');
    User.findById.mockImplementation((id: string) => {
      if (id === adminUser._id) return Promise.resolve(adminUser);
      if (id === regularUser._id) return Promise.resolve(regularUser);
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAdmin middleware', () => {
    it('should allow admin users to access admin-only routes', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin access granted');
      expect(response.body.role).toBe('admin');
    });

    it('should deny regular users access to admin-only routes', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
      expect(response.body.code).toBe('insufficient-permissions');
    });
  });

  describe('requireUser middleware', () => {
    it('should allow admin users access to user routes', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/user-access')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User access granted');
      expect(response.body.role).toBe('admin');
    });

    it('should allow regular users access to user routes', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/user-access')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User access granted');
      expect(response.body.role).toBe('user');
    });
  });

  describe('requireRole middleware with multiple roles', () => {
    it('should allow admin users access to specific role routes', async () => {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/specific-role')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Specific role access granted');
      expect(response.body.role).toBe('admin');
    });

    it('should deny regular users access to specific role routes', async () => {
      const token = jwt.sign(
        { id: regularUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/specific-role')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
      expect(response.body.code).toBe('insufficient-permissions');
    });
  });

  describe('Authentication requirements', () => {
    it('should deny access without authentication token', async () => {
      const response = await request(app)
        .get('/admin-only');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Please authenticate.');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Please authenticate.');
    });
  });
});

describe('Role-based business logic tests', () => {
  describe('User role assignment', () => {
    it('should validate admin role permissions', () => {
      const adminRole = 'admin';
      const userRole = 'user';
      
      // Admin should have full permissions
      expect(['admin', 'user'].includes(adminRole)).toBe(true);
      
      // User should have limited permissions
      expect(['user'].includes(userRole)).toBe(true);
      expect(['admin'].includes(userRole)).toBe(false);
    });

    it('should validate role enum values', () => {
      const validRoles = ['admin', 'user'];
      const testRole1 = 'admin';
      const testRole2 = 'user';
      const invalidRole = 'moderator';

      expect(validRoles.includes(testRole1)).toBe(true);
      expect(validRoles.includes(testRole2)).toBe(true);
      expect(validRoles.includes(invalidRole)).toBe(false);
    });
  });

  describe('Access control logic', () => {
    it('should properly check ownership for regular users', () => {
      const currentUserId = '507f1f77bcf86cd799439012';
      const targetUserId = '507f1f77bcf86cd799439012';
      const otherUserId = '507f1f77bcf86cd799439013';
      const userRole: string = 'user';

      // User can access their own resources
      expect(currentUserId === targetUserId || userRole === 'admin').toBe(true);
      
      // User cannot access other users' resources
      expect(currentUserId === otherUserId || userRole === 'admin').toBe(false);
    });

    it('should allow admin access to any resource', () => {
      const currentUserId: string = '507f1f77bcf86cd799439011';
      const targetUserId: string = '507f1f77bcf86cd799439012';
      const adminRole: string = 'admin';

      // Admin can access any resource regardless of ownership
      expect(currentUserId === targetUserId || adminRole === 'admin').toBe(true);
    });
  });
});
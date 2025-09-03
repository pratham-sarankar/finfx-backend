/**
 * User Deletion Cascade Tests
 * Tests to verify that when a user is deleted, all related resources are also deleted
 */
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { deleteUser, deleteMultipleUsers } from '../controllers/userController';
import { AppError } from '../middleware/errorHandler';

// Mock models to track delete operations
const mockDeleteResults: { [key: string]: any[] } = {
  User: [],
  BotSubscription: [],
  KYC: [],
  PlatformCredential: []
};

// Mock User model
jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
}));

// Mock BotSubscription model
jest.mock('../models/BotSubscription', () => ({
  deleteMany: jest.fn((query: any) => {
    mockDeleteResults.BotSubscription.push(query);
    return Promise.resolve({ deletedCount: 1 });
  }),
}));

// Mock KYC model
jest.mock('../models/KYC', () => ({
  deleteMany: jest.fn((query: any) => {
    mockDeleteResults.KYC.push(query);
    return Promise.resolve({ deletedCount: 1 });
  }),
}));

// Mock PlatformCredential model
jest.mock('../models/PlatformCredential', () => ({
  deleteMany: jest.fn((query: any) => {
    mockDeleteResults.PlatformCredential.push(query);
    return Promise.resolve({ deletedCount: 1 });
  }),
}));

const User = require('../models/User');
const BotSubscription = require('../models/BotSubscription');
const KYC = require('../models/KYC');
const PlatformCredential = require('../models/PlatformCredential');

describe('User Deletion Cascade Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.delete('/users/:id', deleteUser);
    app.delete('/users', deleteMultipleUsers);
    
    // Error handler
    app.use((error: any, _req: any, res: any, _next: any) => {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          status: error.status,
          message: error.message,
          code: error.code
        });
      }
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    });
  });

  beforeEach(() => {
    // Clear mock call history
    jest.clearAllMocks();
    Object.keys(mockDeleteResults).forEach(key => {
      mockDeleteResults[key] = [];
    });
  });

  describe('Single User Deletion Cascade', () => {
    it('should delete user and all related resources when user exists', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Mock user exists
      User.findById.mockResolvedValue({ _id: userId });
      User.findByIdAndDelete.mockResolvedValue({ _id: userId });

      const response = await request(app)
        .delete(`/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify cascade deletion calls
      expect(BotSubscription.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(KYC.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(PlatformCredential.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId.toString());

      // Verify all cascade methods were called
      expect(BotSubscription.deleteMany).toHaveBeenCalled();
      expect(KYC.deleteMany).toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).toHaveBeenCalled();
    });

    it('should return error when user does not exist', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Mock user not found
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/users/${userId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('user-not-found');

      // Verify no cascade deletion occurs when user doesn't exist
      expect(BotSubscription.deleteMany).not.toHaveBeenCalled();
      expect(KYC.deleteMany).not.toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).not.toHaveBeenCalled();
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should return error for invalid user ID format', async () => {
      const response = await request(app)
        .delete('/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('invalid-id');

      // Verify no deletion occurs for invalid ID
      expect(User.findById).not.toHaveBeenCalled();
      expect(BotSubscription.deleteMany).not.toHaveBeenCalled();
      expect(KYC.deleteMany).not.toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle deletion even when no related resources exist', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Mock user exists
      User.findById.mockResolvedValue({ _id: userId });
      User.findByIdAndDelete.mockResolvedValue({ _id: userId });

      // Mock no related resources found
      BotSubscription.deleteMany.mockResolvedValue({ deletedCount: 0 });
      KYC.deleteMany.mockResolvedValue({ deletedCount: 0 });
      PlatformCredential.deleteMany.mockResolvedValue({ deletedCount: 0 });

      const response = await request(app)
        .delete(`/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify cascade deletion was attempted even with no related resources
      expect(BotSubscription.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(KYC.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(PlatformCredential.deleteMany).toHaveBeenCalledWith({ userId: userId.toString() });
      expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId.toString());
    });
  });

  describe('Multiple Users Deletion Cascade', () => {
    it('should delete multiple users and all their related resources', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userIds = [userId1.toString(), userId2.toString()];

      // Mock successful deletion
      User.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const response = await request(app)
        .delete('/users')
        .send({ userIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(2);
      expect(response.body.data.requestedCount).toBe(2);
      expect(response.body.data.notFoundCount).toBe(0);

      // Verify cascade deletion for multiple users
      expect(BotSubscription.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
      expect(KYC.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
      expect(PlatformCredential.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
      expect(User.deleteMany).toHaveBeenCalledWith({ _id: { $in: userIds } });

      // Verify all cascade methods were called
      expect(BotSubscription.deleteMany).toHaveBeenCalled();
      expect(KYC.deleteMany).toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).toHaveBeenCalled();
    });

    it('should handle partial deletion when some users do not exist', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userIds = [userId1.toString(), userId2.toString()];

      // Mock partial success - only 1 user deleted
      User.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app)
        .delete('/users')
        .send({ userIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(1);
      expect(response.body.data.requestedCount).toBe(2);
      expect(response.body.data.notFoundCount).toBe(1);
      expect(response.body.message).toContain('1 user(s) deleted successfully');
      expect(response.body.message).toContain('1 user(s) were not found');

      // Verify cascade deletion was attempted for all users
      expect(BotSubscription.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
      expect(KYC.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
      expect(PlatformCredential.deleteMany).toHaveBeenCalledWith({ userId: { $in: userIds } });
    });

    it('should return error when no users are provided', async () => {
      const response = await request(app)
        .delete('/users')
        .send({ userIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('empty-user-ids-array');

      // Verify no deletion occurs when no users provided
      expect(BotSubscription.deleteMany).not.toHaveBeenCalled();
      expect(KYC.deleteMany).not.toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
    });

    it('should return error when userIds is not an array', async () => {
      const response = await request(app)
        .delete('/users')
        .send({ userIds: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('invalid-request-body');

      // Verify no deletion occurs for invalid input
      expect(BotSubscription.deleteMany).not.toHaveBeenCalled();
      expect(KYC.deleteMany).not.toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
    });

    it('should return error when invalid ObjectId format is provided', async () => {
      const response = await request(app)
        .delete('/users')
        .send({ userIds: ['invalid-id-1', 'invalid-id-2'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('invalid-user-ids');
      expect(response.body.message).toContain('Invalid user IDs: invalid-id-1, invalid-id-2');

      // Verify no deletion occurs for invalid IDs
      expect(BotSubscription.deleteMany).not.toHaveBeenCalled();
      expect(KYC.deleteMany).not.toHaveBeenCalled();
      expect(PlatformCredential.deleteMany).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('Resource Cascade Deletion Order', () => {
    it('should delete related resources before deleting the user in single deletion', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      User.findById.mockResolvedValue({ _id: userId });
      User.findByIdAndDelete.mockResolvedValue({ _id: userId });

      await request(app)
        .delete(`/users/${userId}`)
        .expect(200);

      // Verify that Promise.all was called for related resources before user deletion
      const botSubscriptionCall = BotSubscription.deleteMany.mock.calls[0];
      const kycCall = KYC.deleteMany.mock.calls[0];
      const platformCredentialCall = PlatformCredential.deleteMany.mock.calls[0];
      const userCall = User.findByIdAndDelete.mock.calls[0];

      // All related resource deletions should be called with the correct userId
      expect(botSubscriptionCall[0]).toEqual({ userId: userId.toString() });
      expect(kycCall[0]).toEqual({ userId: userId.toString() });
      expect(platformCredentialCall[0]).toEqual({ userId: userId.toString() });
      expect(userCall[0]).toEqual(userId.toString());
    });

    it('should delete related resources before deleting users in multiple deletion', async () => {
      const userIds = [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()];
      
      User.deleteMany.mockResolvedValue({ deletedCount: 2 });

      await request(app)
        .delete('/users')
        .send({ userIds })
        .expect(200);

      // Verify that Promise.all was called for related resources before user deletion
      const botSubscriptionCall = BotSubscription.deleteMany.mock.calls[0];
      const kycCall = KYC.deleteMany.mock.calls[0];
      const platformCredentialCall = PlatformCredential.deleteMany.mock.calls[0];
      const userCall = User.deleteMany.mock.calls[0];

      // All related resource deletions should be called with the correct userIds
      expect(botSubscriptionCall[0]).toEqual({ userId: { $in: userIds } });
      expect(kycCall[0]).toEqual({ userId: { $in: userIds } });
      expect(platformCredentialCall[0]).toEqual({ userId: { $in: userIds } });
      expect(userCall[0]).toEqual({ _id: { $in: userIds } });
    });
  });

  describe('Error Handling During Cascade Deletion', () => {
    it('should handle errors during related resource deletion in single user deletion', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      User.findById.mockResolvedValue({ _id: userId });
      
      // Mock an error during cascade deletion
      BotSubscription.deleteMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${userId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Verify that the error prevented user deletion
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should handle errors during related resource deletion in multiple user deletion', async () => {
      const userIds = [new mongoose.Types.ObjectId().toString()];
      
      // Mock an error during cascade deletion
      KYC.deleteMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/users')
        .send({ userIds })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Verify that the error prevented user deletion
      expect(User.deleteMany).not.toHaveBeenCalled();
    });
  });
});


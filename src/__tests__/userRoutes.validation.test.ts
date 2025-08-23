import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/userRoutes';

// Mock the auth middleware to always authenticate as admin
jest.mock('../middleware/auth', () => ({
  auth: (req: any, _res: any, next: any) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      email: 'admin@example.com',
      role: 'admin'
    };
    next();
  }
}));

// Mock the RBAC middleware to allow admin access
jest.mock('../middleware/rbac', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => {
    next();
  }
}));

// Mock the controller functions since we're only testing validation
jest.mock('../controllers/userController', () => ({
  createUser: (_req: any, res: any) => res.status(201).json({ success: true }),
  getUsers: (_req: any, res: any) => res.status(200).json({ success: true }),
  getUserById: (_req: any, res: any) => res.status(200).json({ success: true }),
  updateUser: (_req: any, res: any) => res.status(200).json({ success: true }),
  deleteUser: (_req: any, res: any) => res.status(200).json({ success: true }),
  deleteMultipleUsers: (_req: any, res: any) => res.status(200).json({ success: true }),
}));

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes - Express Validator Integration', () => {
  describe('POST /api/users - Create User Validation', () => {
    it('should reject missing fullName', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'test@example.com',
          phoneNumber: '+1234567890',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Full name is required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          fullName: 'John Doe',
          email: 'invalid-email',
          phoneNumber: '+1234567890',
          password: 'password123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email');
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          fullName: 'John Doe',
          email: 'test@example.com',
          phoneNumber: '+1234567890',
          password: '123'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('8 characters');
    });

    it('should pass with valid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          fullName: 'John Doe',
          email: 'test@example.com',
          phoneNumber: '+1234567890',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/users - Multi Delete Validation', () => {
    it('should reject missing userIds', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('non-empty array');
    });

    it('should reject empty userIds array', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({ userIds: [] });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('non-empty array');
    });

    it('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({ userIds: ['invalid-id'] });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid MongoDB ObjectIDs');
    });

    it('should pass with valid ObjectIds', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({ userIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/:id - Get User Validation', () => {
    it('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid user ID');
    });

    it('should pass with valid ObjectId', async () => {
      const response = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/users/:id - Update User Validation', () => {
    it('should reject invalid email in update', async () => {
      const response = await request(app)
        .put('/api/users/507f1f77bcf86cd799439011')
        .send({ email: 'invalid-email' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid email');
    });

    it('should pass with valid update data', async () => {
      const response = await request(app)
        .put('/api/users/507f1f77bcf86cd799439011')
        .send({ fullName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users - Search Query Validation', () => {
    it('should accept valid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?n=5&p=1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid search query parameter', async () => {
      const response = await request(app)
        .get('/api/users?q=john');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept search query with pagination', async () => {
      const response = await request(app)
        .get('/api/users?q=john&n=10&p=1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-string search query', async () => {
      const response = await request(app)
        .get('/api/users?q[]=invalid');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Search query must be a string');
    });

    it('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?n=0&p=-1');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Items per page must be between 1 and 100');
    });

    it('should accept empty search query', async () => {
      const response = await request(app)
        .get('/api/users?q=');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
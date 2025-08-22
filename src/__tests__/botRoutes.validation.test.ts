import request from 'supertest';
import express from 'express';
import botRoutes from '../routes/botRoutes';

// Mock the controller functions since we're only testing validation
jest.mock('../controllers/botController', () => ({
  createBot: (_req: any, res: any) => res.status(201).json({ success: true }),
  getAllBots: (_req: any, res: any) => res.status(200).json({ success: true }),
  getBotById: (_req: any, res: any) => res.status(200).json({ success: true }),
  getBotSubscribers: (_req: any, res: any) => res.status(200).json({ success: true }),
  updateBot: (_req: any, res: any) => res.status(200).json({ success: true }),
  deleteBot: (_req: any, res: any) => res.status(200).json({ success: true }),
  getSubscribedBots: (_req: any, res: any) => res.status(200).json({ success: true }),
  getBotPerformanceOverview: (_req: any, res: any) => res.status(200).json({ success: true }),
}));

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  auth: (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/bots', botRoutes);

describe('Bot Routes - Express Validator Integration', () => {
  describe('POST /api/bots - Create Bot Validation', () => {
    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot name is required');
    });

    it('should reject name that is too short', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'A',
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot name must be between 2 and 100 characters');
    });

    it('should reject name that is too long', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'A'.repeat(101),
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot name must be between 2 and 100 characters');
    });

    it('should reject missing description', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot description is required');
    });

    it('should reject description that is too short', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Short',
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot description must be between 10 and 500 characters');
    });

    it('should reject description that is too long', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'A'.repeat(501),
          recommendedCapital: 1000
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot description must be between 10 and 500 characters');
    });

    it('should reject missing recommendedCapital', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Test bot description that is long enough'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Recommended capital is required');
    });

    it('should reject negative recommendedCapital', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Test bot description that is long enough',
          recommendedCapital: -100
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Recommended capital must be a positive number');
    });

    it('should reject invalid performanceDuration', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000,
          performanceDuration: 0
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Performance duration must be a positive integer');
    });

    it('should reject invalid currency code', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000,
          currency: 'INVALID'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Currency must be a 3-character code');
    });

    it('should pass with valid bot data', async () => {
      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Test Bot',
          description: 'Test bot description that is long enough',
          recommendedCapital: 1000,
          performanceDuration: 30,
          currency: 'USD',
          script: 'test script'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/bots/:id - Get Bot Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid bot ID');
    });

    it('should pass with valid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/bots/:id - Update Bot Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .put('/api/bots/invalid-id')
        .send({ name: 'Updated Bot' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid bot ID');
    });

    it('should reject invalid name length', async () => {
      const response = await request(app)
        .put('/api/bots/507f1f77bcf86cd799439011')
        .send({ name: 'A' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot name must be between 2 and 100 characters');
    });

    it('should reject invalid description length', async () => {
      const response = await request(app)
        .put('/api/bots/507f1f77bcf86cd799439011')
        .send({ description: 'Short' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot description must be between 10 and 500 characters');
    });

    it('should reject negative recommended capital', async () => {
      const response = await request(app)
        .put('/api/bots/507f1f77bcf86cd799439011')
        .send({ recommendedCapital: -100 });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Recommended capital must be a positive number');
    });

    it('should pass with valid update data', async () => {
      const response = await request(app)
        .put('/api/bots/507f1f77bcf86cd799439011')
        .send({
          name: 'Updated Bot',
          description: 'Updated bot description that is long enough'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/bots/:id - Delete Bot Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .delete('/api/bots/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid bot ID');
    });

    it('should pass with valid bot ID', async () => {
      const response = await request(app)
        .delete('/api/bots/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/bots/:id/subscribers - Get Bot Subscribers Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/invalid-id/subscribers');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid bot ID');
    });

    it('should pass with valid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/507f1f77bcf86cd799439011/subscribers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/bots/:id/performance-overview - Get Bot Performance Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/invalid-id/performance-overview');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('valid bot ID');
    });

    it('should pass with valid bot ID', async () => {
      const response = await request(app)
        .get('/api/bots/507f1f77bcf86cd799439011/performance-overview');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
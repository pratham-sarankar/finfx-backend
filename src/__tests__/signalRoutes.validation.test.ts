import request from 'supertest';
import express from 'express';
import signalRoutes from '../routes/signalRoutes';

// Mock the controller functions since we're only testing validation
jest.mock('../controllers/signalController', () => ({
  createSignal: (_req: any, res: any) => res.status(201).json({ success: true }),
  createBulkSignals: (_req: any, res: any) => res.status(201).json({ success: true }),
  getAllSignals: (_req: any, res: any) => res.status(200).json({ success: true }),
  getUserSignals: (_req: any, res: any) => res.status(200).json({ success: true }),
  getSignalById: (_req: any, res: any) => res.status(200).json({ success: true }),
  updateSignal: (_req: any, res: any) => res.status(200).json({ success: true }),
  deleteSignal: (_req: any, res: any) => res.status(200).json({ success: true }),
  getSignalsByBot: (_req: any, res: any) => res.status(200).json({ success: true }),
}));

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  auth: (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/signals', signalRoutes);

describe('Signal Routes - Express Validator Integration', () => {
  describe('POST /api/signals - Create Signal Validation', () => {
    const validSignalData = {
      entryTime: '2024-01-01T12:00:00.000Z',
      entryPrice: 100.50,
      direction: 'LONG',
      userId: '507f1f77bcf86cd799439011',
      botId: '507f1f77bcf86cd799439012',
      lotSize: 1.0,
      pairName: 'BTCUSD'
    };

    it('should reject missing entryTime', async () => {
      const { entryTime, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Entry time is required');
    });

    it('should reject invalid entryTime format', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          entryTime: 'invalid-date'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Entry time must be a valid date');
    });

    it('should reject missing entryPrice', async () => {
      const { entryPrice, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Entry price is required');
    });

    it('should reject negative entryPrice', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          entryPrice: -100
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Entry price must be a positive number');
    });

    it('should reject missing direction', async () => {
      const { direction, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Direction is required');
    });

    it('should reject invalid direction values', async () => {
      const invalidDirections = ['buy', 'sell', 'long', 'short', 'INVALID'];
      
      for (const direction of invalidDirections) {
        const response = await request(app)
          .post('/api/signals')
          .send({
            ...validSignalData,
            direction
          });

        expect(response.body.status).toBe('fail');
        expect(response.body.message).toContain('Direction must be either LONG or SHORT');
      }
    });

    it('should accept only LONG or SHORT direction values', async () => {
      const validDirections = ['LONG', 'SHORT'];
      
      for (const direction of validDirections) {
        const response = await request(app)
          .post('/api/signals')
          .send({
            ...validSignalData,
            direction
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('should reject missing userId', async () => {
      const { userId, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('User ID is required');
    });

    it('should reject invalid userId format', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          userId: 'invalid-id'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('User ID must be a valid MongoDB ID');
    });

    it('should reject missing botId', async () => {
      const { botId, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot ID is required');
    });

    it('should reject invalid botId format', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          botId: 'invalid-id'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Bot ID must be a valid MongoDB ID');
    });

    it('should reject missing lotSize', async () => {
      const { lotSize, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Lot size is required');
    });

    it('should reject lotSize below minimum', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          lotSize: 0.005
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Lot size must be at least 0.01');
    });

    it('should reject missing pairName', async () => {
      const { pairName, ...invalidData } = validSignalData;
      const response = await request(app)
        .post('/api/signals')
        .send(invalidData);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Pair name is required');
    });

    it('should reject pairName that is too short', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          pairName: 'AB'
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Pair name must be between 3 and 50 characters');
    });

    it('should reject pairName that is too long', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          pairName: 'A'.repeat(51)
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Pair name must be between 3 and 50 characters');
    });

    it('should accept valid signal data', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send(validSignalData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should accept optional fields', async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          ...validSignalData,
          stopLossPrice: 95.0,
          targetPrice: 110.0
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/signals/bulk - Create Bulk Signals Validation', () => {
    const validSignalData = {
      entryTime: '2024-01-01T12:00:00.000Z',
      entryPrice: 100.50,
      direction: 'LONG'
    };

    it('should reject missing signals array', async () => {
      const response = await request(app)
        .post('/api/signals/bulk')
        .send({});

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Signals must be a non-empty array');
    });

    it('should reject empty signals array', async () => {
      const response = await request(app)
        .post('/api/signals/bulk')
        .send({ signals: [] });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Signals must be a non-empty array');
    });

    it('should reject signals with invalid direction', async () => {
      const response = await request(app)
        .post('/api/signals/bulk')
        .send({
          signals: [{
            ...validSignalData,
            direction: 'buy'
          }]
        });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Direction must be either LONG or SHORT for all signals');
    });

    it('should accept valid bulk signals', async () => {
      const response = await request(app)
        .post('/api/signals/bulk')
        .send({
          signals: [validSignalData]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/signals/:id - Get Signal Validation', () => {
    it('should reject invalid signal ID', async () => {
      const response = await request(app)
        .get('/api/signals/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Please provide a valid signal ID');
    });

    it('should pass with valid signal ID', async () => {
      const response = await request(app)
        .get('/api/signals/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/signals/:id - Update Signal Validation', () => {
    it('should reject invalid signal ID', async () => {
      const response = await request(app)
        .put('/api/signals/invalid-id')
        .send({ direction: 'LONG' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Please provide a valid signal ID');
    });

    it('should reject invalid direction', async () => {
      const response = await request(app)
        .put('/api/signals/507f1f77bcf86cd799439011')
        .send({ direction: 'buy' });

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Direction must be either LONG or SHORT');
    });

    it('should accept valid LONG direction', async () => {
      const response = await request(app)
        .put('/api/signals/507f1f77bcf86cd799439011')
        .send({ direction: 'LONG' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid SHORT direction', async () => {
      const response = await request(app)
        .put('/api/signals/507f1f77bcf86cd799439011')
        .send({ direction: 'SHORT' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid update data', async () => {
      const response = await request(app)
        .put('/api/signals/507f1f77bcf86cd799439011')
        .send({
          entryPrice: 105.0,
          profitLoss: 50.0
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/signals/:id - Delete Signal Validation', () => {
    it('should reject invalid signal ID', async () => {
      const response = await request(app)
        .delete('/api/signals/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Please provide a valid signal ID');
    });

    it('should pass with valid signal ID', async () => {
      const response = await request(app)
        .delete('/api/signals/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/signals/bot/:botId - Get Signals by Bot Validation', () => {
    it('should reject invalid bot ID', async () => {
      const response = await request(app)
        .get('/api/signals/bot/invalid-id');

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Please provide a valid bot ID');
    });

    it('should pass with valid bot ID', async () => {
      const response = await request(app)
        .get('/api/signals/bot/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
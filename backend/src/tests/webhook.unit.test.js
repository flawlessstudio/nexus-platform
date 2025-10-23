const request = require('supertest');
const express = require('express');

// Mock env with a dynamic getter so tests can override values per-case
let mockEnv;
jest.mock('../utils/env.js', () => ({
  get env() {
    return mockEnv;
  },
}));

// Mock Stripe SDK: we expose a constructor whose instances have webhooks.constructEvent
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

// Mock Supabase admin client
const mockInsert = jest.fn(async () => ({ error: null }));
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
jest.mock('../utils/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: (table) => mockFrom(table) },
}));

// Helper to build an express app mounting the webhook router with rawBody support
async function buildAppWithWebhook() {
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));
  const { default: webhookRoutes } = await import('../routes/webhookRoutes.js');
  app.use('/api/payments', webhookRoutes);
  return app;
}

describe('Webhook route unit tests', () => {
  beforeEach(() => {
    jest.resetModules();
    mockConstructEvent.mockReset();
    mockInsert.mockReset();
    mockFrom.mockClear();
    mockEnv = {
      NODE_ENV: 'test',
      STRIPE_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    };
  });

  test('500 when webhook secret not configured', async () => {
    mockEnv = { NODE_ENV: 'test', STRIPE_KEY: 'sk', STRIPE_WEBHOOK_SECRET: undefined };
    const app = await buildAppWithWebhook();
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 't')
      .send({});
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Webhook secret not configured/);
  });

  test('400 when missing signature header', async () => {
    const app = await buildAppWithWebhook();
    const res = await request(app).post('/api/payments/webhook').send({});
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Missing signature or raw body/);
  });

  test('400 on failed signature validation', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
    const app = await buildAppWithWebhook();
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'sig')
      .send({ any: 'body' });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Webhook Error: Invalid signature/);
  });

  test('enqueues event and responds 200 on success', async () => {
    mockConstructEvent.mockReturnValue({ id: 'evt_1', type: 'charge.succeeded' });
    mockInsert.mockResolvedValue({ error: null });
    const app = await buildAppWithWebhook();
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'sig')
      .send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true, enqueued: true });
    expect(mockFrom).toHaveBeenCalledWith('webhook_queue');
    expect(mockInsert).toHaveBeenCalledWith({ event_id: 'evt_1', event_type: 'charge.succeeded', payload: { id: 'evt_1', type: 'charge.succeeded' } });
  });

  test('logs when enqueue reports error but still returns 200', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({ id: 'evt_2', type: 'invoice.paid' });
    mockInsert.mockResolvedValue({ error: { message: 'duplicate key' } });
    const app = await buildAppWithWebhook();
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'sig')
      .send({});
    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

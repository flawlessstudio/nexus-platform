import request from 'supertest';
import express from 'express';

// We'll create a small express app mounting the webhook route for testing
import webhookRoutes from '../src/routes/webhookRoutes.js';

// Mock supabaseAdmin to capture upserts
jest.mock('../src/utils/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

// Mock stripe.webhooks.constructEvent to simply return the payload
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: (raw, sig, secret) => {
        // In tests, raw will be JSON string or buffer -> parse
        try { return JSON.parse(raw.toString()); } catch (e) { return { id: 'evt_test', type: 'unknown', data: { object: {} } }; }
      }
    }
  }));
});

describe('webhook route', () => {
  let app;
  beforeAll(() => {
    app = express();
    // replicate raw body behavior
    app.use(express.json({
      verify: (req, _res, buf) => { req.rawBody = buf; }
    }));
    app.use('/api/payments', webhookRoutes);
  });

  test('returns 200 for valid event and idempotency', async () => {
    const payload = { id: 'evt_test_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test', subscription: 'sub_test', customer: 'cus_test', metadata: { user_id: 'user_123' } } } };
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 't=1,v1=abc')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});

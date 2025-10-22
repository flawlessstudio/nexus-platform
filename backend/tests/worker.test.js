// Mock Sentry to avoid requiring the real package during tests
jest.mock('@sentry/node', () => ({
  addBreadcrumb: () => { },
  captureException: () => { },
}), { virtual: true });

import { processQueue } from '../src/workers/processWebhookQueue.js';

// Mock supabaseAdmin and capture upsert payloads
const captured = { upserts: [] };
jest.mock('../src/utils/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: () => {
      // chainable query object that resolves to { data: [], error: null } when awaited
      const result = { data: [], error: null };
      const q = {
        then: (onFulfilled) => {
          try {
            const res = onFulfilled(result);
            return Promise.resolve(res);
          } catch (e) {
            return Promise.reject(e);
          }
        },
        catch: () => Promise.resolve(),
        eq: () => q,
        limit: () => q,
        order: () => q,
      };

      return {
        select: () => q,
        insert: async () => ({ error: null }),
        upsert: async (payload) => { captured.upserts.push(payload); return { error: null }; },
        update: async () => ({ error: null }),
      };
    },
  },
}));

describe('worker', () => {
  test('processQueue runs without throwing', async () => {
    await expect(processQueue({ limit: 1 })).resolves.not.toThrow();

    // Snapshot any captured upsert payloads (normalize timestamps/ids)
    const normalizedUpserts = captured.upserts.map((u) => {
      const copy = { ...u };
      if (copy.current_period_end) copy.current_period_end = '<DATE>';
      if (copy.raw && copy.raw.id) copy.raw = { ...copy.raw, id: '<RAW_ID>' };
      return copy;
    });
    expect(normalizedUpserts).toMatchSnapshot();
  });
});

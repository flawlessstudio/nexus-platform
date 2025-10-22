import { processQueue } from '../src/workers/processWebhookQueue.js';

// Mock supabaseAdmin
jest.mock('../src/utils/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
      update: async () => ({ error: null }),
    }),
  },
}));

describe('worker', () => {
  test('processQueue runs without throwing', async () => {
    await expect(processQueue({ limit: 1 })).resolves.not.toThrow();
  });
});

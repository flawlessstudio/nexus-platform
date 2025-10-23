// Unit tests for the webhook queue worker
let mockSupabase;
let mockFromReturn;
jest.mock('../utils/supabaseAdmin.js', () => ({
  get supabaseAdmin() {
    return mockSupabase;
  },
}));

const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('processWebhookQueueOnce', () => {
  let processWebhookQueueOnce;

  beforeEach(async () => {
    jest.resetModules();
    warnSpy.mockClear();

    // Build a chainable supabase mock
    const mockDeleteEq = jest.fn(async () => ({ data: null, error: null }));
    mockFromReturn = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      // terminal on queue fetch
      limit: jest.fn(async () => ({ data: [], error: null })),
      // terminal on processed check
      eq: jest.fn(async () => ({ data: [], error: null })),
      insert: jest.fn(async () => ({ data: null, error: null })),
      delete: jest.fn(() => ({ eq: mockDeleteEq })),
    };
    mockSupabase = { from: jest.fn(() => mockFromReturn) };

    ({ processWebhookQueueOnce } = await import('../workers/processWebhookQueue.js'));
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  test('returns false and warns when admin client missing', async () => {
    mockSupabase = null;
    ({ processWebhookQueueOnce } = await import('../workers/processWebhookQueue.js'));
    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  test('returns false when select fails', async () => {
    mockFromReturn.limit.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed to select/), expect.anything());
  });

  test('no-op when no items in queue', async () => {
    mockFromReturn.limit.mockResolvedValueOnce({ data: [], error: null });
    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(false);
  });

  test('deletes duplicate events and returns true', async () => {
    // queue select
    mockFromReturn.limit.mockResolvedValueOnce({ data: [{ id: 1, event_id: 'evt_dup' }], error: null });
    // processed check
    mockFromReturn.eq.mockResolvedValueOnce({ data: [{ event_id: 'evt_dup' }], error: null });

    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(true);
    // should delete from queue
    expect(mockFromReturn.delete).toHaveBeenCalled();
  });

  test('records new event and deletes from queue', async () => {
    // queue select
    mockFromReturn.limit.mockResolvedValueOnce({ data: [{ id: 2, event_id: 'evt_new' }], error: null });
    // processed check none
    mockFromReturn.eq.mockResolvedValueOnce({ data: [], error: null });

    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(true);
    expect(mockFromReturn.insert).toHaveBeenCalledWith({ event_id: 'evt_new' });
    expect(mockFromReturn.delete).toHaveBeenCalled();
  });

  test('leaves in queue when insert fails (retry path)', async () => {
    mockFromReturn.limit.mockResolvedValueOnce({ data: [{ id: 3, event_id: 'evt_fail' }], error: null });
    mockFromReturn.eq.mockResolvedValueOnce({ data: [], error: null });
    mockFromReturn.insert.mockResolvedValueOnce({ data: null, error: new Error('insert-failed') });

    const ok = await processWebhookQueueOnce();
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed to record/), expect.anything());
    // delete should not have been called
    expect(mockFromReturn.delete).not.toHaveBeenCalled();
  });
});

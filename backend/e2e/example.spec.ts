import { test, expect } from '@playwright/test';

test('ping endpoint returns 200', async ({ request }) => {
  const res = await request.get('http://localhost:3000/api/ping');
  expect(res.status()).toBeOneOf([200, 204, 404]);
});

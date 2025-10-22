import request from 'supertest';
import app from '../app';
import db from '../config/db';
jest.mock('../config/db');
describe('Auth Routes', () => {
  it('should register a new user successfully', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com' }] });
    const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });
    expect(res.statusCode).toEqual(201);
  });
});

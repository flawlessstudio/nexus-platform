const request = require('supertest');
const app = require('../app'); // Assuming your express app is exported from app.js
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Mock the model layer
jest.mock('../models/userModel');
jest.mock('../utils/logger');

describe('Admin Bulk Actions', () => {
  let adminToken;
  const adminUser = { id: 99, role: 'admin' };

  beforeAll(() => {
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/users/bulk-actions', () => {
    it('should deactivate multiple users and return a success message', async () => {
      const userIdsToDeactivate = [1, 2, 3];
      userModel.bulkDeactivate.mockResolvedValue(3); // Mock returns number of affected rows

      const res = await request(app)
        .post('/api/admin/users/bulk-actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: userIdsToDeactivate, action: 'deactivate' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Successfully deactivated 3 user(s).');
      expect(userModel.bulkDeactivate).toHaveBeenCalledWith(userIdsToDeactivate);
    });

    it('should filter out the admin\'s own ID and still process other users', async () => {
      const userIdsToDeactivate = [1, 2, adminUser.id]; // Includes admin's own ID
      const filteredIds = [1, 2];
      userModel.bulkDeactivate.mockResolvedValue(2);

      const res = await request(app)
        .post('/api/admin/users/bulk-actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: userIdsToDeactivate, action: 'deactivate' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Successfully deactivated 2 user(s).');
      expect(userModel.bulkDeactivate).toHaveBeenCalledWith(filteredIds);
    });
  });
});

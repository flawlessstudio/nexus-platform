const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const userController = require('../controllers/userController');

const router = express.Router();

// All routes in this file are protected and require authentication
router.use(authenticate);

// All routes hereafter require 'admin' role
router.use(authorize(['admin']));

// User management routes for admins
router.get('/users', userController.getAllUsers);
router.patch('/users/:id', userController.updateUser);
router.post('/users/bulk-actions', userController.bulkUpdateUsers);

module.exports = router;

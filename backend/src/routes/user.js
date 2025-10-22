const express = require('express');
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { validate } = require('../middleware/validation');
const { updateProfileSchema } = require('../utils/validationSchemas');

const router = express.Router();

// All routes in this file are for the authenticated user.
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMyProfile);

module.exports = router;

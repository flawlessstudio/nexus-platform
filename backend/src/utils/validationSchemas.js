const { body } = require('express-validator');
exports.registerSchema = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('countryOfOrigin').optional().trim(),
];
exports.loginSchema = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];
exports.updateUserSchema = [
  // Role must be one of the allowed values. This is optional.
  body('role').optional().isIn(['user', 'admin']),
  // is_active must be a boolean. This is optional.
  body('is_active').optional().isBoolean(),
];

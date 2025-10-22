const rateLimit = require('express-rate-limit');

// Basic rate limiting for sensitive endpoints like login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
});

module.exports = { loginLimiter };

const logger = require('../utils/logger');
exports.errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  res.status(statusCode).json({ error: message });
};
exports.notFoundHandler = (req, res, next) => {
  res.status(404).json({ error: 'Resource not found.' });
};

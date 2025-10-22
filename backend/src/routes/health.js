import express from 'express';

const router = express.Router();

// A simple health check endpoint for uptime monitoring.
// It can be expanded later to check database connectivity or other vital services.
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;

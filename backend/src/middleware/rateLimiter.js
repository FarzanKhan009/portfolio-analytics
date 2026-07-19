const { redis } = require('../services/redis');

/**
 * Sliding Window Rate Limiter Middleware
 * Allows a configurable number of requests per window.
 * Uses Redis Sorted Sets (ZSET).
 */
function rateLimiter({ windowMs = 60000, maxRequests = 100, keyPrefix = 'rl' } = {}) {
  return async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const clearBefore = now - windowMs;

    try {
      // Use transaction to ensure atomic execution
      const multi = redis.multi();
      multi.zRemRangeByScore(key, 0, clearBefore); // Remove old requests
      multi.zCard(key); // Count active requests
      multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` }); // Add current request
      multi.expire(key, Math.ceil(windowMs / 1000)); // Set key expiration

      const results = await multi.exec();
      const activeRequests = results[1];

      if (activeRequests >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000}s allowed.`,
        });
      }

      next();
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail open to prevent database down blocking traffic
      next();
    }
  };
}

module.exports = rateLimiter;

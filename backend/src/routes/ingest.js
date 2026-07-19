const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { insert } = require('../services/clickhouse');
const { redis } = require('../services/redis');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/* Rate limit ingestion endpoint to 10 requests per 10 seconds per IP */
const ingestLimit = rateLimiter({
  windowMs: 10000,
  maxRequests: 10,
  keyPrefix: 'rl:ingest',
});

router.post('/', ingestLimit, async (req, res) => {
  const { event_type, page, referrer, user_id, session_id, revenue } = req.body;

  if (!event_type || !page) {
    return res.status(400).json({ error: 'Missing required fields: event_type, page' });
  }

  const eventId = uuidv4();
  const timestamp = new Date();
  
  // Resolve client attributes
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Basic browser detection from User-Agent
  let browser = 'Other';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Basic mobile/desktop device detection
  let device = 'desktop';
  if (/mobile/i.test(userAgent)) device = 'mobile';
  else if (/tablet/i.test(userAgent)) device = 'tablet';

  // Basic geo-country fallback (mocked for local dev, usually GeoIP)
  const countries = ['US', 'PK', 'GB', 'DE', 'CA', 'AU', 'IN', 'FR'];
  const country = req.headers['cf-ipcountry'] || countries[Math.floor(Math.random() * countries.length)];

  const eventRecord = {
    event_id: eventId,
    event_type,
    timestamp: timestamp.toISOString().slice(0, 23).replace('T', ' '),
    user_id: user_id || `usr_anon_${Math.floor(Math.random() * 100000)}`,
    session_id: session_id || `ses_anon_${Math.floor(Math.random() * 100000)}`,
    page,
    referrer: referrer || 'Direct',
    device,
    country,
    browser,
    revenue: parseFloat(revenue) || 0,
  };

  try {
    // Ingest into ClickHouse async (no await to keep response time fast)
    insert('analytics_db.events', [eventRecord]).catch((err) =>
      console.error('ClickHouse Deferred Ingest Error:', err)
    );

    // Track active user session in Redis for live telemetry counter (5-min sliding window)
    const redisKey = `active_users:${eventRecord.user_id}`;
    await redis.set(redisKey, 'active', { EX: 300 });

    res.status(202).json({
      status: 'accepted',
      event_id: eventId,
      processed_at: timestamp,
    });
  } catch (error) {
    console.error('Ingestion Router Error:', error);
    res.status(500).json({ error: 'Failed to queue event ingestion' });
  }
});

module.exports = router;

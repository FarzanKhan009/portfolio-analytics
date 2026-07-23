/**
 * POST /api/ingest
 *
 * Accepts analytics events. Now supports new fields:
 * impressions, ad_requests, session_duration, is_bounce, utm_source, utm_medium, utm_campaign, os.
 * Also tracks events-per-minute Redis sorted set for realtime eventsPerMinute metric.
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { insert } = require('../services/clickhouse');
const { redis } = require('../services/redis');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

const ingestLimit = rateLimiter({
  windowMs:    10000,
  maxRequests: 10,
  keyPrefix:   'rl:ingest',
});

// Enhanced User-Agent parsing
function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return { browser: 'Other', device: 'desktop', os: '' };

  let browser = 'Other';
  if (ua.includes('Edg/') || ua.includes('Edge'))             browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera'))        browser = 'Opera';
  else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome'))   browser = 'Safari';
  else if (ua.includes('Firefox'))                            browser = 'Firefox';

  let device = 'desktop';
  if (/mobile/i.test(ua))       device = 'mobile';
  else if (/tablet/i.test(ua))  device = 'tablet';
  else if (/iPad/i.test(ua))    device = 'tablet';

  let os = '';
  if (/Windows/i.test(ua))      os = 'Windows';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua))os = 'macOS';
  else if (/Linux/i.test(ua))   os = 'Linux';

  return { browser, device, os };
}

router.post('/', ingestLimit, async (req, res) => {
  const {
    event_type, page, referrer, user_id, session_id, revenue,
    // New fields
    impressions, ad_requests, session_duration, is_bounce,
    utm_source, utm_medium, utm_campaign, screen_width,
  } = req.body;

  if (!event_type || !page) {
    return res.status(400).json({ error: 'Missing required fields: event_type, page' });
  }

  const eventId   = uuidv4();
  const timestamp = new Date();
  const ip        = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const { browser, device, os } = parseUserAgent(userAgent);

  // Country resolution: Cloudflare header, otherwise random pool (dev)
  const countries = ['US', 'PK', 'GB', 'DE', 'CA', 'AU', 'IN', 'FR', 'SG', 'NL'];
  const country   = req.headers['cf-ipcountry'] || countries[Math.floor(Math.random() * countries.length)];

  // ClickHouse DateTime64(3) format
  const tsFormatted = timestamp.toISOString().slice(0, 23).replace('T', ' ');

  const eventRecord = {
    event_id:         eventId,
    event_type,
    timestamp:        tsFormatted,
    user_id:          user_id    || `usr_anon_${Math.floor(Math.random() * 100000)}`,
    session_id:       session_id || `ses_anon_${Math.floor(Math.random() * 100000)}`,
    page,
    referrer:         referrer       || 'Direct',
    device,
    country,
    browser,
    os:               os             || '',
    revenue:          parseFloat(revenue)          || 0,
    impressions:      parseInt(impressions)         || 0,
    ad_requests:      parseInt(ad_requests)         || 0,
    session_duration: parseInt(session_duration)    || 0,
    is_bounce:        is_bounce ? 1 : 0,
    utm_source:       utm_source     || '',
    utm_medium:       utm_medium     || '',
    utm_campaign:     utm_campaign   || '',
    screen_width:     parseInt(screen_width)        || 0,
  };

  try {
    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';

    // Async ClickHouse ingest (non-blocking)
    insert(`${DB}.events`, [eventRecord]).catch((err) =>
      console.error('ClickHouse Deferred Ingest Error:', err)
    );

    // Active user session (5-min sliding window)
    const redisKey = `active_users:${eventRecord.user_id}`;
    await redis.set(redisKey, 'active', { EX: 300 });

    // Events-per-minute sorted set for realtime eventsPerMinute metric
    try {
      const nowMs = Date.now();
      await redis.zAdd('events_per_minute', [{ score: nowMs, member: `${eventId}:${nowMs}` }]);
      // Trim entries older than 2 minutes (keep some buffer)
      await redis.zRemRangeByScore('events_per_minute', 0, nowMs - 120_000);
    } catch (e) {
      // Non-fatal — realtime EPM just won't show
    }

    // Invalidate all dashboard caches on ingest
    try {
      const cachePatterns = ['stats:*', 'timeseries:*', 'breakdowns:*', 'funnel:*'];
      for (const pattern of cachePatterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(keys);
      }
    } catch (cacheErr) {
      console.error('Redis Invalidation Error:', cacheErr);
    }

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

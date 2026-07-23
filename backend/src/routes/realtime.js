/**
 * GET /api/realtime         — snapshot (JSON, polling fallback)
 * GET /api/realtime/stream  — SSE push every 3s (preferred)
 *
 * Returns:
 *   activeUsers    — Redis key count (5-min sliding window)
 *   recentEvents   — last 30 events from ClickHouse
 *   eventsPerMinute — events in last 60 seconds from Redis sorted set
 */
const express = require('express');
const { redis } = require('../services/redis');
const { query } = require('../services/clickhouse');

const router = express.Router();

async function getRealtimeSnapshot() {
  const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';

  // 1. Active users from Redis (5-min sliding window)
  const keys = await redis.keys('active_users:*');
  let activeUsers = keys.length;

  if (activeUsers === 0) {
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 23).replace('T', ' ');
    const fallbackResult = await query(
      `SELECT uniq(user_id) AS active_count FROM ${DB}.events WHERE timestamp >= toDateTime64({minutesAgo: String}, 3)`,
      { minutesAgo }
    );
    activeUsers = parseInt(fallbackResult[0]?.active_count) || 0;
  }

  // 2. Events per minute from Redis sorted set
  const oneMinAgo = Date.now() - 60 * 1000;
  let eventsPerMinute = 0;
  try {
    eventsPerMinute = await redis.zCount('events_per_minute', oneMinAgo, '+inf');
  } catch (e) {
    eventsPerMinute = 0;
  }

  // 3. Last 30 events from ClickHouse
  const recentSql = `
    SELECT
      event_type,
      timestamp,
      page,
      country,
      device,
      browser,
      referrer,
      revenue
    FROM ${DB}.events
    ORDER BY timestamp DESC
    LIMIT 30
  `;
  const recentEvents = await query(recentSql);

  return {
    activeUsers,
    eventsPerMinute,
    recentEvents: recentEvents.map((e) => ({
      eventType:  e.event_type,
      timestamp:  e.timestamp,
      page:       e.page,
      country:    e.country,
      device:     e.device,
      browser:    e.browser,
      referrer:   e.referrer,
      revenue:    parseFloat(e.revenue) || 0,
    })),
  };
}

// Standard JSON snapshot endpoint (polling fallback)
router.get('/', async (req, res) => {
  try {
    const data = await getRealtimeSnapshot();
    res.json(data);
  } catch (error) {
    console.error('Realtime Router Error:', error);
    res.status(500).json({ error: 'Real-time telemetry query failed' });
  }
});

// Server-Sent Events stream endpoint — pushes every 3 seconds
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx/Cloudflare: disable proxy buffering
  res.flushHeaders();

  // Send initial data immediately
  getRealtimeSnapshot()
    .then((data) => res.write(`data: ${JSON.stringify(data)}\n\n`))
    .catch(() => {});

  // Push every 3 seconds
  const interval = setInterval(async () => {
    try {
      const data = await getRealtimeSnapshot();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('SSE push error:', err);
    }
  }, 3000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

module.exports = router;

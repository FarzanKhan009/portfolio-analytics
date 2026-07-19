const express = require('express');
const { redis } = require('../services/redis');
const { query } = require('../services/clickhouse');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // 1. Scan Redis for active user sessions (live visitors count in last 5 mins)
    const keys = await redis.keys('active_users:*');
    let activeUsers = keys.length;

    // Fallback: If local Redis has no active keys (e.g. fresh startup),
    // grab last 5 mins from ClickHouse to make sure the dashboard is initialized
    if (activeUsers === 0) {
      const minutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 23).replace('T', ' ');
      const fallbackSql = `
        SELECT uniq(user_id) as active_count
        FROM analytics_db.events
        WHERE timestamp >= toDateTime64({minutesAgo: String}, 3)
      `;
      const fallbackResult = await query(fallbackSql, { minutesAgo });
      activeUsers = parseInt(fallbackResult[0].active_count) || 0;
    }

    // 2. Fetch the last 10 live incoming pageview events from ClickHouse for the live ticker widget
    const recentEventsSql = `
      SELECT
        event_type,
        timestamp,
        page,
        country,
        device
      FROM analytics_db.events
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const recentEvents = await query(recentEventsSql);

    res.json({
      activeUsers,
      recentEvents: recentEvents.map((e) => ({
        eventType: e.event_type,
        timestamp: e.timestamp,
        page: e.page,
        country: e.country,
        device: e.device,
      })),
    });
  } catch (error) {
    console.error('Realtime Router Error:', error);
    res.status(500).json({ error: 'Real-time telemetry query failed' });
  }
});

module.exports = router;

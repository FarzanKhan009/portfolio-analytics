/**
 * GET /api/sparklines
 *
 * Returns per-day values for the last 7 days for each KPI metric.
 * Used to power the mini sparkline bar charts in KPI cards.
 * Cache TTL: 10 minutes (stable historical data).
 */
const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const cacheKey = `sparklines:v1:${new Date().toISOString().slice(0, 10)}`; // daily cache key

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';

    const sql = `
      SELECT
        toDate(timestamp) AS day,
        countIf(event_type = 'pageview')                        AS pageviews,
        uniq(user_id)                                           AS unique_users,
        countIf(event_type = 'purchase')                        AS purchases,
        sumIf(revenue, event_type = 'purchase')                 AS revenue,
        sum(impressions)                                        AS impressions,
        uniq(session_id)                                        AS sessions,
        avgIf(is_bounce, event_type = 'pageview') * 100        AS bounce_rate
      FROM ${DB}.events
      WHERE toDate(timestamp) >= today() - 7
        AND toDate(timestamp) < today()
      GROUP BY day
      ORDER BY day ASC
    `;

    const rows = await query(sql);

    // Build arrays keyed by metric, sorted by day
    const sparklines = {
      pageviews:   [],
      uniqueUsers: [],
      purchases:   [],
      revenue:     [],
      impressions: [],
      sessions:    [],
      bounceRate:  [],
    };

    rows.forEach((row) => {
      sparklines.pageviews.push(parseInt(row.pageviews)   || 0);
      sparklines.uniqueUsers.push(parseInt(row.unique_users) || 0);
      sparklines.purchases.push(parseInt(row.purchases)   || 0);
      sparklines.revenue.push(parseFloat(parseFloat(row.revenue).toFixed(2)) || 0);
      sparklines.impressions.push(parseInt(row.impressions) || 0);
      sparklines.sessions.push(parseInt(row.sessions)     || 0);
      sparklines.bounceRate.push(parseFloat(parseFloat(row.bounce_rate).toFixed(1)) || 0);
    });

    const result = { sparklines, days: rows.map((r) => r.day) };
    await setCache(cacheKey, result, 600); // 10 min cache
    res.json(result);
  } catch (error) {
    console.error('Sparklines Route Error:', error);
    res.status(500).json({ error: 'Sparkline query failed' });
  }
});

module.exports = router;

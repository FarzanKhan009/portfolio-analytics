const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = req.query.to || new Date().toISOString().split('T')[0];
  
  // Granularity can be 'day' or 'hour'
  const granularity = req.query.granularity === 'hour' ? 'hour' : 'day';

  const cacheKey = `timeseries:${granularity}:${from}:${to}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json({ timeseries: cachedData, cached: true });
    }

    let sql = '';
    if (granularity === 'hour') {
      sql = `
        SELECT
          toStartOfHour(timestamp) as time_bucket,
          countIf(event_type = 'pageview') as pageviews,
          uniq(user_id) as unique_users,
          countIf(event_type = 'purchase') as purchases,
          sumIf(revenue, event_type = 'purchase') as revenue
        FROM analytics_db.events
        WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
          AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `;
    } else {
      sql = `
        SELECT
          toDate(timestamp) as time_bucket,
          countIf(event_type = 'pageview') as pageviews,
          uniq(user_id) as unique_users,
          countIf(event_type = 'purchase') as purchases,
          sumIf(revenue, event_type = 'purchase') as revenue
        FROM analytics_db.events
        WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
          AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `;
    }

    const results = await query(sql, { from, to });

    const formatted = results.map((row) => ({
      timestamp: row.time_bucket,
      pageviews: parseInt(row.pageviews) || 0,
      uniqueUsers: parseInt(row.unique_users) || 0,
      purchases: parseInt(row.purchases) || 0,
      revenue: parseFloat(parseFloat(row.revenue).toFixed(2)) || 0,
    }));

    await setCache(cacheKey, formatted, 60);

    res.json({ timeseries: formatted });
  } catch (error) {
    console.error('Timeseries Router Error:', error);
    res.status(500).json({ error: 'ClickHouse timeseries query failed' });
  }
});

module.exports = router;

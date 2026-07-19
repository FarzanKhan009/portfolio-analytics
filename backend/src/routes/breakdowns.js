const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = req.query.to || new Date().toISOString().split('T')[0];

  const cacheKey = `breakdowns:${from}:${to}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    // 1. Pages Breakdown (Top Pages)
    const pagesSql = `
      SELECT
        page,
        count() as views,
        uniq(user_id) as visitors
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
        AND event_type = 'pageview'
      GROUP BY page
      ORDER BY views DESC
      LIMIT 10
    `;
    const pagesResult = await query(pagesSql, { from, to });

    // 2. Devices Breakdown
    const devicesSql = `
      SELECT
        device,
        count() as count
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
      GROUP BY device
      ORDER BY count DESC
    `;
    const devicesResult = await query(devicesSql, { from, to });

    // 3. Countries Breakdown (Top Countries)
    const countriesSql = `
      SELECT
        country,
        count() as count
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
      GROUP BY country
      ORDER BY count DESC
      LIMIT 8
    `;
    const countriesResult = await query(countriesSql, { from, to });

    // 4. Referrers Breakdown (Traffic Sources)
    const referrersSql = `
      SELECT
        referrer,
        count() as count
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 5
    `;
    const referrersResult = await query(referrersSql, { from, to });

    const breakdowns = {
      pages: pagesResult.map((r) => ({ page: r.page, views: parseInt(r.views), visitors: parseInt(r.visitors) })),
      devices: devicesResult.map((r) => ({ name: r.device, value: parseInt(r.count) })),
      countries: countriesResult.map((r) => ({ name: r.country, value: parseInt(r.count) })),
      referrers: referrersResult.map((r) => ({ name: r.referrer, value: parseInt(r.count) })),
    };

    await setCache(cacheKey, breakdowns, 60);

    res.json(breakdowns);
  } catch (error) {
    console.error('Breakdowns Router Error:', error);
    res.status(500).json({ error: 'ClickHouse query failed' });
  }
});

module.exports = router;

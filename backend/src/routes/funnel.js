/**
 * GET /api/funnel
 *
 * Returns conversion funnel step counts for the requested date range.
 * Funnel stages: Pageviews → Clicks → Signups → Purchases
 *
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 * Cache TTL: 60 seconds.
 */
const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to   = req.query.to   || new Date().toISOString().split('T')[0];
  const cacheKey = `funnel:v1:${from}:${to}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';

    const sql = `
      SELECT
        countIf(event_type = 'pageview')  AS pageviews,
        countIf(event_type = 'click')     AS clicks,
        countIf(event_type = 'signup')    AS signups,
        countIf(event_type = 'purchase')  AS purchases
      FROM ${DB}.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
    `;

    const rows = await query(sql, { from, to });
    const r = rows[0];

    const pageviews = parseInt(r.pageviews) || 0;
    const clicks    = parseInt(r.clicks)    || 0;
    const signups   = parseInt(r.signups)   || 0;
    const purchases = parseInt(r.purchases) || 0;

    // Build funnel with drop-off percentages
    const steps = [
      { step: 'Pageviews',  count: pageviews, dropPct: null },
      { step: 'Clicks',     count: clicks,    dropPct: pageviews > 0 ? parseFloat((((pageviews - clicks) / pageviews) * 100).toFixed(1)) : null },
      { step: 'Signups',    count: signups,   dropPct: clicks    > 0 ? parseFloat((((clicks    - signups) / clicks)    * 100).toFixed(1)) : null },
      { step: 'Purchases',  count: purchases, dropPct: signups   > 0 ? parseFloat((((signups - purchases) / signups)   * 100).toFixed(1)) : null },
    ];

    // Overall conversion rate (end-to-end)
    const overallConversion = pageviews > 0
      ? parseFloat(((purchases / pageviews) * 100).toFixed(3))
      : 0;

    const result = { funnel: steps, overallConversion, period: { from, to } };
    await setCache(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    console.error('Funnel Route Error:', error);
    res.status(500).json({ error: 'Funnel query failed' });
  }
});

module.exports = router;

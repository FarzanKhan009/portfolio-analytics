/**
 * GET /api/timeseries
 *
 * Time-bucketed analytics data (day/hour/week granularity).
 * Supports filter params: country, device, browser, referrer, page.
 * New columns: impressions, sessions, bounceRate.
 */
const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

function buildFilters(req) {
  const clauses = [];
  const params  = {};

  if (req.query.country) {
    const countries = req.query.country.split(',').map((c) => c.trim()).filter(Boolean);
    clauses.push(`country IN (${countries.map((c, i) => `{c${i}: String}`).join(', ')})`);
    countries.forEach((c, i) => { params[`c${i}`] = c; });
  }
  if (req.query.device) {
    const devices = req.query.device.split(',').map((d) => d.trim()).filter(Boolean);
    clauses.push(`device IN (${devices.map((d, i) => `{d${i}: String}`).join(', ')})`);
    devices.forEach((d, i) => { params[`d${i}`] = d; });
  }
  if (req.query.browser) {
    const browsers = req.query.browser.split(',').map((b) => b.trim()).filter(Boolean);
    clauses.push(`browser IN (${browsers.map((b, i) => `{br${i}: String}`).join(', ')})`);
    browsers.forEach((b, i) => { params[`br${i}`] = b; });
  }
  if (req.query.referrer) {
    clauses.push(`referrer ILIKE {referrer: String}`);
    params.referrer = `%${req.query.referrer}%`;
  }
  if (req.query.page) {
    clauses.push(`page = {page: String}`);
    params.page = req.query.page;
  }

  return { filterSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '', filterParams: params };
}

router.get('/', async (req, res) => {
  const from        = req.query.from        || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to          = req.query.to          || new Date().toISOString().split('T')[0];
  const rawGran     = req.query.granularity || 'day';
  const granularity = ['hour', 'day', 'week'].includes(rawGran) ? rawGran : 'day';

  const { country = '', device = '', browser = '', referrer = '', page = '' } = req.query;
  const cacheKey = `timeseries:v2:${granularity}:${from}:${to}:${country}:${device}:${browser}:${referrer}:${page}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ timeseries: cached, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';
    const { filterSql, filterParams } = buildFilters(req);

    let timeBucket;
    if (granularity === 'hour')      timeBucket = 'toStartOfHour(timestamp)';
    else if (granularity === 'week') timeBucket = 'toMonday(timestamp)';
    else                             timeBucket = 'toDate(timestamp)';

    const sql = `
      SELECT
        ${timeBucket}                                                          AS time_bucket,
        countIf(event_type = 'pageview')                                      AS pageviews,
        uniq(user_id)                                                         AS unique_users,
        uniq(session_id)                                                      AS sessions,
        countIf(event_type = 'purchase')                                      AS purchases,
        sumIf(revenue, event_type = 'purchase')                               AS revenue,
        sum(impressions)                                                      AS impressions,
        avgIf(is_bounce, event_type = 'pageview') * 100                      AS bounce_rate,
        avgIf(session_duration, event_type = 'pageview' AND session_duration > 0) AS avg_duration
      FROM ${DB}.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
        ${filterSql}
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const results = await query(sql, { from, to, ...filterParams });

    const formatted = results.map((row) => ({
      timestamp:   String(row.time_bucket),
      pageviews:   parseInt(row.pageviews)   || 0,
      uniqueUsers: parseInt(row.unique_users)|| 0,
      sessions:    parseInt(row.sessions)    || 0,
      purchases:   parseInt(row.purchases)   || 0,
      revenue:     parseFloat(parseFloat(row.revenue).toFixed(2)) || 0,
      impressions: parseInt(row.impressions) || 0,
      bounceRate:  parseFloat(parseFloat(row.bounce_rate).toFixed(1)) || 0,
      avgDuration: Math.round(parseFloat(row.avg_duration) || 0),
    }));

    const ttl = granularity === 'hour' ? 30 : 120; // hourly data caches less
    await setCache(cacheKey, formatted, ttl);
    res.json({ timeseries: formatted });
  } catch (error) {
    console.error('Timeseries Router Error:', error);
    res.status(500).json({ error: 'ClickHouse timeseries query failed' });
  }
});

module.exports = router;

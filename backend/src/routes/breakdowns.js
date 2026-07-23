/**
 * GET /api/breakdowns
 *
 * Multi-dimensional analytics breakdowns with filter support.
 * New dimensions: utm_source, utm_medium, os
 * Enhanced pages: adds bounceRate, conversionRate, avgTimeOnPage per page.
 * Supports filter params: country, device, browser, referrer, page.
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
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to   = req.query.to   || new Date().toISOString().split('T')[0];
  const { country = '', device = '', browser = '', referrer = '', page = '' } = req.query;
  const cacheKey = `breakdowns:v2:${from}:${to}:${country}:${device}:${browser}:${referrer}:${page}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';
    const { filterSql, filterParams } = buildFilters(req);
    const dateFilter = `toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String})) AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))`;
    const allParams  = { from, to, ...filterParams };

    // 1. Top Pages — enhanced with bounce rate and avg time on page
    const pagesSql = `
      SELECT
        page,
        count()                                                        AS views,
        uniq(user_id)                                                  AS visitors,
        avgIf(is_bounce, event_type = 'pageview') * 100               AS bounce_rate,
        avgIf(session_duration, event_type = 'pageview' AND session_duration > 0) AS avg_time_on_page,
        countIf(event_type = 'purchase') / nullif(uniq(user_id), 0) * 100 AS conversion_rate
      FROM ${DB}.events
      WHERE ${dateFilter} AND event_type = 'pageview' ${filterSql}
      GROUP BY page
      ORDER BY views DESC
      LIMIT 25
    `;
    const pagesResult = await query(pagesSql, allParams);

    // 2. Devices
    const devicesSql = `
      SELECT device, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql}
      GROUP BY device ORDER BY count DESC
    `;
    const devicesResult = await query(devicesSql, allParams);

    // 3. Countries — top 12
    const countriesSql = `
      SELECT country, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql}
      GROUP BY country ORDER BY count DESC
      LIMIT 12
    `;
    const countriesResult = await query(countriesSql, allParams);

    // 4. Referrers — top 10
    const referrersSql = `
      SELECT referrer, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql}
      GROUP BY referrer ORDER BY count DESC
      LIMIT 10
    `;
    const referrersResult = await query(referrersSql, allParams);

    // 5. Browsers
    const browsersSql = `
      SELECT browser, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql}
      GROUP BY browser ORDER BY count DESC
    `;
    const browsersResult = await query(browsersSql, allParams);

    // 6. Operating Systems — NEW
    const osSql = `
      SELECT os, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql} AND os != ''
      GROUP BY os ORDER BY count DESC
    `;
    const osResult = await query(osSql, allParams);

    // 7. UTM Sources — NEW
    const utmSourceSql = `
      SELECT utm_source, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql} AND utm_source != ''
      GROUP BY utm_source ORDER BY count DESC
      LIMIT 10
    `;
    const utmSourceResult = await query(utmSourceSql, allParams);

    // 8. UTM Mediums — NEW
    const utmMediumSql = `
      SELECT utm_medium, count() AS count
      FROM ${DB}.events
      WHERE ${dateFilter} ${filterSql} AND utm_medium != ''
      GROUP BY utm_medium ORDER BY count DESC
      LIMIT 8
    `;
    const utmMediumResult = await query(utmMediumSql, allParams);

    const breakdowns = {
      pages: pagesResult.map((r) => ({
        page:            r.page,
        views:           parseInt(r.views)                                    || 0,
        visitors:        parseInt(r.visitors)                                 || 0,
        bounceRate:      parseFloat(parseFloat(r.bounce_rate).toFixed(1))     || 0,
        avgTimeOnPage:   Math.round(parseFloat(r.avg_time_on_page)            || 0),
        conversionRate:  parseFloat(parseFloat(r.conversion_rate).toFixed(2)) || 0,
      })),
      devices: devicesResult.map((r) => ({ name: r.device,      value: parseInt(r.count) })),
      countries: countriesResult.map((r) => ({ name: r.country,  value: parseInt(r.count) })),
      referrers: referrersResult.map((r) => ({ name: r.referrer, value: parseInt(r.count) })),
      browsers: browsersResult.map((r) => ({ name: r.browser,    value: parseInt(r.count) })),
      os: osResult.map((r) => ({ name: r.os,                      value: parseInt(r.count) })),
      utmSources: utmSourceResult.map((r) => ({ name: r.utm_source, value: parseInt(r.count) })),
      utmMediums: utmMediumResult.map((r) => ({ name: r.utm_medium, value: parseInt(r.count) })),
    };

    await setCache(cacheKey, breakdowns, 60);
    res.json(breakdowns);
  } catch (error) {
    console.error('Breakdowns Router Error:', error);
    res.status(500).json({ error: 'ClickHouse breakdowns query failed' });
  }
});

module.exports = router;

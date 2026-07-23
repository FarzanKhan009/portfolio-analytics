/**
 * GET /api/stats
 *
 * Returns aggregated KPI stats for a date range.
 * Now supports filters: country, device, browser, referrer, page, event_type
 * New KPIs: bounceRate, avgSessionDuration, impressions, adRequests, cpm, ctr
 */
const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

// Build a WHERE clause fragment from optional filter params
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
  if (req.query.event_type) {
    clauses.push(`event_type = {event_type: String}`);
    params.event_type = req.query.event_type;
  }

  return { filterSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '', filterParams: params };
}

// Stable cache key: include filter fingerprint
function buildCacheKey(req, from, to) {
  const { country = '', device = '', browser = '', referrer = '', page = '', event_type = '' } = req.query;
  return `stats:v2:${from}:${to}:${country}:${device}:${browser}:${referrer}:${page}:${event_type}`;
}

router.get('/', async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to   = req.query.to   || new Date().toISOString().split('T')[0];

  const cacheKey = buildCacheKey(req, from, to);

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) return res.json({ ...cachedData, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';
    const { filterSql, filterParams } = buildFilters(req);

    // Current period query
    const statsQuery = `
      SELECT
        count()                                                    AS total_events,
        countIf(event_type = 'pageview')                          AS pageviews,
        uniq(user_id)                                             AS unique_users,
        uniq(session_id)                                          AS sessions,
        sumIf(revenue, event_type = 'purchase')                   AS total_revenue,
        countIf(event_type = 'purchase')                          AS total_purchases,
        countIf(event_type = 'click')                             AS total_clicks,
        sum(impressions)                                          AS total_impressions,
        sum(ad_requests)                                          AS total_ad_requests,
        avgIf(session_duration, event_type = 'pageview' AND session_duration > 0) AS avg_session_duration,
        avgIf(is_bounce, event_type = 'pageview') * 100           AS bounce_rate
      FROM ${DB}.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
        ${filterSql}
    `;

    const statsResults = await query(statsQuery, { from, to, ...filterParams });
    const current = statsResults[0];

    const pageviews     = parseInt(current.pageviews)         || 0;
    const uniqueUsers   = parseInt(current.unique_users)       || 0;
    const sessions      = parseInt(current.sessions)           || 0;
    const totalRevenue  = parseFloat(parseFloat(current.total_revenue).toFixed(2)) || 0;
    const totalPurchases= parseInt(current.total_purchases)    || 0;
    const totalClicks   = parseInt(current.total_clicks)       || 0;
    const totalImp      = parseInt(current.total_impressions)  || 0;
    const totalReq      = parseInt(current.total_ad_requests)  || 0;
    const avgDuration   = Math.round(parseFloat(current.avg_session_duration) || 0);
    const bounceRate    = parseFloat(parseFloat(current.bounce_rate).toFixed(1)) || 0;

    const conversionRate = uniqueUsers > 0 ? parseFloat(((totalPurchases / uniqueUsers) * 100).toFixed(2)) : 0;
    const cpm = totalImp > 0 ? parseFloat(((totalRevenue / totalImp) * 1000).toFixed(4)) : 0;
    const ctr = totalImp > 0 ? parseFloat(((totalClicks / totalImp) * 100).toFixed(2)) : 0;
    const matchRate = totalReq > 0 ? parseFloat(((totalImp / totalReq) * 100).toFixed(2)) : 0;

    // Previous period for % comparisons
    const fromDate   = new Date(from);
    const toDate     = new Date(to);
    const timeDiff   = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
    const prevFromDate = new Date(prevToDate.getTime() - timeDiff);
    const prevTo     = prevToDate.toISOString().split('T')[0];
    const prevFrom   = prevFromDate.toISOString().split('T')[0];

    const prevQuery = `
      SELECT
        countIf(event_type = 'pageview')                         AS pageviews,
        uniq(user_id)                                            AS unique_users,
        sumIf(revenue, event_type = 'purchase')                  AS total_revenue,
        countIf(event_type = 'purchase')                         AS total_purchases,
        sum(impressions)                                         AS total_impressions,
        sum(ad_requests)                                         AS total_ad_requests,
        countIf(event_type = 'click')                            AS total_clicks,
        avgIf(session_duration, event_type = 'pageview' AND session_duration > 0) AS avg_session_duration,
        avgIf(is_bounce, event_type = 'pageview') * 100          AS bounce_rate
      FROM ${DB}.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({prevFrom: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({prevTo: String}))
        ${filterSql}
    `;

    const prevResults = await query(prevQuery, { prevFrom, prevTo, ...filterParams });
    const prev = prevResults[0];

    const prevPageviews    = parseInt(prev.pageviews)          || 0;
    const prevUniqueUsers  = parseInt(prev.unique_users)       || 0;
    const prevRevenue      = parseFloat(parseFloat(prev.total_revenue).toFixed(2)) || 0;
    const prevPurchases    = parseInt(prev.total_purchases)    || 0;
    const prevImp          = parseInt(prev.total_impressions)  || 0;
    const prevReq          = parseInt(prev.total_ad_requests)  || 0;
    const prevClicks       = parseInt(prev.total_clicks)       || 0;
    const prevDuration     = Math.round(parseFloat(prev.avg_session_duration) || 0);
    const prevBounce       = parseFloat(parseFloat(prev.bounce_rate).toFixed(1)) || 0;

    const prevConvRate   = prevUniqueUsers > 0 ? parseFloat(((prevPurchases / prevUniqueUsers) * 100).toFixed(2)) : 0;
    const prevCpm        = prevImp > 0 ? parseFloat(((prevRevenue / prevImp) * 1000).toFixed(4)) : 0;
    const prevCtr        = prevImp > 0 ? parseFloat(((prevClicks / prevImp) * 100).toFixed(2)) : 0;

    const pctChange = (curr, p) => {
      if (p === 0) return curr > 0 ? 100 : 0;
      return parseFloat((((curr - p) / p) * 100).toFixed(1));
    };

    const durationLabel = `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`;

    const responseData = {
      kpis: {
        pageviews:         { value: pageviews,       pctChange: pctChange(pageviews, prevPageviews) },
        uniqueUsers:       { value: uniqueUsers,     pctChange: pctChange(uniqueUsers, prevUniqueUsers) },
        sessions:          { value: sessions,        pctChange: 0 },
        revenue:           { value: totalRevenue,    pctChange: pctChange(totalRevenue, prevRevenue) },
        conversionRate:    { value: conversionRate,  pctChange: pctChange(conversionRate, prevConvRate) },
        impressions:       { value: totalImp,        pctChange: pctChange(totalImp, prevImp) },
        adRequests:        { value: totalReq,        pctChange: pctChange(totalReq, prevReq) },
        cpm:               { value: cpm,             pctChange: pctChange(cpm, prevCpm) },
        ctr:               { value: ctr,             pctChange: pctChange(ctr, prevCtr) },
        matchRate:         { value: matchRate,       pctChange: 0 },
        bounceRate:        { value: bounceRate,      pctChange: pctChange(bounceRate, prevBounce) },
        avgSessionDuration:{ value: durationLabel,   pctChange: pctChange(avgDuration, prevDuration) },
      },
      period:  { from, to },
      filters: { country: req.query.country, device: req.query.device, browser: req.query.browser, referrer: req.query.referrer, page: req.query.page },
    };

    await setCache(cacheKey, responseData, 60);
    res.json(responseData);
  } catch (error) {
    console.error('Stats Router Error:', error);
    res.status(500).json({ error: 'ClickHouse stats query failed' });
  }
});

module.exports = router;

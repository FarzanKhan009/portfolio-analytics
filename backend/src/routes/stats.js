const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = req.query.to || new Date().toISOString().split('T')[0];

  const cacheKey = `stats:${from}:${to}`;

  try {
    // 1. Check cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    // 2. Query ClickHouse for current period stats
    const statsQuery = `
      SELECT
        count() as total_events,
        countIf(event_type = 'pageview') as pageviews,
        uniq(user_id) as unique_users,
        sumIf(revenue, event_type = 'purchase') as total_revenue,
        countIf(event_type = 'purchase') as total_purchases
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({from: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({to: String}))
    `;

    const statsResults = await query(statsQuery, { from, to });
    const current = statsResults[0];

    const totalEvents = parseInt(current.total_events) || 0;
    const pageviews = parseInt(current.pageviews) || 0;
    const uniqueUsers = parseInt(current.unique_users) || 0;
    const totalRevenue = parseFloat(parseFloat(current.total_revenue).toFixed(2)) || 0;
    const totalPurchases = parseInt(current.total_purchases) || 0;

    // Conversion rate: (purchases / unique visitors) * 100
    const conversionRate = uniqueUsers > 0 ? parseFloat(((totalPurchases / uniqueUsers) * 100).toFixed(2)) : 0;

    // Calculate previous period for comparison percentages
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    
    const prevToDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
    const prevFromDate = new Date(prevToDate.getTime() - timeDiff);

    const prevTo = prevToDate.toISOString().split('T')[0];
    const prevFrom = prevFromDate.toISOString().split('T')[0];

    const prevStatsQuery = `
      SELECT
        countIf(event_type = 'pageview') as pageviews,
        uniq(user_id) as unique_users,
        sumIf(revenue, event_type = 'purchase') as total_revenue,
        countIf(event_type = 'purchase') as total_purchases
      FROM analytics_db.events
      WHERE toYYYYMMDD(timestamp) >= toYYYYMMDD(toDate({prevFrom: String}))
        AND toYYYYMMDD(timestamp) <= toYYYYMMDD(toDate({prevTo: String}))
    `;

    const prevStatsResults = await query(prevStatsQuery, { prevFrom, prevTo });
    const prev = prevStatsResults[0];

    const prevPageviews = parseInt(prev.pageviews) || 0;
    const prevUniqueUsers = parseInt(prev.unique_users) || 0;
    const prevTotalRevenue = parseFloat(parseFloat(prev.total_revenue).toFixed(2)) || 0;
    const prevTotalPurchases = parseInt(prev.total_purchases) || 0;
    const prevConversionRate = prevUniqueUsers > 0 ? parseFloat(((prevTotalPurchases / prevUniqueUsers) * 100).toFixed(2)) : 0;

    // Calculate percentages
    const calculatePctChange = (curr, prevVal) => {
      if (prevVal === 0) return curr > 0 ? 100 : 0;
      return parseFloat((((curr - prevVal) / prevVal) * 100).toFixed(1));
    };

    const responseData = {
      kpis: {
        pageviews: { value: pageviews, pctChange: calculatePctChange(pageviews, prevPageviews) },
        uniqueUsers: { value: uniqueUsers, pctChange: calculatePctChange(uniqueUsers, prevUniqueUsers) },
        revenue: { value: totalRevenue, pctChange: calculatePctChange(totalRevenue, prevTotalRevenue) },
        conversionRate: { value: conversionRate, pctChange: calculatePctChange(conversionRate, prevConversionRate) },
      },
      period: { from, to },
    };

    // 3. Cache results for 60 seconds
    await setCache(cacheKey, responseData, 60);

    res.json(responseData);
  } catch (error) {
    console.error('Stats Router Error:', error);
    res.status(500).json({ error: 'ClickHouse query failed' });
  }
});

module.exports = router;

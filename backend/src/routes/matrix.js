/**
 * GET /api/matrix
 *
 * Returns a single-pass multi-period KPI aggregation across all key metrics:
 * TODAY / YESTERDAY / LAST 7 DAYS / MONTH TO DATE / QUARTER TO DATE
 *
 * Uses a single ClickHouse query with conditional aggregations per period.
 * No filter params — matrix always shows full calendar-aligned periods.
 * Cache TTL: 5 minutes (periods only reset at midnight).
 */
const express = require('express');
const { query } = require('../services/clickhouse');
const { getCache, setCache } = require('../services/redis');

const router = express.Router();

function pctChange(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
}

router.get('/', async (req, res) => {
  const cacheKey = `matrix:v2:${new Date().toISOString().slice(0, 13)}`; // hourly cache key

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const DB = process.env.CLICKHOUSE_DATABASE || 'analytics';

    // Single-pass CTE: compute all periods in one ClickHouse query
    const sql = `
      WITH
        today_start    AS (SELECT today()),
        ytd_start      AS (SELECT today() - 1),
        d7_start       AS (SELECT today() - 7),
        mtd_start      AS (SELECT toStartOfMonth(today())),
        qtd_start      AS (SELECT toStartOfQuarter(today())),

        -- Previous same-length periods for % comparison
        prev_today_start AS (SELECT today() - 1),
        prev_today_end   AS (SELECT today() - 1),
        prev_d7_start    AS (SELECT today() - 14),
        prev_d7_end      AS (SELECT today() - 8),
        prev_mtd_start   AS (SELECT toStartOfMonth(today() - 32)),
        prev_mtd_end     AS (SELECT today() - toRelativeDayNum(today()) + toRelativeDayNum(toStartOfMonth(today())) - 32),
        prev_qtd_start   AS (SELECT toStartOfQuarter(today() - 92))

      SELECT
        -- ── TODAY ─────────────────────────────────────────────────────────────────
        countIf(event_type = 'pageview'  AND toDate(timestamp) = today())                        AS pv_today,
        uniqIf(user_id,                     toDate(timestamp) = today())                         AS users_today,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) = today())              AS rev_today,
        countIf(event_type = 'purchase'  AND toDate(timestamp) = today())                        AS conv_today,
        sumIf(impressions,                  toDate(timestamp) = today())                         AS imp_today,
        sumIf(ad_requests,                  toDate(timestamp) = today())                         AS req_today,
        countIf(event_type = 'click'     AND toDate(timestamp) = today())                        AS clicks_today,
        avgIf(session_duration, event_type = 'pageview' AND toDate(timestamp) = today())         AS dur_today,
        avgIf(is_bounce,     event_type = 'pageview' AND toDate(timestamp) = today())            AS bounce_today,
        uniqIf(session_id,                  toDate(timestamp) = today())                         AS ses_today,

        -- ── YESTERDAY ─────────────────────────────────────────────────────────────
        countIf(event_type = 'pageview'  AND toDate(timestamp) = today() - 1)                   AS pv_yday,
        uniqIf(user_id,                     toDate(timestamp) = today() - 1)                    AS users_yday,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) = today() - 1)         AS rev_yday,
        countIf(event_type = 'purchase'  AND toDate(timestamp) = today() - 1)                   AS conv_yday,
        sumIf(impressions,                  toDate(timestamp) = today() - 1)                    AS imp_yday,
        sumIf(ad_requests,                  toDate(timestamp) = today() - 1)                    AS req_yday,
        countIf(event_type = 'click'     AND toDate(timestamp) = today() - 1)                   AS clicks_yday,
        avgIf(session_duration, event_type = 'pageview' AND toDate(timestamp) = today() - 1)    AS dur_yday,
        avgIf(is_bounce,     event_type = 'pageview' AND toDate(timestamp) = today() - 1)       AS bounce_yday,
        uniqIf(session_id,                  toDate(timestamp) = today() - 1)                    AS ses_yday,

        -- ── LAST 7 DAYS ──────────────────────────────────────────────────────────
        countIf(event_type = 'pageview'  AND toDate(timestamp) >= today() - 7)                  AS pv_d7,
        uniqIf(user_id,                     toDate(timestamp) >= today() - 7)                   AS users_d7,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) >= today() - 7)        AS rev_d7,
        countIf(event_type = 'purchase'  AND toDate(timestamp) >= today() - 7)                  AS conv_d7,
        sumIf(impressions,                  toDate(timestamp) >= today() - 7)                   AS imp_d7,
        sumIf(ad_requests,                  toDate(timestamp) >= today() - 7)                   AS req_d7,
        countIf(event_type = 'click'     AND toDate(timestamp) >= today() - 7)                  AS clicks_d7,
        avgIf(session_duration, event_type = 'pageview' AND toDate(timestamp) >= today() - 7)   AS dur_d7,
        avgIf(is_bounce,     event_type = 'pageview' AND toDate(timestamp) >= today() - 7)      AS bounce_d7,
        uniqIf(session_id,                  toDate(timestamp) >= today() - 7)                   AS ses_d7,

        -- Prior 7-day period (days -14 to -8) for d7 % comparison
        countIf(event_type = 'pageview'  AND toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7) AS pv_prev_d7,
        uniqIf(user_id,    toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)                   AS users_prev_d7,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7) AS rev_prev_d7,
        countIf(event_type = 'purchase' AND toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)  AS conv_prev_d7,
        sumIf(impressions, toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)                   AS imp_prev_d7,
        sumIf(ad_requests, toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)                   AS req_prev_d7,
        countIf(event_type = 'click' AND toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)     AS clicks_prev_d7,
        uniqIf(session_id, toDate(timestamp) >= today() - 14 AND toDate(timestamp) < today() - 7)                   AS ses_prev_d7,

        -- ── MONTH TO DATE ────────────────────────────────────────────────────────
        countIf(event_type = 'pageview'  AND toDate(timestamp) >= toStartOfMonth(today()))      AS pv_mtd,
        uniqIf(user_id,                     toDate(timestamp) >= toStartOfMonth(today()))       AS users_mtd,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) >= toStartOfMonth(today())) AS rev_mtd,
        countIf(event_type = 'purchase'  AND toDate(timestamp) >= toStartOfMonth(today()))      AS conv_mtd,
        sumIf(impressions,                  toDate(timestamp) >= toStartOfMonth(today()))       AS imp_mtd,
        sumIf(ad_requests,                  toDate(timestamp) >= toStartOfMonth(today()))       AS req_mtd,
        countIf(event_type = 'click'     AND toDate(timestamp) >= toStartOfMonth(today()))      AS clicks_mtd,
        avgIf(session_duration, event_type = 'pageview' AND toDate(timestamp) >= toStartOfMonth(today())) AS dur_mtd,
        avgIf(is_bounce,     event_type = 'pageview' AND toDate(timestamp) >= toStartOfMonth(today()))    AS bounce_mtd,
        uniqIf(session_id,                  toDate(timestamp) >= toStartOfMonth(today()))       AS ses_mtd,

        -- Prior MTD (same day-of-month range, previous month)
        countIf(event_type = 'pageview' AND toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32)) AS pv_prev_mtd,
        uniqIf(user_id,    toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32))                  AS users_prev_mtd,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32)) AS rev_prev_mtd,
        sumIf(impressions, toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32))                  AS imp_prev_mtd,
        sumIf(ad_requests, toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32))                  AS req_prev_mtd,
        uniqIf(session_id, toDate(timestamp) >= toStartOfMonth(today() - 32) AND toDate(timestamp) <= (today() - 32))                  AS ses_prev_mtd,

        -- ── QUARTER TO DATE ──────────────────────────────────────────────────────
        countIf(event_type = 'pageview'  AND toDate(timestamp) >= toStartOfQuarter(today()))    AS pv_qtd,
        uniqIf(user_id,                     toDate(timestamp) >= toStartOfQuarter(today()))     AS users_qtd,
        sumIf(revenue,     event_type = 'purchase' AND toDate(timestamp) >= toStartOfQuarter(today())) AS rev_qtd,
        countIf(event_type = 'purchase'  AND toDate(timestamp) >= toStartOfQuarter(today()))    AS conv_qtd,
        sumIf(impressions,                  toDate(timestamp) >= toStartOfQuarter(today()))     AS imp_qtd,
        sumIf(ad_requests,                  toDate(timestamp) >= toStartOfQuarter(today()))     AS req_qtd,
        countIf(event_type = 'click'     AND toDate(timestamp) >= toStartOfQuarter(today()))    AS clicks_qtd,
        avgIf(session_duration, event_type = 'pageview' AND toDate(timestamp) >= toStartOfQuarter(today())) AS dur_qtd,
        avgIf(is_bounce,     event_type = 'pageview' AND toDate(timestamp) >= toStartOfQuarter(today()))    AS bounce_qtd,
        uniqIf(session_id,                  toDate(timestamp) >= toStartOfQuarter(today()))     AS ses_qtd,

        -- Prior QTD
        countIf(event_type = 'pageview' AND toDate(timestamp) >= toStartOfQuarter(today() - 92) AND toDate(timestamp) <= (today() - 92)) AS pv_prev_qtd,
        sumIf(revenue, event_type = 'purchase' AND toDate(timestamp) >= toStartOfQuarter(today() - 92) AND toDate(timestamp) <= (today() - 92)) AS rev_prev_qtd,
        sumIf(impressions, toDate(timestamp) >= toStartOfQuarter(today() - 92) AND toDate(timestamp) <= (today() - 92)) AS imp_prev_qtd,
        sumIf(ad_requests, toDate(timestamp) >= toStartOfQuarter(today() - 92) AND toDate(timestamp) <= (today() - 92)) AS req_prev_qtd,
        uniqIf(session_id, toDate(timestamp) >= toStartOfQuarter(today() - 92) AND toDate(timestamp) <= (today() - 92)) AS ses_prev_qtd

      FROM ${DB}.events
    `;

    const rows = await query(sql);
    const r = rows[0];

    const n  = (v) => parseFloat(v) || 0;
    const ni = (v) => parseInt(v)  || 0;

    // Helper to build a period cell: { value, cmpPct, cmpLabel, isPositive }
    const cell = (val, prev, label, formatFn, lowerIsBetter = false) => {
      const v = n(val);
      const p = n(prev);
      const pct = pctChange(v, p);
      const isPos = lowerIsBetter ? pct <= 0 : pct >= 0;
      return {
        value: formatFn ? formatFn(v) : v,
        rawValue: v,
        cmpPct: pct,
        cmpLabel: label,
        isPositive: isPos,
      };
    };

    // CPM: (revenue / impressions) * 1000
    const cpm = (rev, imp) => imp > 0 ? parseFloat(((rev / imp) * 1000).toFixed(4)) : 0;
    // CTR: (clicks / impressions) * 100
    const ctr = (clicks, imp) => imp > 0 ? parseFloat(((clicks / imp) * 100).toFixed(2)) : 0;
    // Match rate: (impressions / ad_requests) * 100
    const matchRate = (imp, req) => req > 0 ? parseFloat(((imp / req) * 100).toFixed(2)) : 0;
    // Conversion rate: (conversions / users) * 100
    const convRate = (conv, users) => users > 0 ? parseFloat(((conv / users) * 100).toFixed(2)) : 0;

    const fmt = {
      money:   (v) => `$${n(v).toFixed(2)}`,
      pct:     (v) => `${n(v).toFixed(2)}%`,
      dur:     (v) => { const s = ni(v); return `${Math.floor(s/60)}m ${s%60}s`; },
      num:     (v) => ni(v).toLocaleString(),
      cpmFmt:  (v) => `$${n(v).toFixed(4)}`,
    };

    const result = {
      generatedAt: new Date().toISOString(),
      metrics: {
        revenue: {
          today:     cell(r.rev_today,     r.rev_yday,     'vs Yesterday',          fmt.money),
          yesterday: cell(r.rev_yday,      r.rev_prev_d7,  'vs Prior Period',       fmt.money),
          d7:        cell(r.rev_d7,        r.rev_prev_d7,  'vs Prior 7 Days',       fmt.money),
          mtd:       cell(r.rev_mtd,       r.rev_prev_mtd, 'vs Same MTD Last Mo.',  fmt.money),
          qtd:       cell(r.rev_qtd,       r.rev_prev_qtd, 'vs Same QTD Last Qtr.', fmt.money),
        },
        pageviews: {
          today:     cell(r.pv_today,      r.pv_yday,      'vs Yesterday',          fmt.num),
          yesterday: cell(r.pv_yday,       r.pv_prev_d7,   'vs Prior Period',       fmt.num),
          d7:        cell(r.pv_d7,         r.pv_prev_d7,   'vs Prior 7 Days',       fmt.num),
          mtd:       cell(r.pv_mtd,        r.pv_prev_mtd,  'vs Same MTD Last Mo.',  fmt.num),
          qtd:       cell(r.pv_qtd,        r.pv_prev_qtd,  'vs Same QTD Last Qtr.', fmt.num),
        },
        impressions: {
          today:     cell(r.imp_today,     r.imp_yday,     'vs Yesterday',          fmt.num),
          yesterday: cell(r.imp_yday,      r.imp_prev_d7,  'vs Prior Period',       fmt.num),
          d7:        cell(r.imp_d7,        r.imp_prev_d7,  'vs Prior 7 Days',       fmt.num),
          mtd:       cell(r.imp_mtd,       r.imp_prev_mtd, 'vs Same MTD Last Mo.',  fmt.num),
          qtd:       cell(r.imp_qtd,       r.imp_prev_qtd, 'vs Same QTD Last Qtr.', fmt.num),
        },
        adRequests: {
          today:     cell(r.req_today,     r.req_yday,     'vs Yesterday',          fmt.num),
          yesterday: cell(r.req_yday,      r.req_prev_d7,  'vs Prior Period',       fmt.num),
          d7:        cell(r.req_d7,        r.req_prev_d7,  'vs Prior 7 Days',       fmt.num),
          mtd:       cell(r.req_mtd,       r.req_prev_mtd, 'vs Same MTD Last Mo.',  fmt.num),
          qtd:       cell(r.req_qtd,       r.req_prev_qtd, 'vs Same QTD Last Qtr.', fmt.num),
        },
        cpm: {
          today:     { value: fmt.cpmFmt(cpm(r.rev_today, r.imp_today)),     rawValue: cpm(r.rev_today, r.imp_today),     cmpPct: pctChange(cpm(r.rev_today, r.imp_today), cpm(r.rev_yday, r.imp_yday)),     cmpLabel: 'vs Yesterday',          isPositive: cpm(r.rev_today, r.imp_today) >= cpm(r.rev_yday, r.imp_yday) },
          yesterday: { value: fmt.cpmFmt(cpm(r.rev_yday,  r.imp_yday)),      rawValue: cpm(r.rev_yday, r.imp_yday),      cmpPct: 0, cmpLabel: 'vs Prior Period',       isPositive: true },
          d7:        { value: fmt.cpmFmt(cpm(r.rev_d7,    r.imp_d7)),        rawValue: cpm(r.rev_d7,  r.imp_d7),        cmpPct: pctChange(cpm(r.rev_d7, r.imp_d7), cpm(r.rev_prev_d7, r.imp_prev_d7)), cmpLabel: 'vs Prior 7 Days',       isPositive: true },
          mtd:       { value: fmt.cpmFmt(cpm(r.rev_mtd,   r.imp_mtd)),       rawValue: cpm(r.rev_mtd, r.imp_mtd),       cmpPct: pctChange(cpm(r.rev_mtd, r.imp_mtd), cpm(r.rev_prev_mtd, r.imp_prev_mtd)), cmpLabel: 'vs Same MTD Last Mo.',  isPositive: true },
          qtd:       { value: fmt.cpmFmt(cpm(r.rev_qtd,   r.imp_qtd)),       rawValue: cpm(r.rev_qtd, r.imp_qtd),       cmpPct: pctChange(cpm(r.rev_qtd, r.imp_qtd), cpm(r.rev_prev_qtd, r.imp_prev_qtd)), cmpLabel: 'vs Same QTD Last Qtr.', isPositive: true },
        },
        ctr: {
          today:     { value: fmt.pct(ctr(r.clicks_today, r.imp_today)),   rawValue: ctr(r.clicks_today, r.imp_today),   cmpPct: pctChange(ctr(r.clicks_today, r.imp_today), ctr(r.clicks_yday, r.imp_yday)),     cmpLabel: 'vs Yesterday',          isPositive: true },
          yesterday: { value: fmt.pct(ctr(r.clicks_yday,  r.imp_yday)),    rawValue: ctr(r.clicks_yday, r.imp_yday),     cmpPct: 0, cmpLabel: 'vs Prior Period', isPositive: true },
          d7:        { value: fmt.pct(ctr(r.clicks_d7,    r.imp_d7)),      rawValue: ctr(r.clicks_d7,  r.imp_d7),       cmpPct: pctChange(ctr(r.clicks_d7, r.imp_d7), ctr(r.clicks_prev_d7, r.imp_prev_d7)), cmpLabel: 'vs Prior 7 Days', isPositive: true },
          mtd:       { value: fmt.pct(ctr(r.clicks_mtd,   r.imp_mtd)),     rawValue: ctr(r.clicks_mtd, r.imp_mtd),      cmpPct: 0, cmpLabel: 'vs Same MTD Last Mo.',  isPositive: true },
          qtd:       { value: fmt.pct(ctr(r.clicks_qtd,   r.imp_qtd)),     rawValue: ctr(r.clicks_qtd, r.imp_qtd),      cmpPct: 0, cmpLabel: 'vs Same QTD Last Qtr.', isPositive: true },
        },
        matchRate: {
          today:     { value: fmt.pct(matchRate(r.imp_today, r.req_today)), rawValue: matchRate(r.imp_today, r.req_today), cmpPct: pctChange(matchRate(r.imp_today, r.req_today), matchRate(r.imp_yday, r.req_yday)),   cmpLabel: 'vs Yesterday',          isPositive: true },
          yesterday: { value: fmt.pct(matchRate(r.imp_yday,  r.req_yday)),  rawValue: matchRate(r.imp_yday, r.req_yday),  cmpPct: 0, cmpLabel: 'vs Prior Period', isPositive: true },
          d7:        { value: fmt.pct(matchRate(r.imp_d7,    r.req_d7)),    rawValue: matchRate(r.imp_d7,  r.req_d7),    cmpPct: pctChange(matchRate(r.imp_d7, r.req_d7), matchRate(r.imp_prev_d7, r.req_prev_d7)), cmpLabel: 'vs Prior 7 Days', isPositive: true },
          mtd:       { value: fmt.pct(matchRate(r.imp_mtd,   r.req_mtd)),   rawValue: matchRate(r.imp_mtd, r.req_mtd),   cmpPct: 0, cmpLabel: 'vs Same MTD Last Mo.',  isPositive: true },
          qtd:       { value: fmt.pct(matchRate(r.imp_qtd,   r.req_qtd)),   rawValue: matchRate(r.imp_qtd, r.req_qtd),   cmpPct: 0, cmpLabel: 'vs Same QTD Last Qtr.', isPositive: true },
        },
        sessions: {
          today:     cell(r.ses_today,     r.ses_yday,      'vs Yesterday',          fmt.num),
          yesterday: cell(r.ses_yday,      r.ses_prev_d7,   'vs Prior Period',       fmt.num),
          d7:        cell(r.ses_d7,        r.ses_prev_d7,   'vs Prior 7 Days',       fmt.num),
          mtd:       cell(r.ses_mtd,       r.ses_prev_mtd,  'vs Same MTD Last Mo.',  fmt.num),
          qtd:       cell(r.ses_qtd,       r.ses_prev_qtd,  'vs Same QTD Last Qtr.', fmt.num),
        },
        bounceRate: {
          today:     { value: fmt.pct((n(r.bounce_today) * 100).toFixed(1)), rawValue: n(r.bounce_today) * 100, cmpPct: pctChange(n(r.bounce_today), n(r.bounce_yday)), cmpLabel: 'vs Yesterday', isPositive: n(r.bounce_today) <= n(r.bounce_yday) },
          yesterday: { value: fmt.pct((n(r.bounce_yday)  * 100).toFixed(1)), rawValue: n(r.bounce_yday)  * 100, cmpPct: 0, cmpLabel: 'vs Prior Period', isPositive: true },
          d7:        { value: fmt.pct((n(r.bounce_d7)    * 100).toFixed(1)), rawValue: n(r.bounce_d7)    * 100, cmpPct: 0, cmpLabel: 'vs Prior 7 Days', isPositive: true },
          mtd:       { value: fmt.pct((n(r.bounce_mtd)   * 100).toFixed(1)), rawValue: n(r.bounce_mtd)   * 100, cmpPct: 0, cmpLabel: 'vs Same MTD Last Mo.',  isPositive: true },
          qtd:       { value: fmt.pct((n(r.bounce_qtd)   * 100).toFixed(1)), rawValue: n(r.bounce_qtd)   * 100, cmpPct: 0, cmpLabel: 'vs Same QTD Last Qtr.', isPositive: true },
        },
        avgDuration: {
          today:     { value: fmt.dur(r.dur_today), rawValue: n(r.dur_today), cmpPct: pctChange(n(r.dur_today), n(r.dur_yday)), cmpLabel: 'vs Yesterday', isPositive: n(r.dur_today) >= n(r.dur_yday) },
          yesterday: { value: fmt.dur(r.dur_yday),  rawValue: n(r.dur_yday),  cmpPct: 0, cmpLabel: 'vs Prior Period', isPositive: true },
          d7:        { value: fmt.dur(r.dur_d7),    rawValue: n(r.dur_d7),    cmpPct: 0, cmpLabel: 'vs Prior 7 Days', isPositive: true },
          mtd:       { value: fmt.dur(r.dur_mtd),   rawValue: n(r.dur_mtd),   cmpPct: 0, cmpLabel: 'vs Same MTD Last Mo.',  isPositive: true },
          qtd:       { value: fmt.dur(r.dur_qtd),   rawValue: n(r.dur_qtd),   cmpPct: 0, cmpLabel: 'vs Same QTD Last Qtr.', isPositive: true },
        },
      },
    };

    await setCache(cacheKey, result, 300); // 5 min cache
    res.json(result);
  } catch (error) {
    console.error('Matrix Route Error:', error);
    res.status(500).json({ error: 'Multi-period matrix aggregation failed' });
  }
});

module.exports = router;

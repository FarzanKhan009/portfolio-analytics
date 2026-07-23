const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ingestRouter     = require('./routes/ingest');
const statsRouter      = require('./routes/stats');
const timeseriesRouter = require('./routes/timeseries');
const breakdownsRouter = require('./routes/breakdowns');
const realtimeRouter   = require('./routes/realtime');
const matrixRouter     = require('./routes/matrix');
const sparklinesRouter = require('./routes/sparklines');
const funnelRouter     = require('./routes/funnel');

const app  = express();
const PORT = process.env.PORT || 51773;

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ── Core Routes ──────────────────────────────────────────────────────────────
app.use('/api/ingest',     ingestRouter);
app.use('/api/stats',      statsRouter);
app.use('/api/timeseries', timeseriesRouter);
app.use('/api/breakdowns', breakdownsRouter);
app.use('/api/realtime',   realtimeRouter);

// ── New Analytics Routes ──────────────────────────────────────────────────────
app.use('/api/matrix',     matrixRouter);     // Multi-period KPI matrix
app.use('/api/sparklines', sparklinesRouter); // 7-day per-metric mini bars
app.use('/api/funnel',     funnelRouter);     // Conversion funnel

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'healthy',
    timestamp: new Date(),
    uptime:    process.uptime(),
    endpoints: [
      '/api/stats', '/api/timeseries', '/api/breakdowns',
      '/api/realtime', '/api/realtime/stream',
      '/api/matrix', '/api/sparklines', '/api/funnel',
      '/api/ingest',
    ],
  });
});

// Run standalone when not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════');
    console.log(`🚀 ClickHouse Analytics API  →  port ${PORT}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('  GET  /api/stats       — KPI stats (with filters)');
    console.log('  GET  /api/timeseries  — Time series data');
    console.log('  GET  /api/breakdowns  — Dimension breakdowns');
    console.log('  GET  /api/matrix      — Multi-period KPI matrix');
    console.log('  GET  /api/sparklines  — 7-day sparkline bars');
    console.log('  GET  /api/funnel      — Conversion funnel');
    console.log('  GET  /api/realtime         — Live snapshot');
    console.log('  GET  /api/realtime/stream  — SSE push stream');
    console.log('  POST /api/ingest      — Event ingestion');
    console.log('═══════════════════════════════════════════════════');
  });
}

module.exports = app;

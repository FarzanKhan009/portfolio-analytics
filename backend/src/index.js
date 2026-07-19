const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ingestRouter = require('./routes/ingest');
const statsRouter = require('./routes/stats');
const timeseriesRouter = require('./routes/timeseries');
const breakdownsRouter = require('./routes/breakdowns');
const realtimeRouter = require('./routes/realtime');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Routes
app.use('/api/ingest', ingestRouter);
app.use('/api/stats', statsRouter);
app.use('/api/timeseries', timeseriesRouter);
app.use('/api/breakdowns', breakdownsRouter);
app.use('/api/realtime', realtimeRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 ClickHouse Analytics API Running on port ${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;

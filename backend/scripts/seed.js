const { clickhouse, insert } = require('../src/services/clickhouse');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'events';

const EVENT_TYPES = ['pageview', 'click', 'purchase', 'signup'];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const COUNTRIES = ['US', 'PK', 'GB', 'DE', 'CA', 'AU', 'IN', 'FR'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const PAGES = ['/home', '/pricing', '/docs', '/blog/scaling-clickhouse', '/features', '/contact', '/checkout'];
const REFERRERS = ['https://google.com', 'https://github.com', 'https://twitter.com', 'Direct', 'https://linkedin.com'];

// Helper to choose random item based on weights
function chooseWeighted(items, weights) {
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) return items[i];
    random -= weights[i];
  }
  return items[items.length - 1];
}

async function initSchema() {
  console.log('Initializing ClickHouse Schema...');

  // Create database if not exists
  await clickhouse.command({
    query: 'CREATE DATABASE IF NOT EXISTS analytics_db',
  });

  // Create events table
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS analytics_db.events (
      event_id    UUID DEFAULT generateUUIDv4(),
      event_type  LowCardinality(String),
      timestamp   DateTime,
      user_id     String,
      session_id  String,
      page        String,
      referrer    String,
      device      LowCardinality(String),
      country     LowCardinality(String),
      browser     LowCardinality(String),
      revenue     Decimal64(2) DEFAULT 0
    )
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (event_type, timestamp, user_id)
    TTL timestamp + INTERVAL 1 YEAR;
  `;

  await clickhouse.command({ query: createTableQuery });
  console.log('✓ ClickHouse table created successfully.');
}

async function seedData() {
  const TOTAL_RECORDS = 1000000;
  const BATCH_SIZE = 50000;
  const numBatches = TOTAL_RECORDS / BATCH_SIZE;

  console.log(`Seeding ${TOTAL_RECORDS.toLocaleString()} analytics records in ${numBatches} batches...`);

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  for (let batch = 1; batch <= numBatches; batch++) {
    const events = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      // 1. Generate timestamp with realistic daily traffic curves
      const timestampMs = ninetyDaysAgo + Math.random() * (now - ninetyDaysAgo);
      const date = new Date(timestampMs);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Traffic drops 35% on weekends
      let skipProbability = (day === 0 || day === 6) ? 0.35 : 0;
      // Traffic peaking during daytime hours (10 AM to 8 PM)
      if (hour < 8 || hour > 22) skipProbability += 0.4;

      if (Math.random() < skipProbability) {
        // Adjust distributions slightly, continue adding
      }

      // Generate entity IDs
      const userId = `usr_${Math.floor(Math.random() * 80000)}`;
      const sessionId = `ses_${Math.floor(Math.random() * 200000)}`;

      // Weighted parameters
      const eventType = chooseWeighted(EVENT_TYPES, [0.70, 0.20, 0.03, 0.07]); // 70% pageview, 20% click, 3% purchase, 7% signup
      const device = chooseWeighted(DEVICES, [0.50, 0.45, 0.05]);
      const country = chooseWeighted(COUNTRIES, [0.40, 0.15, 0.15, 0.10, 0.08, 0.04, 0.04, 0.04]);
      const browser = chooseWeighted(BROWSERS, [0.65, 0.20, 0.10, 0.05]);
      const page = chooseWeighted(PAGES, [0.35, 0.15, 0.15, 0.15, 0.10, 0.05, 0.05]);
      const referrer = chooseWeighted(REFERRERS, [0.35, 0.25, 0.15, 0.15, 0.10]);

      let revenue = 0;
      if (eventType === 'purchase') {
        revenue = parseFloat((Math.random() * 140 + 9).toFixed(2));
      }

      events.push({
        event_id: uuidv4(),
        event_type: eventType,
        timestamp: date.toISOString().slice(0, 19).replace('T', ' '), // ClickHouse format: YYYY-MM-DD HH:MM:SS
        user_id: userId,
        session_id: sessionId,
        page,
        referrer,
        device,
        country,
        browser,
        revenue,
      });
    }

    await insert('analytics_db.events', events);
    console.log(`✓ Batch ${batch}/${numBatches} completed (${(batch * BATCH_SIZE).toLocaleString()} records).`);
  }

  console.log('✓ Seeding complete! Database is fully populated.');
}

async function main() {
  try {
    await initSchema();
    await seedData();
    process.exit(0);
  } catch (error) {
    console.error('Fatal Seeding Error:', error);
    process.exit(1);
  }
}

main();

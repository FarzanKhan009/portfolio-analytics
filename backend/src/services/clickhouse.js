const { createClient } = require('@clickhouse/client');
require('dotenv').config();

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
});

/* Helper to execute raw queries and return clean JSON arrays */
async function query(sql, params = {}) {
  try {
    const resultSet = await clickhouse.query({
      query: sql,
      query_params: params,
      format: 'JSONEachRow',
    });
    return await resultSet.json();
  } catch (error) {
    console.error('ClickHouse Query Error:', error);
    throw error;
  }
}

/* Helper to perform bulk insertion of arrays of events */
async function insert(table, values) {
  try {
    await clickhouse.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  } catch (error) {
    console.error('ClickHouse Ingest Error:', error);
    throw error;
  }
}

module.exports = {
  clickhouse,
  query,
  insert,
};

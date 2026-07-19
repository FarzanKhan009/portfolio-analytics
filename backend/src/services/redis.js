const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect().then(() => console.log('Redis connected successfully'));

/* Cache middleware/helpers */
async function getCache(key) {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis Get Cache Error:', error);
    return null;
  }
}

async function setCache(key, value, ttlSeconds = 60) {
  try {
    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error('Redis Set Cache Error:', error);
  }
}

async function invalidateCache(key) {
  try {
    await client.del(key);
  } catch (error) {
    console.error('Redis Invalidate Cache Error:', error);
  }
}

module.exports = {
  redis: client,
  getCache,
  setCache,
  invalidateCache,
};

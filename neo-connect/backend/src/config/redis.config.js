const { Redis } = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const getRedisClient = () => {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const isTLS = url.startsWith('rediss://');

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(isTLS && { tls: {} }),
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));

  return redisClient;
};

module.exports = { getRedisClient };

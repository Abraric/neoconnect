const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/NeoConnect';
  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    throw err;
  }
};

const disconnectMongo = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectMongo();
});

module.exports = { connectMongo, disconnectMongo };

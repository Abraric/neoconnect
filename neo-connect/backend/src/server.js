require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectMongo } = require('./config/mongo.config');
const { initSocket } = require('./socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectMongo();
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      logger.info(`NeoConnect API running on port ${PORT}`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received — shutting down`);
      server.close(async () => {
        const { disconnectMongo } = require('./config/mongo.config');
        await disconnectMongo();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

start();

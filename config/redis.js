// config/redis.js
// Sets up and exports the Redis client

const { createClient } = require("redis");

// Create a Redis client using env variables
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  // password: process.env.REDIS_PASSWORD,
});

// Log connection events
redisClient.on("connect", () => {
  console.log("Redis Connected");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

redisClient.on("reconnecting", () => {
  console.log("Redis Reconnecting...");
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Redis Connection Failed:", error.message);
    // App continues running even if Redis is down (graceful degradation)
  }
};

module.exports = { redisClient, connectRedis };

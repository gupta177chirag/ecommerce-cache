// services/cacheService.js
// Centralizes all Redis cache operations (get, set, delete)

const { redisClient } = require("../config/redis");

// Cache key constants — keeps keys consistent across the app
const CACHE_KEYS = {
  ALL_PRODUCTS: "products",                          // Key for all products list
  SINGLE_PRODUCT: (id) => `product:${id}`,          // Key for a single product
};

// TTL values from environment (with fallback defaults)
const TTL = {
  ALL_PRODUCTS: parseInt(process.env.CACHE_TTL_ALL_PRODUCTS) || 60,       // 60 seconds
  SINGLE_PRODUCT: parseInt(process.env.CACHE_TTL_SINGLE_PRODUCT) || 300,  // 5 minutes
};

/**
 * Get a value from Redis cache.
 * Returns parsed JSON object or null if not found / Redis is down.
 */
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data); // Parse stored JSON string back to object
    }
    return null;
  } catch (error) {
    console.error(`Cache GET error for key "${key}":`, error.message);
    return null; // Gracefully return null so the app falls back to DB
  }
};

/**
 * Set a value in Redis cache with a TTL (expiry time in seconds).
 */
const setCache = async (key, data, ttl) => {
  try {
    // EX option sets expiry in seconds
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
  } catch (error) {
    console.error(` Cache SET error for key "${key}":`, error.message);
    // Non-fatal: app continues even if cache write fails
  }
};

/**
 * Delete one or more keys from Redis cache.
 * Used during cache invalidation on update/delete.
 */
const deleteCache = async (...keys) => {
  try {
    if (keys.length > 0) {
      await redisClient.del(keys); // Redis DEL supports multiple keys at once
      console.log(` Cache invalidated for keys: ${keys.join(", ")}`);
    }
  } catch (error) {
    console.error(`Cache DELETE error:`, error.message);
  }
};

module.exports = {
  CACHE_KEYS,
  TTL,
  getCache,
  setCache,
  deleteCache,
};

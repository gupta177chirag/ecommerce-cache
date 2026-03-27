// services/cacheRefreshService.js
// Background job that periodically refreshes the "all products" cache
// This prevents cache stampede and keeps the list cache warm

const Product = require("../models/Product");
const { CACHE_KEYS, TTL, setCache } = require("./cacheService");

/**
 * Fetches all products from MongoDB and writes them into Redis.
 * Used both for background refresh and for cache warming on startup.
 */
const refreshProductListCache = async () => {
  try {
    console.log("[Background Refresh] Refreshing product list cache...");

    const products = await Product.find().sort({ createdAt: -1 });
    await setCache(CACHE_KEYS.ALL_PRODUCTS, products, TTL.ALL_PRODUCTS);

    console.log(
      `[Background Refresh] Product list cache updated — ` +
      `${products.length} products cached (TTL: ${TTL.ALL_PRODUCTS}s)`
    );
  } catch (error) {
    console.error("[Background Refresh] Failed:", error.message);
    // Non-fatal — app continues working normally
  }
};

/**
 * Starts the background refresh job using setInterval.
 * Runs every CACHE_REFRESH_INTERVAL milliseconds (default: 50 seconds).
 *
 * Why 50s for a 60s TTL?
 * → Refreshes cache ~10s before it expires, so users almost never hit a cold cache.
 */
const startCacheRefreshJob = () => {
  const interval =
    parseInt(process.env.CACHE_REFRESH_INTERVAL) || 50000; // Default: 50 seconds

  console.log(
    `[Background Refresh] Job started — runs every ${interval / 1000}s`
  );

  setInterval(async () => {
    await refreshProductListCache();
  }, interval);
};

module.exports = { startCacheRefreshJob, refreshProductListCache };

// scripts/warmCache.js
// Cache Warming Script
// ─────────────────────────────────────────────────────────────────────────────
// Runs on startup (called from server.js) to pre-populate Redis with data
// from MongoDB. This ensures the very first requests hit cache, not the DB.
//
// Can also be run manually: node scripts/warmCache.js

const Product = require("../models/Product");
const { CACHE_KEYS, TTL, setCache } = require("../services/cacheService");

/**
 * Warms the cache with:
 * 1. All products list  → key: "products"
 * 2. Each individual product → key: "product:{id}"
 */
const warmCache = async () => {
  console.log("[Cache Warming] Starting cache warm-up...");

  try {
    // Fetch all products from MongoDB
    const products = await Product.find().sort({ createdAt: -1 });

    if (products.length === 0) {
      console.log(
        "[Cache Warming] No products found in DB — skipping warm-up"
      );
      return;
    }

    // 1. Cache the full product list
    await setCache(CACHE_KEYS.ALL_PRODUCTS, products, TTL.ALL_PRODUCTS);
    console.log(
      `[Cache Warming] Cached all products list (${products.length} items, TTL: ${TTL.ALL_PRODUCTS}s)`
    );

    // 2. Cache each individual product
    const cachePromises = products.map((product) =>
      setCache(
        CACHE_KEYS.SINGLE_PRODUCT(product._id),
        product,
        TTL.SINGLE_PRODUCT
      )
    );

    await Promise.all(cachePromises);
    console.log(
      `[Cache Warming] Cached ${products.length} individual products (TTL: ${TTL.SINGLE_PRODUCT}s)`
    );

    console.log("[Cache Warming] Cache warm-up complete!");
  } catch (error) {
    console.error("[Cache Warming] Failed:", error.message);
    // Non-fatal: server still starts even if warming fails
  }
};

module.exports = warmCache;

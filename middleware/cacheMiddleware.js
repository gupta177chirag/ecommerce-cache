// middleware/cacheMiddleware.js
// Middleware that checks Redis for cached data before hitting the DB

const { getCache } = require("../services/cacheService");

/**
 * Factory function that returns a cache-check middleware for a given key.
 *
 * @param {Function} keyFn - A function that receives (req) and returns the cache key string
 *
 * Usage:
 *   router.get("/products", cacheMiddleware(() => "products"), controller)
 *   router.get("/products/:id", cacheMiddleware((req) => `product:${req.params.id}`), controller)
 */
const cacheMiddleware = (keyFn) => {
  return async (req, res, next) => {
    const key = keyFn(req); // Resolve the cache key for this request

    try {
      const cachedData = await getCache(key);

      if (cachedData) {
        // ✅ CACHE HIT — return data directly from Redis
        console.log(` Cache HIT  → Key: "${key}"`);
        return res.status(200).json({
          success: true,
          source: "cache",   // Tells the client this came from Redis
          data: cachedData,
        });
      }

      // ❌ CACHE MISS — attach the key to req so controller can cache after DB fetch
      console.log(`Cache MISS → Key: "${key}" — fetching from DB...`);
      req.cacheKey = key;
      next(); // Pass control to the controller
    } catch (error) {
      // If cache check fails entirely, skip caching and go straight to DB
      console.error(" Cache middleware error:", error.message);
      req.cacheKey = key;
      next();
    }
  };
};

module.exports = cacheMiddleware;

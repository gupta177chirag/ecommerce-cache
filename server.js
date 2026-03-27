// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Entry point for the E-commerce Smart Caching Layer
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config(); // Load environment variables from .env

const express = require("express");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const productRoutes = require("./routes/productRoutes");
const { loggerMiddleware, errorMiddleware } = require("./middleware/loggerMiddleware");
const { startCacheRefreshJob } = require("./services/cacheRefreshService");
const warmCache = require("./scripts/warmCache");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(express.json());         // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);       // Log all incoming requests + response times

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      server: "running",
      message: "Check logs for MongoDB and Redis connection status",
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/products", productRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Bootstrap Function ───────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Start Express server
    app.listen(PORT, async () => {
      console.log(`\n Server running at http://localhost:${PORT}`);
      console.log(` API Endpoints:`);
      console.log(`   GET    /products          → All products (cache TTL: ${process.env.CACHE_TTL_ALL_PRODUCTS || 60}s)`);
      console.log(`   GET    /products/:id      → Single product (cache TTL: ${process.env.CACHE_TTL_SINGLE_PRODUCT || 300}s)`);
      console.log(`   POST   /products          → Create product`);
      console.log(`   PUT    /products/:id      → Update product`);
      console.log(`   DELETE /products/:id      → Delete product`);
      console.log(`   GET    /health            → Health check\n`);

      // 4. Warm the cache with existing DB data (bonus feature)
      await warmCache();

      // 5. Start background cache refresh job
      startCacheRefreshJob();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

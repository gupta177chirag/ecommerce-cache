// middleware/loggerMiddleware.js
// Logs every incoming request with method, URL, and response time

const loggerMiddleware = (req, res, next) => {
  const start = Date.now(); // Record request start time

  // Hook into the response finish event to log after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    const cacheStatus = req.cacheKey
      ? res.statusCode === 200
        ? "" // Will show HIT/MISS from cacheMiddleware logs
        : ""
      : "";

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
      `→ Status: ${res.statusCode} | Time: ${duration}ms`
    );
  });

  next();
};

module.exports = loggerMiddleware;


// ─────────────────────────────────────────────────────────────────────────────


// middleware/errorMiddleware.js
// Global error handler — catches any error passed via next(err)

const errorMiddleware = (err, req, res, next) => {
  console.error("Error:", err.message);

  // Use error's status code if set, otherwise default to 500
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Show stack trace only in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { loggerMiddleware, errorMiddleware };

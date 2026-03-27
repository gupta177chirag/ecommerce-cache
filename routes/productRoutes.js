// routes/productRoutes.js
// Defines all /products REST endpoints and wires them to controllers + middleware

const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const cacheMiddleware = require("../middleware/cacheMiddleware");
const { CACHE_KEYS } = require("../services/cacheService");

// ─── GET /products ────────────────────────────────────────────────────────────
// Check cache first → if MISS, controller fetches from DB and caches result
router.get(
  "/",
  cacheMiddleware(() => CACHE_KEYS.ALL_PRODUCTS),
  getAllProducts
);

// ─── GET /products/:id ────────────────────────────────────────────────────────
// Check cache for this specific product → if MISS, fetch from DB and cache it
router.get(
  "/:id",
  cacheMiddleware((req) => CACHE_KEYS.SINGLE_PRODUCT(req.params.id)),
  getProductById
);

// ─── POST /products ───────────────────────────────────────────────────────────
// Create product + invalidate list cache (no cache check needed for writes)
router.post("/", createProduct);

// ─── PUT /products/:id ────────────────────────────────────────────────────────
// Update product + invalidate both product and list cache
router.put("/:id", updateProduct);

// ─── DELETE /products/:id ─────────────────────────────────────────────────────
// Delete product + invalidate both product and list cache
router.delete("/:id", deleteProduct);

module.exports = router;

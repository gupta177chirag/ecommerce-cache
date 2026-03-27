// controllers/productController.js
// Handles all business logic for product CRUD operations
// Integrates cache read/write and invalidation

const Product = require("../models/Product");
const {
  CACHE_KEYS,
  TTL,
  getCache,
  setCache,
  deleteCache,
} = require("../services/cacheService");

// GET /products — Fetch all products (cache-aware)
const getAllProducts = async (req, res, next) => {
  try {
    // Note: cacheMiddleware already checked for a cache hit.
    // If we're here, it was a CACHE MISS — fetch from MongoDB.

    const products = await Product.find().sort({ createdAt: -1 });

    // Store fresh data in Redis for future requests
    await setCache(CACHE_KEYS.ALL_PRODUCTS, products, TTL.ALL_PRODUCTS);
    console.log(`Cached all products (TTL: ${TTL.ALL_PRODUCTS}s)`);

    res.status(200).json({
      success: true,
      source: "database", // Tells the client this came from MongoDB
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// GET /products/:id — Fetch single product (cache-aware)
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cache miss scenario — query MongoDB
    const product = await Product.findById(id);

    if (!product) {
      const err = new Error("Product not found");
      err.statusCode = 404;
      return next(err);
    }

    // Cache the individual product for future requests
    await setCache(CACHE_KEYS.SINGLE_PRODUCT(id), product, TTL.SINGLE_PRODUCT);
    console.log(`Cached product:${id} (TTL: ${TTL.SINGLE_PRODUCT}s)`);

    res.status(200).json({
      success: true,
      source: "database",
      data: product,
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId format
    if (error.name === "CastError") {
      const err = new Error("Invalid product ID format");
      err.statusCode = 400;
      return next(err);
    }
    next(error);
  }
};

// POST /products — Create a new product
const createProduct = async (req, res, next) => {
  try {
    const { name, price, category, rating, stock, description } = req.body;

    // Create and save new product to MongoDB
    const product = await Product.create({
      name,
      price,
      category,
      rating,
      stock,
      description,
    });

    // Invalidate the "all products" cache since the list has changed
    await deleteCache(CACHE_KEYS.ALL_PRODUCTS);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const err = new Error(error.message);
      err.statusCode = 400;
      return next(err);
    }
    next(error);
  }
};

// PUT /products/:id — Update a product + invalidate cache
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,           // Return the updated document
        runValidators: true, // Run schema validators on update
      }
    );

    if (!product) {
      const err = new Error("Product not found");
      err.statusCode = 404;
      return next(err);
    }

    // Invalidate both the specific product cache AND the all-products cache
    await deleteCache(
      CACHE_KEYS.SINGLE_PRODUCT(id),
      CACHE_KEYS.ALL_PRODUCTS
    );

    res.status(200).json({
      success: true,
      message: "Product updated and cache invalidated",
      data: product,
    });
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error("Invalid product ID format");
      err.statusCode = 400;
      return next(err);
    }
    next(error);
  }
};

// DELETE /products/:id — Delete a product + invalidate cache
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      const err = new Error("Product not found");
      err.statusCode = 404;
      return next(err);
    }

    // Remove both specific product cache and full list cache
    await deleteCache(
      CACHE_KEYS.SINGLE_PRODUCT(id),
      CACHE_KEYS.ALL_PRODUCTS
    );

    res.status(200).json({
      success: true,
      message: "Product deleted and cache invalidated",
      data: product,
    });
  } catch (error) {
    if (error.name === "CastError") {
      const err = new Error("Invalid product ID format");
      err.statusCode = 400;
      return next(err);
    }
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

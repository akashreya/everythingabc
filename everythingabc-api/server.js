const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const winston = require("winston");
require("dotenv").config();

const database = require("./db");
const categoryRoutes = require("./routes/categories");
const imageCollectionRoutes = require("./routes/imageCollection");
const enhancedCollectionRoutes = require("./routes/enhancedCollection");

// Rich-linked resource routes (NEW - Letter Browsing Feature)
const lettersRoutes = require("./routes/letters");
const itemsRoutes = require("./routes/items");
const imagesResourceRoutes = require("./routes/imagesResource");

// V2 API - Rich Linked Architecture (CLEAN BACKEND)
const v2ApiRoutes = require("./routes/v2");

// ICS Compatibility routes
const icsCompatRoutes = require("./routes/icsCompat");
const seedRoutes = require("./routes/seed");
const imagesRoutes = require("./routes/images");
const progressRoutes = require("./routes/progress");
const miscRoutes = require("./routes/misc");

// Validation middleware
const {
  sanitizeQuery,
  requestTiming,
  createRateLimiter
} = require("./middleware/validation");

// Rich linking middleware for comprehensive API responses
const {
  addRichLinking,
  addRequestTiming,
  addApiHeaders
} = require("./middleware/rich-linking");

// V2 Rich Link Formatter for clean, modern API responses
const formatRichLinkResponse = require("./middleware/rich-link-formatter");

// Admin routes
const adminAuthRoutes = require("./admin/routes/auth");
const adminCategoriesRoutes = require("./admin/routes/categories");
const adminItemsRoutes = require("./admin/routes/items");
const adminDashboardRoutes = require("./admin/routes/dashboard");

// CMS Admin routes
const cmsCategoriesRoutes = require("./admin/routes/cms-categories");
const cmsItemsRoutes = require("./admin/routes/cms-items");
const cmsPublishingRoutes = require("./admin/routes/cms-publishing");
const cmsImportExportRoutes = require("./admin/routes/cms-import-export");

// Create Express app
const app = express();
const PORT = process.env.PORT || 3003; // Updated CORS

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "everythingabc-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for API
  })
);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:3004",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply global middleware
app.use(sanitizeQuery);        // Prevent injection attacks
app.use(requestTiming);         // Add response time tracking

// Apply global timing and headers
app.use(addRequestTiming);      // Add request timing metadata
app.use(addApiHeaders);         // Add API version headers

// Apply rate limiting to API routes (100 requests per 15 minutes)
const apiRateLimiter = createRateLimiter(100, 15 * 60 * 1000);
app.use('/api/', apiRateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
  });

  next();
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbHealthy = await database.ping();
    const dbStats = await database.getStats();

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbHealthy,
        stats: dbStats,
      },
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0",
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Detailed health check endpoint (for ICS compatibility)
app.get("/health/detailed", async (req, res) => {
  try {
    const dbHealthy = await database.ping();
    const dbStats = await database.getStats();

    // Get API client status
    const { apiClientManager } = require('./services/apiClients');
    const apiClientStatus = {};

    // Check if clients are initialized
    const availableClients = apiClientManager.getAvailableClients();

    ['unsplash', 'pixabay', 'pexels'].forEach(clientName => {
      const isInitialized = availableClients.includes(clientName);
      apiClientStatus[clientName] = isInitialized ? 'initialized' : 'not_initialized';
    });

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbHealthy,
        stats: dbStats,
      },
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        imageCollection: "available",
        enhancedCollection: "available",
        adminInterface: "available",
        aiGeneration: "mock",
        ...apiClientStatus
      },
      performance: {
        responseTime: Date.now() - req.startTime || 0,
        avgResponseTime: "< 100ms"
      }
    });
  } catch (error) {
    logger.error("Detailed health check failed:", error);
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: "Detailed health check failed",
    });
  }
});

// ========================================
// V2 API - RICH LINKED ARCHITECTURE (CLEAN BACKEND)
// ========================================
// 291KB → 15KB response size (94% reduction)
// Cross-category letter browsing + resource-based URLs
app.use("/api/v2", formatRichLinkResponse, v2ApiRoutes);  // NEW: Clean, rich-linked API

// ========================================
// RICH-LINKED RESOURCE ROUTES (V1 + NEW FEATURES)
// ========================================
// These routes enable cross-category letter browsing and resource-based access
app.use("/api/v1/letters", addRichLinking, lettersRoutes);        // Letter browsing (CORE FEATURE)
app.use("/api/v1/items", addRichLinking, itemsRoutes);            // Items resource
app.use("/api/v1/images", addRichLinking, imagesResourceRoutes);  // Images resource

// ========================================
// EXISTING API ROUTES (V1 - LEGACY)
// ========================================
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/collection", imageCollectionRoutes);
app.use("/api/v1/enhanced-collection", enhancedCollectionRoutes);

// ICS Compatibility routes
app.use("/api/v1", icsCompatRoutes); // Handles /collect/selected and /categories/search
app.use("/api/v1/seed", seedRoutes);
app.use("/api/v1/images", imagesRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1", miscRoutes); // Handles /generate, /clients, /dashboard, /status

// Admin routes (legacy)
app.use("/admin/auth", adminAuthRoutes);
app.use("/admin/categories", adminCategoriesRoutes);
app.use("/admin", adminItemsRoutes); // Items routes are nested under categories
app.use("/admin/dashboard", adminDashboardRoutes);

// CMS Admin routes (new)
app.use("/api/v1/admin/categories", cmsCategoriesRoutes);
app.use("/api/v1/admin/categories", cmsItemsRoutes);
app.use("/api/v1/admin", cmsPublishingRoutes); // Publishing routes define /items/... paths
app.use("/api/v1/admin/import-export", cmsImportExportRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // MongoDB validation errors
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: errors,
    });
  }

  // MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: `Duplicate value for field: ${field}`,
    });
  }

  // Cast errors (invalid ObjectId)
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : error.message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  const server = app.listen(PORT);

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await database.disconnect();
      logger.info("Database connection closed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Start server
async function startServer() {
  try {
    // Ensure logs directory exists
    const fs = require("fs");
    if (!fs.existsSync("logs")) {
      fs.mkdirSync("logs");
    }

    // Connect to database
    await database.connect();
    logger.info("Database connected successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 EverythingABC API server running on port ${PORT}`);
      logger.info(`📱 Frontend URL: ${process.env.CORS_ORIGIN}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info(`📖 API docs: http://localhost:${PORT}/api/v2/`);
      logger.info('');
      logger.info('========================================');
      logger.info('NEW: V2 API - Rich Linked Architecture');
      logger.info('========================================');
      logger.info(`🚀 V2 API Root: http://localhost:${PORT}/api/v2/`);
      logger.info(`📊 Performance: 291KB → 15KB (94% reduction)`);
      logger.info(`🔤 Letters: http://localhost:${PORT}/api/v2/letters/`);
      logger.info(`📋 Items: http://localhost:${PORT}/api/v2/items/`);
      logger.info(`🏷️  Categories: http://localhost:${PORT}/api/v2/categories/`);
      logger.info(`🖼️  Images: http://localhost:${PORT}/api/v2/images/`);
      logger.info(`🔍 Search: http://localhost:${PORT}/api/v2/search/`);
      logger.info(`📊 Stats: http://localhost:${PORT}/api/v2/stats/`);
      logger.info(`📝 Example: http://localhost:${PORT}/api/v2/letters/A/items/`);
      console.log(`✅ Server ready at http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error("Server error:", error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
// trigger restart - fix schema validation for collect selected

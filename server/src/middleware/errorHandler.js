// ============================================================
// EcoSphere ESG - Error Handler Middleware
// Centralized error handling for the API
// ============================================================

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  // PostgreSQL known errors
  if (err.code === '23505') {
    // unique_violation
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      field: err.constraint,
    });
  }

  if (err.code === '23503') {
    // foreign_key_violation
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found.',
      field: err.constraint,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the limit.',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for undefined routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
};

module.exports = { errorHandler, notFoundHandler };

const morgan = require('morgan');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Morgan logging configuration
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

const logger = morgan(morganFormat, {
  skip: (req, res) => {
    // Skip logging for health checks in production
    return process.env.NODE_ENV === 'production' && req.url === '/';
  }
});

// Database error handler
const handleDatabaseError = (err) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  switch (err.code) {
    case 'ER_DUP_ENTRY':
      message = 'Duplicate entry. This record already exists.';
      statusCode = 409;
      break;
    case 'ER_NO_REFERENCED_ROW_2':
      message = 'Referenced record does not exist.';
      statusCode = 400;
      break;
    case 'ER_ROW_IS_REFERENCED_2':
      message = 'Cannot delete record. It is referenced by other records.';
      statusCode = 400;
      break;
    case 'ER_ACCESS_DENIED_ERROR':
      message = 'Database access denied.';
      statusCode = 500;
      break;
    case 'ECONNREFUSED':
      message = 'Database connection refused.';
      statusCode = 500;
      break;
    case 'PROTOCOL_CONNECTION_LOST':
      message = 'Database connection lost.';
      statusCode = 500;
      break;
    default:
      if (err.sqlMessage) {
        message = `Database error: ${err.sqlMessage}`;
      }
  }

  return new AppError(message, statusCode);
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.code && err.code.startsWith('ER_')) {
    error = handleDatabaseError(err);
  }

  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    message = 'Something went wrong!';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  logger,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler
};

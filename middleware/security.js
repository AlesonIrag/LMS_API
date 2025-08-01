const helmet = require('helmet');
    const rateLimit = require('express-rate-limit');
const compression = require('compression');
      const securityHeaders = helmet({
contentSecurityPolicy: {
    directives: {
  defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
      },
hsts: {
    maxAge: 31536000,
  includeSubDomains: true,
      preload: true
}
    });
const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    message: {
  error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
},
    standardHeaders: true,
  legacyHeaders: false,
      });
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 5,
      message: {
error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
      standardHeaders: true,
legacyHeaders: false,
    });
  const compressionMiddleware = compression({
      filter: (req, res) => {
if (req.headers['x-no-compression']) {
    return false;
  }
      return compression.filter(req, res);
},
    level: 6,
  threshold: 1024,
      });
module.exports = {
    securityHeaders,
  limiter,
      authLimiter,
compressionMiddleware
    };

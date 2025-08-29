const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection to initialize it
const db = require('./config/database');

// Import weather logger
const weatherLogger = require('./utils/logger');

// Import middleware
const { securityHeaders, limiter, authLimiter, compressionMiddleware } = require('./middleware/security');
const { logger, globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminauth');
const facultyAuthRoutes = require('./routes/facultyauth');
const weatherRoutes = require('./routes/weather');
const uploadRoutes = require('./routes/upload');
const passwordResetRoutes = require('./routes/passwordReset');
const booksRoutes = require('./routes/books-simple');

// Create Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(compressionMiddleware);

// Logging middleware
app.use(logger);

// Rate limiting
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') :
    [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:3000',
      'https://your-frontend-domain.com',
      'https://your-backend-domain.com',
      'https://benedictocollege-library.org',
      'http://benedictocollege-library.org'
    ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing middleware (Express built-in)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes with rate limiting
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/adminauth', authLimiter, adminAuthRoutes);
app.use('/api/v1/facultyauth', authLimiter, facultyAuthRoutes);
app.use('/api/v1/password-reset', authLimiter, passwordResetRoutes);
app.use('/api/v1/books', booksRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// Serve static files for uploaded images with matching CORS
app.use('/api/v1/uploads/profile-photos', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:3000',
    'https://benedictocollege-library.org',
    'http://benedictocollege-library.org'
  ],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}), express.static(path.join(__dirname, 'uploads/profile-photos')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Backend API Server is running!',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Library Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      adminauth: '/api/v1/adminauth',
      facultyauth: '/api/v1/facultyauth',
      books: '/api/v1/books',
      weather: '/api/v1/weather',
      uploads: '/api/v1/uploads',
      passwordReset: '/api/v1/password-reset',
      health: '/',
      docs: '/api'
    }
  });
});

// Error handling middleware
app.use(globalErrorHandler);

// 404 handler
app.use(notFoundHandler);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Render requires binding to 0.0.0.0

app.listen(PORT, HOST, async () => {
  // Log server start
  weatherLogger.logServerStart(PORT);

  // Test weather API on startup
  weatherLogger.info('Initializing Weather API...');
  const weatherAPIWorking = await weatherLogger.testWeatherAPI();

  if (weatherAPIWorking) {
    weatherLogger.success('🌤️  Weather API is now ready and working!');
  } else {
    weatherLogger.warning('Weather API test failed - will use fallback data');
  }

  weatherLogger.info('Backend server initialization complete');
});

// Export for Vercel serverless functions
module.exports = app;
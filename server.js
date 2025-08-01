const express = require('express');
    const cors = require('cors');
require('dotenv').config();
  const db = require('./config/database');
const weatherLogger = require('./utils/logger');
      const { securityHeaders, limiter, authLimiter, compressionMiddleware } = require('./middleware/security');
const { logger, globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
    const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminauth');
        const facultyAuthRoutes = require('./routes/facultyauth');
const weatherRoutes = require('./routes/weather');
const app = express();
      app.set('trust proxy', 1);
app.use(securityHeaders);
    app.use(compressionMiddleware);
app.use(logger);
        app.use(limiter);
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') :
      ['http://localhost:3000',
        'http://localhost:3001',
    'http://localhost:4200',
          'http://127.0.0.1:4200',
'http://127.0.0.1:3000',
      'https://your-frontend-domain.com',
    'https://your-backend-domain.com'],
        credentials: true,
  optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
    };
app.use(cors(corsOptions));
      app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/adminauth', authLimiter, adminAuthRoutes);
        app.use('/api/v1/facultyauth', authLimiter, facultyAuthRoutes);
app.use('/api/v1/weather', weatherRoutes);
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
    app.get('/api', (req, res) => {
res.json({
      success: true,
message: 'Student Management API',
    version: '1.0.0',
  endpoints: {
      auth: '/api/v1/auth',
weather: '/api/v1/weather',
    health: '/',
  docs: '/api'
      }
});
    });
app.use(globalErrorHandler);
      app.use(notFoundHandler);
const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
weatherLogger.logServerStart(PORT);
      weatherLogger.info('Initializing Weather API...');
const weatherAPIWorking = await weatherLogger.testWeatherAPI();
    if (weatherAPIWorking) {
  weatherLogger.success('🌤️  Weather API is now ready and working!');
      } else {
weatherLogger.warning('Weather API test failed - will use fallback data');
    }
  weatherLogger.info('Backend server initialization complete');
      });
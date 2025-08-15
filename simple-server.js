const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3000', 'https://api.benedictocollege-library.org' , 'https://benedictocollege-library.org'],
  credentials: true
}));
app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Simple Backend API Server is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Simple books endpoint
app.get('/api/v1/books/get-all-books', (req, res) => {
  res.json({
    success: true,
    message: 'Books endpoint is working!',
    books: [],
    count: 0
  });
});

// Simple add book endpoint
app.post('/api/v1/books/add-book', (req, res) => {
  console.log('📤 Received book data:', req.body);
  
  res.json({
    success: true,
    message: 'Book added successfully!',
    book: {
      BookID: 1,
      ...req.body,
      CreatedAt: new Date().toISOString()
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log(`📚 Books API: http://localhost:${PORT}/api/v1/books/get-all-books`);
  console.log('🔄 Server is ready to accept connections...');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

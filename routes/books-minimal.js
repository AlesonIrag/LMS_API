/**
 * Minimal Books API Routes - Just for testing POST
 */

const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('📚 Test route called');
  res.json({
    success: true,
    message: 'Books API is working!',
    timestamp: new Date().toISOString()
  });
});

// Simple get all books route
router.get('/get-all-books', async (req, res) => {
  console.log('📚 GET /get-all-books - Minimal version');
  
  try {
    const db = require('../config/database');
    const query = 'SELECT * FROM books ORDER BY CreatedAt DESC LIMIT 10';
    const [books] = await db.execute(query);
    
    res.json({
      success: true,
      books: books,
      count: books.length,
      message: `Retrieved ${books.length} books`
    });
    
  } catch (error) {
    console.error('❌ Error in get-all-books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve books'
    });
  }
});

// Simple POST route - test first
router.post('/add-book', (req, res) => {
  console.log('➕ POST /add-book - Simple test version');
  console.log('📋 Request body:', req.body);

  // Just return success without database operations for now
  res.status(201).json({
    success: true,
    message: 'POST route is working!',
    receivedData: req.body
  });
});

module.exports = router;

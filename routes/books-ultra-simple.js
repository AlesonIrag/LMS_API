/**
 * Ultra Simple Books Route - Just POST
 */

const express = require('express');
const router = express.Router();

console.log('📚 Books ultra-simple route loaded!');

// Test route
router.get('/test', (req, res) => {
  console.log('📚 Ultra simple test route');
  res.json({ success: true, message: 'Ultra simple books API working!' });
});

// Ultra simple POST route
router.post('/add-book', (req, res) => {
  console.log('➕ Ultra simple POST /add-book - ROUTE HIT!');
  console.log('📋 Body:', req.body);

  res.status(201).json({
    success: true,
    message: 'Ultra simple POST is working!',
    data: req.body
  });
});

console.log('📚 POST route /add-book registered!');

module.exports = router;

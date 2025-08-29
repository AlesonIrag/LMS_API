// Simple test server just for POST functionality
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple POST route
app.post('/api/v1/books/add-book', async (req, res) => {
  console.log('➕ POST /add-book - Test server');
  console.log('📋 Request body:', req.body);

  const { Title, Author, ISBN } = req.body;

  if (!Title || !ISBN) {
    return res.status(400).json({
      success: false,
      error: 'Title and ISBN are required'
    });
  }

  try {
    // Import database
    const db = require('./config/database');
    
    // Simple insert
    const insertQuery = `
      INSERT INTO books (Title, Author, ISBN, Status, CreatedAt, UpdatedAt) 
      VALUES (?, ?, ?, 'Available', NOW(), NOW())
    `;
    
    const [result] = await db.execute(insertQuery, [Title, Author || null, ISBN]);
    
    console.log('✅ Book added with ID:', result.insertId);
    
    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      bookId: result.insertId,
      data: { Title, Author, ISBN }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      details: error.message
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Test POST server is running!' });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test POST server running on port ${PORT}`);
  console.log(`📚 POST endpoint: http://localhost:${PORT}/api/v1/books/add-book`);
});

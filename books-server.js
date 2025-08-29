const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'lms2026',
  database: process.env.DB_NAME || 'lms2026',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware for book data
const validateBookData = [
  body('Title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('ISBN')
    .notEmpty()
    .withMessage('ISBN is required')
    .isLength({ max: 50 })
    .withMessage('ISBN must be less than 50 characters'),
  body('Author')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Author must be less than 255 characters'),
  body('Category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('Subject')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Subject must be less than 100 characters'),
  body('PublishedYear')
    .optional()
    .isInt({ min: 1000, max: 2030 })
    .withMessage('Published year must be between 1000 and 2030'),
  body('Publisher')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Publisher must be less than 255 characters'),
  body('Copies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Copies must be at least 1'),
  body('Status')
    .optional()
    .isIn(['Available', 'Borrowed', 'Lost', 'Damaged'])
    .withMessage('Status must be Available, Borrowed, Lost, or Damaged')
];

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Books API Server is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/books/get-all-books - Get all books
app.get('/api/v1/books/get-all-books', asyncHandler(async (req, res) => {
  try {
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books
      ORDER BY CreatedAt DESC
    `;

    const [books] = await db.execute(selectQuery);

    res.json({
      success: true,
      books: books,
      count: books.length,
      message: `Retrieved ${books.length} books`
    });

  } catch (error) {
    console.error('❌ Error retrieving books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve books'
    });
  }
}));

// POST /api/v1/books/add-book - Add a new book
app.post('/api/v1/books/add-book', validateBookData, asyncHandler(async (req, res) => {
  console.log('📤 Received book data:', req.body);
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const {
    Title,
    Author,
    ISBN,
    Category,
    Subject,
    PublishedYear,
    CopyrightYear,
    Publisher,
    CallNumber,
    DeweyDecimal,
    Copies,
    Remarks,
    Status,
    ShelfLocation,
    AcquisitionDate
  } = req.body;

  try {
    // Insert book into database
    const insertQuery = `
      INSERT INTO books (
        Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
        Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
        ShelfLocation, AcquisitionDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Title,
      Author || null,
      ISBN,
      Category || null,
      Subject || null,
      PublishedYear || null,
      CopyrightYear || null,
      Publisher || null,
      CallNumber || null,
      DeweyDecimal || null,
      Copies || 1,
      Remarks || null,
      Status || 'Available',
      ShelfLocation || null,
      AcquisitionDate || null
    ];

    console.log('📝 Executing query with values:', values);
    const [result] = await db.execute(insertQuery, values);
    console.log('✅ Book inserted with ID:', result.insertId);

    // Get the inserted book
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;

    const [books] = await db.execute(selectQuery, [result.insertId]);
    const book = books[0];

    console.log('📚 Retrieved book:', book);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book: book,
      bookId: result.insertId
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'A book with this ISBN already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add book to database'
    });
  }
}));

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
const server = app.listen(PORT, async () => {
  console.log(`✅ Books API Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log(`📚 Books API: http://localhost:${PORT}/api/v1/books/get-all-books`);
  
  // Test database connection
  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
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

/**
 * Standalone POST Server - Just for testing your book data
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.originalUrl}`);
  next();
});

// Your exact POST route
app.post('/api/v1/books/add-book', async (req, res) => {
  console.log('➕ POST /add-book - STANDALONE SERVER');
  console.log('📋 Request body:', req.body);

  try {
    const {
      Title, Author, ISBN, Category, Subject, PublishedYear,
      CopyrightYear, Publisher, CallNumber, DeweyDecimal, 
      Copies, Remarks, Status, ShelfLocation, AcquisitionDate
    } = req.body;

    // Basic validation
    if (!Title || !ISBN) {
      console.log('❌ Validation failed: Missing Title or ISBN');
      return res.status(400).json({
        success: false,
        error: 'Title and ISBN are required fields'
      });
    }

    // Import database
    const db = require('./config/database');
    
    console.log(`📖 Adding new book: "${Title}" with ISBN: ${ISBN}`);

    // Check if ISBN already exists
    const checkQuery = 'SELECT BookID, Title FROM books WHERE ISBN = ?';
    const [existingBooks] = await db.execute(checkQuery, [ISBN]);
    
    if (existingBooks.length > 0) {
      console.log(`❌ ISBN already exists: ${existingBooks[0].Title}`);
      return res.status(409).json({
        success: false,
        error: `A book with ISBN "${ISBN}" already exists: "${existingBooks[0].Title}"`
      });
    }

    // Handle AcquisitionDate formatting
    let formattedAcquisitionDate = null;
    if (AcquisitionDate) {
      const date = new Date(AcquisitionDate);
      if (!isNaN(date.getTime())) {
        formattedAcquisitionDate = date.toISOString().split('T')[0];
        console.log(`📅 Formatted AcquisitionDate: ${AcquisitionDate} → ${formattedAcquisitionDate}`);
      }
    }

    // Insert new book with all your fields
    const insertQuery = `
      INSERT INTO books (
        Title, Author, ISBN, Category, Subject, PublishedYear,
        CopyrightYear, Publisher, CallNumber, DeweyDecimal, 
        Copies, Remarks, Status, ShelfLocation, AcquisitionDate,
        CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
      Copies || null,
      Remarks || null,
      Status || 'Available',
      ShelfLocation || null,
      formattedAcquisitionDate
    ];

    console.log('🔧 Executing insert query...');
    const [result] = await db.execute(insertQuery, values);

    if (result.affectedRows === 0) {
      console.log('❌ Insert failed: No rows affected');
      return res.status(500).json({
        success: false,
        error: 'Failed to add book to database'
      });
    }

    const newBookId = result.insertId;
    console.log(`✅ Book inserted with ID: ${newBookId}`);

    // Get the newly created book
    const selectQuery = 'SELECT * FROM books WHERE BookID = ?';
    const [newBooks] = await db.execute(selectQuery, [newBookId]);
    const newBook = newBooks[0];

    console.log(`🎉 SUCCESS! New book added: "${newBook.Title}"`);
    
    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: newBook,
      bookId: newBookId
    });

  } catch (error) {
    console.error('❌ Add book error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add book',
      details: error.message
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Standalone POST server is running!' });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Standalone POST server running on port ${PORT}`);
  console.log(`📚 POST endpoint: http://localhost:${PORT}/api/v1/books/add-book`);
});

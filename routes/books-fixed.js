/**
 * FIXED Books API Routes - Working POST functionality
 */

const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('📚 Books API test route called');
  res.json({
    success: true,
    message: 'Books API is working!',
    timestamp: new Date().toISOString()
  });
});

// Get all books
router.get('/get-all-books', async (req, res) => {
  console.log('📚 GET /get-all-books');
  
  try {
    const db = require('../config/database');
    const query = 'SELECT * FROM books ORDER BY CreatedAt DESC';
    const [books] = await db.execute(query);
    
    console.log(`✅ Retrieved ${books.length} books`);
    
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

// ADD NEW BOOK - POST route (FIXED)
router.post('/add-book', async (req, res) => {
  console.log('➕ POST /add-book - FIXED VERSION');
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

    const db = require('../config/database');
    
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

    // Insert new book with all fields
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

    console.log(`✅ SUCCESS! New book added: "${newBook.Title}"`);
    
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

// Update book
router.put('/update-book/:bookId', async (req, res) => {
  console.log('🔄 PUT /update-book');
  const { bookId } = req.params;
  const { Remarks } = req.body;
  
  try {
    const db = require('../config/database');
    const updateQuery = 'UPDATE books SET Remarks = ?, UpdatedAt = NOW() WHERE BookID = ?';
    const [result] = await db.execute(updateQuery, [Remarks || null, bookId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    console.log(`✅ Book ${bookId} updated successfully`);
    res.json({
      success: true,
      message: 'Book updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book'
    });
  }
});

// Delete book
router.delete('/delete-book/:bookId', async (req, res) => {
  console.log('🗑️ DELETE /delete-book');
  const { bookId } = req.params;
  
  try {
    const db = require('../config/database');
    const deleteQuery = 'DELETE FROM books WHERE BookID = ?';
    const [result] = await db.execute(deleteQuery, [bookId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    console.log(`✅ Book ${bookId} deleted successfully`);
    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book'
    });
  }
});

module.exports = router;

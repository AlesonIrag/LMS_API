const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('📚 Books route test endpoint hit');
  res.json({
    success: true,
    message: 'Books route is working!',
    timestamp: new Date().toISOString()
  });
});

// Get all books route - FIXED VERSION (NO LIMIT)
router.get('/get-all-books', async (req, res) => {
  console.log('📚 GET /get-all-books - FIXED VERSION (NO LIMIT)');
  
  try {
    // Import database here to avoid import issues
    const db = require('../config/database');
    
    console.log('Database imported successfully');
    
    // FIXED: Removed LIMIT to get ALL books
    const query = 'SELECT * FROM books ORDER BY CreatedAt DESC';
    console.log('Executing query:', query);
    
    const [books] = await db.execute(query);
    console.log(`✅ Found ${books.length} books in database (NO LIMIT)`);
    
    res.json({
      success: true,
      books: books,
      count: books.length,
      totalBooks: books.length,
      message: `Retrieved ALL ${books.length} books from database`
    });
    
  } catch (error) {
    console.error('❌ Error in get-all-books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve books',
      details: error.message
    });
  }
});

// Add book route
router.post('/add-book', async (req, res) => {
  console.log('➕ POST /add-book - Adding new book');
  
  const {
    Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
    Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
    ShelfLocation, AcquisitionDate
  } = req.body;

  // Basic validation - Title and ISBN are required
  if (!Title || !ISBN) {
    return res.status(400).json({
      success: false,
      error: 'Title and ISBN are required fields'
    });
  }

  try {
    const db = require('../config/database');

    // Check if ISBN already exists
    const [existingBooks] = await db.execute(
      'SELECT BookID FROM books WHERE ISBN = ?',
      [ISBN]
    );

    if (existingBooks.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A book with this ISBN already exists'
      });
    }

    // Format the acquisition date for MySQL
    let formattedDate = null;
    if (AcquisitionDate) {
      const date = new Date(AcquisitionDate);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }

    // Insert the new book
    const insertQuery = `
      INSERT INTO books (
        Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
        Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
        ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await db.execute(insertQuery, [
      Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
      Publisher, CallNumber, DeweyDecimal, Copies || 1, Remarks, Status || 'Available',
      ShelfLocation, formattedDate
    ]);

    console.log('✅ Book added successfully with ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      bookId: result.insertId,
      book: {
        BookID: result.insertId,
        Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
        Publisher, CallNumber, DeweyDecimal, Copies: Copies || 1, Remarks,
        Status: Status || 'Available', ShelfLocation, AcquisitionDate: formattedDate
      }
    });

  } catch (error) {
    console.error('❌ Error adding book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add book',
      details: error.message
    });
  }
});

// Update book route
router.put('/update-book/:bookId', async (req, res) => {
  console.log('📝 PUT /update-book/:bookId - Updating book');
  
  const { bookId } = req.params;
  const updateData = req.body;

  try {
    const db = require('../config/database');

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null && updateData[key] !== '') {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add UpdatedAt field
    updateFields.push('UpdatedAt = NOW()');
    updateValues.push(bookId);

    const updateQuery = `UPDATE books SET ${updateFields.join(', ')} WHERE BookID = ?`;

    const [result] = await db.execute(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    console.log('✅ Book updated successfully');

    res.json({
      success: true,
      message: 'Book updated successfully',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error updating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      details: error.message
    });
  }
});

// Delete book route
router.delete('/delete-book/:bookId', async (req, res) => {
  console.log('🗑️ DELETE /delete-book/:bookId - Deleting book');
  
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

    console.log('✅ Book deleted successfully');

    res.json({
      success: true,
      message: 'Book deleted successfully',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      details: error.message
    });
  }
});

module.exports = router;

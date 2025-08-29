/**
 * Simple Books API Routes - Minimal version for testing
 */

const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  console.log('📚 Test route called');
  res.json({
    success: true,
    message: 'Books API is working!',
    timestamp: new Date().toISOString()
  });
});

// Get books with pagination support
router.get('/get-all-books', async (req, res) => {
  console.log('📚 GET /get-all-books - With pagination support');

  try {
    // Import database here to avoid import issues
    const db = require('../config/database');

    console.log('Database imported successfully');

    // Extract pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log('📄 Pagination params:', { page, limit, offset });

    // Get total count of books
    const countQuery = 'SELECT COUNT(*) as total FROM books';
    const [countResult] = await db.execute(countQuery);
    const totalBooks = countResult[0].total;
    const totalPages = Math.ceil(totalBooks / limit);

    console.log('📊 Total books:', totalBooks, 'Total pages:', totalPages);

    // Get paginated books
    const query = 'SELECT * FROM books ORDER BY CreatedAt DESC LIMIT ? OFFSET ?';
    console.log('Executing query:', query, [limit, offset]);

    const [books] = await db.execute(query, [limit, offset]);
    console.log(`Found ${books.length} books for page ${page}`);

    res.json({
      success: true,
      books: books,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalBooks: totalBooks,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      count: books.length,
      message: `Retrieved ${books.length} books for page ${page} of ${totalPages}`
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

// Simple update route - just for remarks
router.put('/update-book/:bookId', async (req, res) => {
  console.log('🔄 PUT /update-book - Simple version');
  console.log('BookID:', req.params.bookId);
  console.log('Body:', req.body);

  const { bookId } = req.params;
  const { Remarks } = req.body;

  try {
    // Import database here
    const db = require('../config/database');
    
    console.log('Database imported for update');
    
    // Check if book exists
    const checkQuery = 'SELECT BookID, Title FROM books WHERE BookID = ?';
    console.log('Checking if book exists:', checkQuery, [bookId]);
    
    const [existing] = await db.execute(checkQuery, [bookId]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    console.log(`Book found: ${existing[0].Title}`);

    // Update only remarks
    const updateQuery = 'UPDATE books SET Remarks = ?, UpdatedAt = NOW() WHERE BookID = ?';
    console.log('Executing update:', updateQuery, [Remarks, bookId]);
    
    const [result] = await db.execute(updateQuery, [Remarks || null, bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'No changes made'
      });
    }

    // Get updated book
    const selectQuery = 'SELECT * FROM books WHERE BookID = ?';
    const [updated] = await db.execute(selectQuery, [bookId]);
    
    console.log(`✅ Book ${bookId} updated successfully`);
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updated[0]
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      details: error.message
    });
  }
});

// Simple delete route
router.delete('/delete-book/:bookId', async (req, res) => {
  console.log('🗑️ DELETE /delete-book - Simple version');
  console.log('BookID:', req.params.bookId);

  const { bookId } = req.params;

  try {
    // Import database here
    const db = require('../config/database');
    
    console.log('Database imported for delete');
    
    // Check if book exists
    const checkQuery = 'SELECT BookID, Title FROM books WHERE BookID = ?';
    const [existing] = await db.execute(checkQuery, [bookId]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const bookToDelete = existing[0];
    console.log(`Deleting book: ${bookToDelete.Title}`);

    // Delete the book
    const deleteQuery = 'DELETE FROM books WHERE BookID = ?';
    const [result] = await db.execute(deleteQuery, [bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found or already deleted'
      });
    }

    console.log(`✅ Book ${bookId} deleted successfully`);
    
    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: {
        deletedBookId: parseInt(bookId),
        deletedTitle: bookToDelete.Title
      }
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      details: error.message
    });
  }
});

// Simple add book route
router.post('/add-book', async (req, res) => {
  console.log('➕ POST /add-book - Adding new book');
  console.log('📋 Request body:', req.body);

  const {
    Title, Author, ISBN, Category, Subject, PublishedYear,
    CopyrightYear, Publisher, CallNumber, DeweyDecimal,
    Copies, Remarks, Status, ShelfLocation, AcquisitionDate
  } = req.body;

  // Basic validation - Title and ISBN are required
  if (!Title || !ISBN) {
    console.log('❌ Validation failed: Missing Title or ISBN');
    return res.status(400).json({
      success: false,
      error: 'Title and ISBN are required fields'
    });
  }

  try {
    // Import database here
    const db = require('../config/database');

    console.log('Database imported for add book');

    // Check if ISBN already exists
    const checkQuery = 'SELECT BookID, Title FROM books WHERE ISBN = ?';
    console.log('Checking for duplicate ISBN:', checkQuery, [ISBN]);

    const [existingBooks] = await db.execute(checkQuery, [ISBN]);

    if (existingBooks.length > 0) {
      console.log(`❌ ISBN already exists: ${existingBooks[0].Title}`);
      return res.status(409).json({
        success: false,
        error: `A book with ISBN "${ISBN}" already exists: "${existingBooks[0].Title}"`
      });
    }

    console.log(`📖 Adding new book: "${Title}" with ISBN: ${ISBN}`);

    // Handle AcquisitionDate formatting
    let formattedAcquisitionDate = null;
    if (AcquisitionDate) {
      const date = new Date(AcquisitionDate);
      if (!isNaN(date.getTime())) {
        formattedAcquisitionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log(`📅 Formatted AcquisitionDate: ${AcquisitionDate} → ${formattedAcquisitionDate}`);
      }
    }

    // Insert new book
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

    console.log('🔧 Executing insert query:', insertQuery);
    console.log('🔧 With values:', values);

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

    console.log(`✅ New book added successfully: "${newBook.Title}"`);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: newBook
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

module.exports = router;

/**
 * Working Books API Routes - Library Management System
 * Handles CRUD operations for books with proper error handling
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Simple async handler to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET all books
router.get('/get-all-books', asyncHandler(async (req, res) => {
  console.log('📚 GET /get-all-books - Fetching all books');
  
  try {
    const query = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books 
      ORDER BY CreatedAt DESC
    `;
    
    const [books] = await db.execute(query);
    console.log(`✅ Successfully retrieved ${books.length} books`);
    
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

// GET single book by ID
router.get('/get-book/:bookId', asyncHandler(async (req, res) => {
  console.log('📖 GET /get-book/:bookId - Fetching single book');
  
  const { bookId } = req.params;
  
  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid book ID'
    });
  }

  try {
    const query = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books 
      WHERE BookID = ?
    `;
    
    const [books] = await db.execute(query, [bookId]);
    
    if (books.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    console.log(`✅ Found book: ${books[0].Title}`);
    
    res.json({
      success: true,
      book: books[0],
      message: 'Book retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error retrieving book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve book'
    });
  }
}));

// UPDATE book (supports partial updates)
router.put('/update-book/:bookId', asyncHandler(async (req, res) => {
  console.log('🔄 PUT /update-book - Update request received');
  console.log('📋 BookID:', req.params.bookId);
  console.log('📋 Request body:', req.body);

  const { bookId } = req.params;
  
  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid book ID'
    });
  }

  try {
    // Check if book exists
    const [existing] = await db.execute('SELECT * FROM books WHERE BookID = ?', [bookId]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const currentBook = existing[0];
    console.log(`📖 Updating book: "${currentBook.Title}"`);

    // Extract all possible fields from request body
    const {
      Title, Author, ISBN, Category, Subject, PublishedYear,
      CopyrightYear, Publisher, CallNumber, DeweyDecimal, 
      Copies, Remarks, Status, ShelfLocation, AcquisitionDate
    } = req.body;

    // Build dynamic update query - only update provided fields
    const updateFields = [];
    const values = [];

    if (Title !== undefined) {
      updateFields.push('Title = ?');
      values.push(Title);
      console.log(`📝 Updating Title: "${currentBook.Title}" → "${Title}"`);
    }

    if (Author !== undefined) {
      updateFields.push('Author = ?');
      values.push(Author || null);
      console.log(`📝 Updating Author: "${currentBook.Author}" → "${Author}"`);
    }

    if (ISBN !== undefined) {
      updateFields.push('ISBN = ?');
      values.push(ISBN);
      console.log(`📝 Updating ISBN: "${currentBook.ISBN}" → "${ISBN}"`);
    }

    if (Category !== undefined) {
      updateFields.push('Category = ?');
      values.push(Category || null);
      console.log(`📝 Updating Category: "${currentBook.Category}" → "${Category}"`);
    }

    if (Subject !== undefined) {
      updateFields.push('Subject = ?');
      values.push(Subject || null);
      console.log(`📝 Updating Subject: "${currentBook.Subject}" → "${Subject}"`);
    }

    if (PublishedYear !== undefined) {
      updateFields.push('PublishedYear = ?');
      values.push(PublishedYear || null);
      console.log(`📝 Updating PublishedYear: "${currentBook.PublishedYear}" → "${PublishedYear}"`);
    }

    if (CopyrightYear !== undefined) {
      updateFields.push('CopyrightYear = ?');
      values.push(CopyrightYear || null);
      console.log(`📝 Updating CopyrightYear: "${currentBook.CopyrightYear}" → "${CopyrightYear}"`);
    }

    if (Publisher !== undefined) {
      updateFields.push('Publisher = ?');
      values.push(Publisher || null);
      console.log(`📝 Updating Publisher: "${currentBook.Publisher}" → "${Publisher}"`);
    }

    if (CallNumber !== undefined) {
      updateFields.push('CallNumber = ?');
      values.push(CallNumber || null);
      console.log(`📝 Updating CallNumber: "${currentBook.CallNumber}" → "${CallNumber}"`);
    }

    if (DeweyDecimal !== undefined) {
      updateFields.push('DeweyDecimal = ?');
      values.push(DeweyDecimal || null);
      console.log(`📝 Updating DeweyDecimal: "${currentBook.DeweyDecimal}" → "${DeweyDecimal}"`);
    }

    if (Copies !== undefined) {
      updateFields.push('Copies = ?');
      values.push(Copies || null);
      console.log(`📝 Updating Copies: "${currentBook.Copies}" → "${Copies}"`);
    }

    if (Remarks !== undefined) {
      updateFields.push('Remarks = ?');
      values.push(Remarks || null);
      console.log(`📝 Updating Remarks: "${currentBook.Remarks}" → "${Remarks}"`);
    }

    if (Status !== undefined) {
      updateFields.push('Status = ?');
      values.push(Status || null);
      console.log(`📝 Updating Status: "${currentBook.Status}" → "${Status}"`);
    }

    if (ShelfLocation !== undefined) {
      updateFields.push('ShelfLocation = ?');
      values.push(ShelfLocation || null);
      console.log(`📝 Updating ShelfLocation: "${currentBook.ShelfLocation}" → "${ShelfLocation}"`);
    }

    // Handle AcquisitionDate with proper MySQL DATE formatting
    if (AcquisitionDate !== undefined) {
      let formattedDate = null;
      if (AcquisitionDate) {
        const date = new Date(AcquisitionDate);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
          console.log(`📅 Formatted AcquisitionDate: ${AcquisitionDate} → ${formattedDate}`);
        }
      }
      updateFields.push('AcquisitionDate = ?');
      values.push(formattedDate);
      console.log(`📝 Updating AcquisitionDate: "${currentBook.AcquisitionDate}" → "${formattedDate}"`);
    }

    // Always update the timestamp
    updateFields.push('UpdatedAt = NOW()');

    if (updateFields.length === 1) { // Only UpdatedAt was added
      return res.status(400).json({
        success: false,
        error: 'No fields provided for update'
      });
    }

    // Add BookID for WHERE clause
    values.push(bookId);

    // Execute the update
    const updateQuery = `UPDATE books SET ${updateFields.join(', ')} WHERE BookID = ?`;
    console.log('🔧 Executing update query:', updateQuery);
    console.log('🔧 With values:', values);

    const [result] = await db.execute(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found or no changes made'
      });
    }

    // Get the updated book data
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;
    const [updatedBooks] = await db.execute(selectQuery, [bookId]);
    const updatedBook = updatedBooks[0];

    console.log(`✅ Book ID ${bookId} updated successfully`);

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      details: error.message
    });
  }
}));

// DELETE book
router.delete('/delete-book/:bookId', asyncHandler(async (req, res) => {
  console.log('🗑️ DELETE /delete-book/:bookId - Delete request received');
  console.log('📋 BookID:', req.params.bookId);

  const { bookId } = req.params;

  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid book ID'
    });
  }

  try {
    // Check if book exists first and get its details
    const [existing] = await db.execute('SELECT BookID, Title FROM books WHERE BookID = ?', [bookId]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const bookToDelete = existing[0];
    console.log(`📖 Deleting book: "${bookToDelete.Title}" (ID: ${bookId})`);

    // Delete the book
    const deleteQuery = 'DELETE FROM books WHERE BookID = ?';
    const [result] = await db.execute(deleteQuery, [bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found or already deleted'
      });
    }

    console.log(`✅ Book ID ${bookId} deleted successfully`);

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
}));

// ADD new book
router.post('/add-book', asyncHandler(async (req, res) => {
  console.log('➕ POST /add-book - Add new book request received');
  console.log('📋 Request body:', req.body);

  const {
    Title, Author, ISBN, Category, Subject, PublishedYear,
    CopyrightYear, Publisher, CallNumber, DeweyDecimal,
    Copies, Remarks, Status, ShelfLocation, AcquisitionDate
  } = req.body;

  // Basic validation - Title and ISBN are required
  if (!Title || !ISBN) {
    return res.status(400).json({
      success: false,
      error: 'Title and ISBN are required fields'
    });
  }

  try {
    // Check if ISBN already exists
    const [existingBooks] = await db.execute('SELECT BookID, Title FROM books WHERE ISBN = ?', [ISBN]);

    if (existingBooks.length > 0) {
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
      return res.status(500).json({
        success: false,
        error: 'Failed to add book to database'
      });
    }

    const newBookId = result.insertId;

    // Get the newly created book
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;
    const [newBooks] = await db.execute(selectQuery, [newBookId]);
    const newBook = newBooks[0];

    console.log(`✅ New book added successfully with ID: ${newBookId}`);
    console.log(`📖 Book title: "${newBook.Title}"`);

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
}));

module.exports = router;

/**
 * =====================================================
 * BOOKS ROUTES - Library Management System
 * =====================================================
 *
 * This file contains all the API routes for managing books in the library system.
 * It provides full CRUD (Create, Read, Update, Delete) operations for books.
 *
 * Available Operations:
 * - GET    /books/get-all-books     - Retrieve all books from the database
 * - POST   /books/add-book          - Add a new book to the library
 * - GET    /books/get-book/:bookId  - Get details of a specific book
 * - PUT    /books/update-book/:bookId - Update an existing book's information
 * - DELETE /books/delete-book/:bookId - Remove a book from the library
 *
 * All routes include proper validation, error handling, and logging.
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * =====================================================
 * VALIDATION MIDDLEWARE
 * =====================================================
 *
 * Defines validation rules for book data to ensure data integrity
 * and prevent invalid data from being stored in the database.
 */
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

/**
 * =====================================================
 * GET ALL BOOKS - READ OPERATION
 * =====================================================
 *
 * Route: GET /books/get-all-books
 * Purpose: Retrieve all books from the database
 *
 * This endpoint fetches all books stored in the library database
 * and returns them in descending order by creation date (newest first).
 *
 * Response Format:
 * {
 *   success: true,
 *   books: [...],           // Array of book objects
 *   count: number,          // Total number of books
 *   message: string         // Success message
 * }
 *
 * Used by: Books management interface, catalog display
 */
router.get('/get-all-books', asyncHandler(async (req, res) => {
  console.log('📚 GET /get-all-books - Fetching all books from database');

  try {
    // SQL query to select all book fields, ordered by newest first
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books
      ORDER BY CreatedAt DESC
    `;

    // Execute the query
    const [books] = await db.execute(selectQuery);

    console.log(`✅ Successfully retrieved ${books.length} books from database`);

    // Return success response with books data
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

/**
 * =====================================================
 * ADD NEW BOOK - CREATE OPERATION
 * =====================================================
 *
 * Route: POST /books/add-book
 * Purpose: Add a new book to the library database
 *
 * This endpoint creates a new book record in the database.
 * It validates all input data, handles duplicate ISBN prevention,
 * and returns the complete book object after successful creation.
 *
 * Required Fields:
 * - Title: Book title (max 255 chars)
 * - ISBN: International Standard Book Number (max 50 chars)
 *
 * Optional Fields:
 * - Author, Category, Subject, Publisher, etc.
 *
 * Response Format:
 * {
 *   success: true,
 *   message: "Book added successfully",
 *   book: {...},            // Complete book object
 *   bookId: number          // Auto-generated book ID
 * }
 *
 * Used by: Admin dashboard, librarian interface
 */
router.post('/add-book', validateBookData, asyncHandler(async (req, res) => {
  console.log('📖 POST /add-book - Adding new book to library');
  console.log('📋 Received book data:', req.body);

  // Check for validation errors from middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  // Extract book data from request body
  const {
    Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
    Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
    ShelfLocation, AcquisitionDate
  } = req.body;

  try {
    // Format AcquisitionDate to MySQL DATE format (YYYY-MM-DD)
    let formattedAcquisitionDate = null;
    if (AcquisitionDate) {
      const date = new Date(AcquisitionDate);
      if (!isNaN(date.getTime())) {
        // Convert to YYYY-MM-DD format for MySQL DATE column
        formattedAcquisitionDate = date.toISOString().split('T')[0];
        console.log(`📅 Formatted AcquisitionDate: ${AcquisitionDate} → ${formattedAcquisitionDate}`);
      } else {
        console.log('⚠️ Invalid AcquisitionDate format, setting to null');
      }
    }

    // SQL query to insert new book into database
    const insertQuery = `
      INSERT INTO books (
        Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
        Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
        ShelfLocation, AcquisitionDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Prepare values array, converting empty strings to null for optional fields
    const values = [
      Title,                        // Required field
      Author || null,               // Optional - convert empty to null
      ISBN,                         // Required field
      Category || null,             // Optional
      Subject || null,              // Optional
      PublishedYear || null,        // Optional
      CopyrightYear || null,        // Optional
      Publisher || null,            // Optional
      CallNumber || null,           // Optional
      DeweyDecimal || null,         // Optional
      Copies || 1,                  // Default to 1 if not provided
      Remarks || null,              // Optional
      Status || 'Available',        // Default to 'Available'
      ShelfLocation || null,        // Optional
      formattedAcquisitionDate      // Formatted date for MySQL
    ];

    console.log('📤 Executing insert query with values:', values);

    // Execute the insert query
    const [result] = await db.execute(insertQuery, values);
    const newBookId = result.insertId;

    console.log(`✅ Book inserted successfully with ID: ${newBookId}`);

    // Fetch the complete book record to return to client
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;

    const [books] = await db.execute(selectQuery, [newBookId]);
    const newBook = books[0];

    console.log('📚 Retrieved complete book record:', newBook);

    // Return success response with the new book data
    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book: newBook,
      bookId: newBookId
    });

  } catch (error) {
    console.error('❌ Database error while adding book:', error);

    // Handle duplicate ISBN error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'A book with this ISBN already exists'
      });
    }

    // Handle other database errors
    res.status(500).json({
      success: false,
      error: 'Failed to add book to database'
    });
  }
}));

/**
 * =====================================================
 * GET SPECIFIC BOOK - READ OPERATION
 * =====================================================
 *
 * Route: GET /books/get-book/:bookId
 * Purpose: Retrieve details of a specific book by its ID
 *
 * This endpoint fetches a single book record from the database
 * using the provided book ID. Returns 404 if book doesn't exist.
 *
 * Parameters:
 * - bookId: The unique identifier of the book (URL parameter)
 *
 * Response Format:
 * {
 *   success: true,
 *   book: {...},            // Complete book object
 *   message: string         // Success message
 * }
 *
 * Used by: Book detail views, edit forms, book information display
 */
router.get('/get-book/:bookId', asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  console.log(`🔍 GET /get-book/${bookId} - Fetching specific book details`);

  try {
    // SQL query to select specific book by ID
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;

    // Execute query with book ID parameter
    const [books] = await db.execute(selectQuery, [bookId]);

    // Check if book exists
    if (books.length === 0) {
      console.log(`❌ Book with ID ${bookId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const book = books[0];
    console.log(`✅ Successfully retrieved book: "${book.Title}" (ID: ${bookId})`);

    // Return success response with book data
    res.json({
      success: true,
      book: book,
      message: 'Book retrieved successfully'
    });

  } catch (error) {
    console.error(`❌ Error retrieving book ID ${bookId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve book'
    });
  }
}));

// PUT /update-book/:bookId - Update a book
router.put('/update-book/:bookId', asyncHandler(async (req, res) => {
  console.log('🔄 PUT /update-book/:bookId - Request received');
  console.log('📋 Request params:', req.params);
  console.log('📋 Request body:', req.body);

  const { bookId } = req.params;

  // Validate bookId
  if (!bookId || isNaN(bookId)) {
    console.log('❌ Invalid book ID:', bookId);
    return res.status(400).json({
      success: false,
      error: 'Invalid book ID'
    });
  }

  // Basic validation for required fields if they are provided
  const { Title, ISBN } = req.body;
  if (Title !== undefined && (!Title || Title.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: 'Title cannot be empty'
    });
  }
  if (ISBN !== undefined && (!ISBN || ISBN.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: 'ISBN cannot be empty'
    });
  }

  console.log(`📝 Updating book ID ${bookId} with data:`, req.body);

  try {
    // Check if book exists
    const checkQuery = 'SELECT * FROM books WHERE BookID = ?';
    const [existingBooks] = await db.execute(checkQuery, [bookId]);

    if (existingBooks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const currentBook = existingBooks[0];

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const values = [];

    // Extract all possible fields from request body
    const {
      Title, Author, ISBN, Category, Subject, PublishedYear, CopyrightYear,
      Publisher, CallNumber, DeweyDecimal, Copies, Remarks, Status,
      ShelfLocation, AcquisitionDate
    } = req.body;

    // Only update fields that are provided in the request
    if (Title !== undefined) {
      updateFields.push('Title = ?');
      values.push(Title);
    }
    if (Author !== undefined) {
      updateFields.push('Author = ?');
      values.push(Author || null);
    }
    if (ISBN !== undefined) {
      updateFields.push('ISBN = ?');
      values.push(ISBN);
    }
    if (Category !== undefined) {
      updateFields.push('Category = ?');
      values.push(Category || null);
    }
    if (Subject !== undefined) {
      updateFields.push('Subject = ?');
      values.push(Subject || null);
    }
    if (PublishedYear !== undefined) {
      updateFields.push('PublishedYear = ?');
      values.push(PublishedYear || null);
    }
    if (CopyrightYear !== undefined) {
      updateFields.push('CopyrightYear = ?');
      values.push(CopyrightYear || null);
    }
    if (Publisher !== undefined) {
      updateFields.push('Publisher = ?');
      values.push(Publisher || null);
    }
    if (CallNumber !== undefined) {
      updateFields.push('CallNumber = ?');
      values.push(CallNumber || null);
    }
    if (DeweyDecimal !== undefined) {
      updateFields.push('DeweyDecimal = ?');
      values.push(DeweyDecimal || null);
    }
    if (Copies !== undefined) {
      updateFields.push('Copies = ?');
      values.push(Copies || 1);
    }
    if (Remarks !== undefined) {
      updateFields.push('Remarks = ?');
      values.push(Remarks || null);
      console.log(`📝 Updating Remarks: "${currentBook.Remarks}" → "${Remarks}"`);
    }
    if (Status !== undefined) {
      updateFields.push('Status = ?');
      values.push(Status || 'Available');
    }
    if (ShelfLocation !== undefined) {
      updateFields.push('ShelfLocation = ?');
      values.push(ShelfLocation || null);
    }
    if (AcquisitionDate !== undefined) {
      // Format AcquisitionDate to MySQL DATE format (YYYY-MM-DD)
      let formattedAcquisitionDate = null;
      if (AcquisitionDate) {
        const date = new Date(AcquisitionDate);
        if (!isNaN(date.getTime())) {
          formattedAcquisitionDate = date.toISOString().split('T')[0];
          console.log(`📅 Formatted AcquisitionDate: ${AcquisitionDate} → ${formattedAcquisitionDate}`);
        } else {
          console.log('⚠️ Invalid AcquisitionDate format, setting to null');
        }
      }
      updateFields.push('AcquisitionDate = ?');
      values.push(formattedAcquisitionDate);
    }

    // Always update the UpdatedAt timestamp
    updateFields.push('UpdatedAt = NOW()');

    // Check if there are fields to update
    if (updateFields.length === 1) { // Only UpdatedAt field
      return res.status(400).json({
        success: false,
        error: 'No fields provided to update'
      });
    }

    // Build the final update query
    const updateQuery = `UPDATE books SET ${updateFields.join(', ')} WHERE BookID = ?`;
    values.push(bookId);

    console.log('📤 Executing update query:', updateQuery);
    console.log('📤 With values:', values);

    const [updateResult] = await db.execute(updateQuery, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found or no changes made'
      });
    }

    // Get updated book
    const selectQuery = `
      SELECT BookID, Title, Author, ISBN, Category, Subject, PublishedYear,
             CopyrightYear, Publisher, CallNumber, DeweyDecimal, Copies,
             Remarks, Status, ShelfLocation, AcquisitionDate, CreatedAt, UpdatedAt
      FROM books WHERE BookID = ?
    `;

    const [books] = await db.execute(selectQuery, [bookId]);
    const updatedBook = books[0];

    console.log(`✅ Book ID ${bookId} updated successfully`);

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('❌ Error updating book:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'A book with this ISBN already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update book'
    });
  }
}));

// DELETE /delete-book/:bookId - Delete a book
router.delete('/delete-book/:bookId', asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  // Validate bookId
  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid book ID'
    });
  }

  console.log(`🗑️ Deleting book ID ${bookId}`);

  try {
    // Check if book exists
    const checkQuery = 'SELECT BookID, Title FROM books WHERE BookID = ?';
    const [existingBooks] = await db.execute(checkQuery, [bookId]);

    if (existingBooks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    const bookTitle = existingBooks[0].Title;

    // Delete book
    const deleteQuery = 'DELETE FROM books WHERE BookID = ?';
    const [deleteResult] = await db.execute(deleteQuery, [bookId]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    console.log(`✅ Book "${bookTitle}" (ID: ${bookId}) deleted successfully`);

    res.json({
      success: true,
      message: `Book "${bookTitle}" deleted successfully`,
      data: { deletedBookId: bookId }
    });

  } catch (error) {
    console.error('❌ Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book'
    });
  }
}));

module.exports = router;

/*

BOOKS MANAGEMENT API ENDPOINTS - API v1

GET /get-all-books
http://localhost:3000/api/v1/books/get-all-books
Description: Retrieve all books from the library database
Response: Array of all books with complete details

GET /get-book/:bookId
http://localhost:3000/api/v1/books/get-book/1
Description: Get details of a specific book by its ID
Response: Single book object with all fields

POST /add-book
http://localhost:3000/api/v1/books/add-book
Description: Add a new book to the library database
Required Fields: Title, ISBN
{
  "Title": "The Great Gatsby",
  "Author": "F. Scott Fitzgerald",
  "ISBN": "978-0-7432-7356-5",
  "Category": "Fiction",
  "Subject": "American Literature",
  "PublishedYear": 1925,
  "CopyrightYear": 1925,
  "Publisher": "Scribner",
  "CallNumber": "PS3511.I9 G7",
  "DeweyDecimal": "813.52",
  "Copies": 5,
  "Remarks": "Classic American novel",
  "Status": "Available",
  "ShelfLocation": "A-1-001",
  "AcquisitionDate": "2024-01-15"
}

PUT /update-book/:bookId
http://localhost:3000/api/v1/books/update-book/1
Description: Update an existing book's information
Required Fields: Title, ISBN
{
  "Title": "The Great Gatsby - Updated Edition",
  "Author": "F. Scott Fitzgerald",
  "ISBN": "978-0-7432-7356-5",
  "Category": "Fiction",
  "Subject": "American Literature",
  "PublishedYear": 1925,
  "CopyrightYear": 2024,
  "Publisher": "Scribner",
  "CallNumber": "PS3511.I9 G7",
  "DeweyDecimal": "813.52",
  "Copies": 3,
  "Remarks": "Updated classic edition",
  "Status": "Available",
  "ShelfLocation": "A-1-001",
  "AcquisitionDate": "2024-01-15"
}

DELETE /delete-book/:bookId
http://localhost:3000/api/v1/books/delete-book/1
Description: Remove a book from the library database
Response: Confirmation of deletion with deleted book details

BOOK STATUS OPTIONS:
- Available: Book is available for borrowing
- Borrowed: Book is currently checked out
- Lost: Book has been reported lost
- Damaged: Book is damaged and needs repair

BOOK CATEGORIES (Examples):
- Fiction
- Non-Fiction
- Science
- History
- Biography
- Technology
- Arts
- Philosophy
- Religion
- Others
- Miscellaneous

VALIDATION RULES:
- Title: Required, max 255 characters
- ISBN: Required, max 50 characters, must be unique
- Author: Optional, max 255 characters
- Category: Optional, max 100 characters
- Subject: Optional, max 100 characters
- PublishedYear: Optional, must be between 1000-2030
- Publisher: Optional, max 255 characters
- Copies: Optional, minimum 1, defaults to 1
- Status: Optional, must be one of: Available, Borrowed, Lost, Damaged

EXAMPLE API USAGE:

// Get all books
fetch('http://localhost:3000/api/v1/books/get-all-books')
  .then(response => response.json())
  .then(data => console.log(data));

// Add a new book
fetch('http://localhost:3000/api/v1/books/add-book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "Title": "To Kill a Mockingbird",
    "Author": "Harper Lee",
    "ISBN": "978-0-06-112008-4",
    "Category": "Fiction",
    "Status": "Available"
  })
});

// Update a book
fetch('http://localhost:3000/api/v1/books/update-book/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "Title": "To Kill a Mockingbird - Anniversary Edition",
    "Copies": 10
  })
});

// Delete a book
fetch('http://localhost:3000/api/v1/books/delete-book/1', {
  method: 'DELETE'
});

*/

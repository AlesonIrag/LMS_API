const mysql = require('mysql2/promise');
require('dotenv').config();

async function testBooksDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'lms2026'
    });

    console.log('✅ Connected to MySQL database');

    // Check if books table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'books'");
    
    if (tables.length === 0) {
      console.log('❌ Books table does not exist. Creating it...');
      
      // Create books table
      const createTableQuery = `
        CREATE TABLE books (
          BookID int(11) NOT NULL AUTO_INCREMENT,
          Title varchar(255) NOT NULL,
          Author varchar(255) DEFAULT NULL,
          ISBN varchar(50) DEFAULT NULL,
          Category varchar(100) DEFAULT NULL,
          Subject varchar(100) DEFAULT NULL,
          PublishedYear int(11) DEFAULT NULL,
          CopyrightYear int(11) DEFAULT NULL,
          Publisher varchar(255) DEFAULT NULL,
          CallNumber varchar(50) DEFAULT NULL,
          DeweyDecimal varchar(50) DEFAULT NULL,
          Copies int(11) DEFAULT 1,
          Remarks text DEFAULT NULL,
          Status enum('Available','Borrowed','Lost','Damaged') DEFAULT 'Available',
          ShelfLocation varchar(100) DEFAULT NULL,
          AcquisitionDate date DEFAULT NULL,
          CreatedAt timestamp NULL DEFAULT current_timestamp(),
          UpdatedAt timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (BookID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
      `;
      
      await connection.execute(createTableQuery);
      console.log('✅ Books table created successfully');
    } else {
      console.log('✅ Books table exists');
    }

    // Check table structure
    const [columns] = await connection.execute("DESCRIBE books");
    console.log('📋 Books table structure:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
    });

    // Check if there are any books
    const [books] = await connection.execute("SELECT COUNT(*) as count FROM books");
    console.log(`📚 Total books in database: ${books[0].count}`);

    // Test inserting a sample book
    console.log('🧪 Testing book insertion...');
    const testBook = {
      Title: 'Test Book - Database Connection Test',
      Author: 'Test Author',
      ISBN: 'TEST-123-456',
      Category: 'Test',
      Subject: 'Database Testing',
      PublishedYear: 2024,
      Publisher: 'Test Publisher',
      Copies: 1,
      Status: 'Available'
    };

    const insertQuery = `
      INSERT INTO books (Title, Author, ISBN, Category, Subject, PublishedYear, Publisher, Copies, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      testBook.Title,
      testBook.Author,
      testBook.ISBN,
      testBook.Category,
      testBook.Subject,
      testBook.PublishedYear,
      testBook.Publisher,
      testBook.Copies,
      testBook.Status
    ]);

    console.log(`✅ Test book inserted successfully with ID: ${result.insertId}`);

    // Clean up test book
    await connection.execute("DELETE FROM books WHERE ISBN = 'TEST-123-456'");
    console.log('🧹 Test book cleaned up');

    console.log('🎉 Database test completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Connection details:');
    console.error(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   User: ${process.env.DB_USER || 'root'}`);
    console.error(`   Database: ${process.env.DB_NAME || 'lms2026'}`);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testBooksDatabase();

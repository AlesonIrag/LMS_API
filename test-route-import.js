// Test importing the books route to see if there's an import error
console.log('Testing books route import...');

try {
  console.log('1. Testing database import...');
  const db = require('./config/database');
  console.log('✅ Database import successful');

  console.log('2. Testing express import...');
  const express = require('express');
  console.log('✅ Express import successful');

  console.log('3. Testing books route import...');
  const booksRoutes = require('./routes/books-working-final');
  console.log('✅ Books route import successful');

  console.log('4. Testing route creation...');
  const app = express();
  app.use('/api/v1/books', booksRoutes);
  console.log('✅ Route mounting successful');

  console.log('🎉 All imports and setup successful!');

} catch (error) {
  console.error('❌ Error during import/setup:', error);
  console.error('Stack trace:', error.stack);
}

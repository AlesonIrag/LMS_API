console.log('Testing imports from backend-api directory...');

try {
  console.log('1. Testing express...');
  const express = require('express');
  console.log('✅ Express imported successfully');

  console.log('2. Testing database...');
  const db = require('./config/database');
  console.log('✅ Database imported successfully');

  console.log('3. Testing express-validator...');
  const { body, validationResult } = require('express-validator');
  console.log('✅ Express-validator imported successfully');

  console.log('4. Testing errorHandler...');
  const { asyncHandler } = require('./middleware/errorHandler');
  console.log('✅ ErrorHandler imported successfully');

  console.log('5. Testing books route import...');
  const booksRoutes = require('./routes/books');
  console.log('✅ Books route imported successfully');

  console.log('🎉 All imports successful!');

} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
}

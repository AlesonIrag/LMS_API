// Test just the books route in isolation
console.log('Testing books route in isolation...');

const express = require('express');
const app = express();

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

try {
  console.log('1. Loading books route...');
  const booksRoutes = require('./routes/books-simple');
  console.log('✅ Books route loaded successfully');

  console.log('2. Mounting books route...');
  app.use('/api/v1/books', booksRoutes);
  console.log('✅ Books route mounted successfully');

  console.log('3. Starting test server...');
  const server = app.listen(3001, () => {
    console.log('✅ Test server running on port 3001');
    
    // Test the POST route
    setTimeout(async () => {
      try {
        console.log('4. Testing POST route...');
        const response = await fetch('http://localhost:3001/api/v1/books/add-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Title: 'Test Book',
            ISBN: '123-456-789'
          })
        });
        
        console.log('Response status:', response.status);
        const result = await response.text();
        console.log('Response:', result);
        
        server.close();
        process.exit(0);
      } catch (error) {
        console.error('❌ Test failed:', error);
        server.close();
        process.exit(1);
      }
    }, 1000);
  });

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

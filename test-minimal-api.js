// Minimal test to check what's causing the crash
console.log('Testing minimal API call...');

// Using built-in fetch in Node.js 18+

async function testMinimal() {
  try {
    console.log('Making request to localhost:3000...');
    const response = await fetch('http://localhost:3000/');
    const text = await response.text();
    console.log('✅ Basic server response:', text);
    
    console.log('Making request to books API...');
    const booksResponse = await fetch('http://localhost:3000/api/v1/books/get-all-books');
    console.log('Response status:', booksResponse.status);
    
    if (booksResponse.ok) {
      const data = await booksResponse.json();
      console.log('✅ Books API response:', data);
    } else {
      console.log('❌ Books API failed with status:', booksResponse.status);
      const errorText = await booksResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Wait a bit for server to start, then test
setTimeout(testMinimal, 2000);

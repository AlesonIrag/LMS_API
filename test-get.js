// Test GET route
console.log('Testing GET route...');

async function testGet() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/books/test');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GET Success:', data);
    } else {
      const error = await response.text();
      console.log('❌ GET Failed:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

setTimeout(testGet, 3000);

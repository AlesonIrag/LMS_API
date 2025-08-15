// Test simple POST
console.log('Testing simple POST...');

async function testPost() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/books/add-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Title: "Test Book",
        ISBN: "123-456-789"
      })
    });
    
    console.log('POST Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ POST Success:', data);
    } else {
      const error = await response.text();
      console.log('❌ POST Failed:', error);
    }
  } catch (error) {
    console.error('❌ POST Request failed:', error.message);
  }
}

setTimeout(testPost, 2000);

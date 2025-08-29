// Simple POST test
console.log('Testing simple POST...');

async function testPost() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/books/add-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Title: 'Simple Test Book',
        ISBN: '999-999-999'
      })
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

setTimeout(testPost, 1000);

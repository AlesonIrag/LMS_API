const axios = require('axios');

async function testUpdateBook() {
  try {
    console.log('🧪 Testing book update endpoint...');
    
    const bookData = {
      Title: 'Test Update Book v2',
      Author: 'Test Author Updated',
      ISBN: '123456789',
      Category: 'Fiction',
      Subject: 'Test Subject',
      PublishedYear: 2023,
      Publisher: 'Test Publisher',
      Copies: 2,
      Status: 'Available'
    };

    console.log('📤 Sending PUT request to update book ID 3...');
    console.log('📋 Data:', JSON.stringify(bookData, null, 2));

    const response = await axios.put(
      'http://localhost:3000/api/v1/books/update-book/3',
      bookData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testUpdateBook();

// Test POST functionality for adding new books
console.log('🧪 Testing POST /add-book functionality...');

async function testAddBook() {
  try {
    console.log('📚 Testing book addition...');
    
    const bookData = {
      Title: "Test Book - " + new Date().toISOString(),
      Author: "Test Author",
      ISBN: "978-0-123-45678-" + Math.floor(Math.random() * 10),
      Category: "Fiction",
      Subject: "Literature",
      PublishedYear: 2024,
      CopyrightYear: 2024,
      Publisher: "Test Publisher",
      CallNumber: "TEST123",
      DeweyDecimal: "813.6",
      Copies: 1,
      Remarks: "Test book for API testing",
      Status: "Available",
      ShelfLocation: "A1-B2",
      AcquisitionDate: "2024-01-15"
    };

    console.log('📋 Book data to send:', bookData);

    const response = await fetch('http://localhost:3000/api/v1/books/add-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookData)
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Book added successfully!');
      console.log('📖 New book data:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to add book');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Wait a bit for server to be ready, then test
setTimeout(testAddBook, 2000);

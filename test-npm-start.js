// Test posting with npm start server
console.log('📚 Testing POST with npm start server...');

async function testNpmStart() {
  try {
    const bookData = {
      "Title": "Linear Algebra 3rd Edition",
      "Author": "Johnson, Mary K.",
      "ISBN": "978-1-23-456789-0",
      "Category": "Non-fiction",
      "Subject": "Mathematics",
      "PublishedYear": 2022,
      "CopyrightYear": 2022,
      "Publisher": "University Press",
      "CallNumber": "QA184 .J64 2022",
      "DeweyDecimal": "512.5",
      "Copies": 3,
      "Remarks": "Latest edition for linear algebra course",
      "Status": "Available",
      "ShelfLocation": "C-1-020",
      "AcquisitionDate": "2024-03-01"
    };

    console.log('📋 Posting book:', bookData.Title);

    const response = await fetch('http://localhost:3000/api/v1/books/add-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookData)
    });

    console.log('📡 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Book posted with npm start!');
      console.log('📖 New book ID:', result.bookId);
      console.log('📖 Book title:', result.data.Title);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to post book');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

setTimeout(testNpmStart, 3000);

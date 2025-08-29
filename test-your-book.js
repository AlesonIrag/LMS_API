// Test posting your specific book data
console.log('📚 Testing your book data...');

async function testYourBook() {
  try {
    const bookData = {
      "Title": "Elementary Number Theory 4th edition",
      "Author": "Burton, David M.",
      "ISBN": "0-07-009-466-7",
      "Category": "Non-fiction",
      "Subject": "Number theory",
      "PublishedYear": 1998,
      "CopyrightYear": 1997,
      "Publisher": "McGraw-Hill",
      "CallNumber": "QA241 .B83 1998",
      "DeweyDecimal": "512.7",
      "Copies": 1,
      "Remarks": "Donated by Engr. Nimfa O. Rodriguez",
      "Status": "Available",
      "ShelfLocation": "A-1-001",
      "AcquisitionDate": "2024-01-15"
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
      console.log('✅ SUCCESS! Book added successfully!');
      console.log('📖 New book ID:', result.bookId);
      console.log('📖 Book data:', result.data);
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
setTimeout(testYourBook, 2000);

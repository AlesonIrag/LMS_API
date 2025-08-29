// Test posting a new book with different ISBN
console.log('📚 Testing new book data...');

async function testNewBook() {
  try {
    const bookData = {
      "Title": "Advanced Calculus 5th Edition",
      "Author": "Smith, John A.",
      "ISBN": "978-0-12-345-678-9",
      "Category": "Non-fiction",
      "Subject": "Mathematics",
      "PublishedYear": 2023,
      "CopyrightYear": 2023,
      "Publisher": "Academic Press",
      "CallNumber": "QA303 .S65 2023",
      "DeweyDecimal": "515",
      "Copies": 2,
      "Remarks": "New acquisition for mathematics department",
      "Status": "Available",
      "ShelfLocation": "B-2-015",
      "AcquisitionDate": "2024-02-01"
    };

    console.log('📋 Posting new book:', bookData.Title);

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
      console.log('✅ SUCCESS! New book added successfully!');
      console.log('📖 New book ID:', result.bookId);
      console.log('📖 Book title:', result.data.Title);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to add book');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

setTimeout(testNewBook, 2000);

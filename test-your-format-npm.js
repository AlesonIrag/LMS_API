// Test your exact book format with npm start
console.log('📚 Testing YOUR book format with npm start...');

async function testYourFormat() {
  try {
    // Your exact format with a different ISBN to avoid duplicate
    const bookData = {
      "Title": "Advanced Number Theory 5th edition",
      "Author": "Burton, David M.",
      "ISBN": "0-07-009-999-9",
      "Category": "Non-fiction",
      "Subject": "Number theory",
      "PublishedYear": 2024,
      "CopyrightYear": 2023,
      "Publisher": "McGraw-Hill",
      "CallNumber": "QA241 .B83 2024",
      "DeweyDecimal": "512.7",
      "Copies": 1,
      "Remarks": "Donated by Engr. Nimfa O. Rodriguez",
      "Status": "Available",
      "ShelfLocation": "A-1-002",
      "AcquisitionDate": "2024-01-15"
    };

    console.log('📋 Posting YOUR book format:', bookData.Title);

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
      console.log('🎉 SUCCESS! YOUR FORMAT WORKS WITH npm start!');
      console.log('📖 New book ID:', result.bookId);
      console.log('📖 Book title:', result.data.Title);
      console.log('📖 Author:', result.data.Author);
      console.log('📖 ISBN:', result.data.ISBN);
      console.log('📖 Remarks:', result.data.Remarks);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to post book');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

setTimeout(testYourFormat, 2000);

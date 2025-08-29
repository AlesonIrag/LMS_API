const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1/adminauth';

async function addAdmin(adminData) {
  try {
    console.log('📝 Creating admin...');
    console.log('Data:', JSON.stringify(adminData, null, 2));

    const response = await axios.post(`${BASE_URL}/register-admin`, adminData);
    
    console.log('✅ Admin created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('❌ Failed to create admin:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('❌ Error:', error.message);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Admin Creation Tool\n');

  // Example admin data - modify as needed
  const newAdmin = {
    fullName: "Data Center Manager",
    email: "datacenter@library.com", 
    password: "DataCenter123",
    role: "Data Center Admin",
    status: "Active"
  };

  // You can also create different types of admins:
  const librarian = {
    fullName: "Head Librarian",
    email: "headlibrarian@library.com",
    password: "Librarian123", 
    role: "Librarian",
    status: "Active"
  };

  const staff = {
    fullName: "Library Staff Member",
    email: "staff@library.com",
    password: "Staff123",
    role: "Librarian Staff", 
    status: "Active"
  };

  // Create the admins
  console.log('1️⃣ Creating Data Center Admin...');
  await addAdmin(newAdmin);

  console.log('\n2️⃣ Creating Librarian...');
  await addAdmin(librarian);

  console.log('\n3️⃣ Creating Library Staff...');
  await addAdmin(staff);

  console.log('\n🎉 Admin creation completed!');
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get('http://localhost:3000/');
    return true;
  } catch (error) {
    console.error('❌ Server not running. Start with: npm start');
    return false;
  }
}

// Run the script
checkServer().then(running => {
  if (running) {
    main();
  }
});

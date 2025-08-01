const axios = require('axios');

async function testSingleAdmin() {
  console.log('🧪 Testing Single Admin Registration...\n');

  try {
    // Test admin registration
    const testAdmin = {
      fullName: 'Nathaniel Inocando',
      email: 'nathanielinocando@aol.com',
      password: 'HelloNathan123',
      role: 'Super Admin',
      status: 'Active'
    };

    console.log('📝 Registering admin...');
    const response = await axios.post('http://localhost:3000/api/v1/adminauth/register-admin', testAdmin);
    
    console.log('✅ Admin registered successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    const adminId = response.data.data.adminID;

    // Test login
    console.log('\n🔐 Testing login...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/adminauth/login-admin', {
      email: testAdmin.email,
      password: testAdmin.password
    });

    console.log('✅ Login successful!');
    console.log('Login Response:', JSON.stringify(loginResponse.data, null, 2));

    // Test get admin
    console.log('\n👤 Testing get admin...');
    const getResponse = await axios.get(`http://localhost:3000/api/v1/adminauth/get-admin/${adminId}`);
    
    console.log('✅ Get admin successful!');
    console.log('Get Response:', JSON.stringify(getResponse.data, null, 2));

    console.log('\n🎉 All tests passed! Admin authentication system is working correctly.');

  } catch (error) {
    if (error.response) {
      console.error('❌ Test failed with response:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Check server first
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3000/');
    console.log('✅ Server is running:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm start');
    return false;
  }
}

async function main() {
  console.log('🚀 Simple Admin Test\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testSingleAdmin();
  }
}

main();

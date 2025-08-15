const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/adminauth';

// Test data
const testAdmin = {
  fullName: 'Test Super Admin',
  email: 'superadmin@library.com',
  password: 'SuperAdmin123',
  role: 'Super Admin',
  status: 'Active'
};

const testLibrarian = {
  fullName: 'Test Librarian',
  email: 'librarian@library.com',
  password: 'Librarian123',
  role: 'Librarian',
  status: 'Active'
};

async function testAdminAuth() {
  console.log('🧪 Testing Admin Authentication System...\n');

  try {
    // Test 1: Register Super Admin
    console.log('1️⃣ Testing Admin Registration...');
    const registerResponse = await axios.post(`${BASE_URL}/register-admin`, testAdmin);
    console.log('✅ Super Admin registered:', registerResponse.data);
    const superAdminId = registerResponse.data.data.adminID;

    // Test 2: Register Librarian
    const librarianResponse = await axios.post(`${BASE_URL}/register-admin`, testLibrarian);
    console.log('✅ Librarian registered:', librarianResponse.data);
    const librarianId = librarianResponse.data.data.adminID;

    // Test 3: Login Admin
    console.log('\n2️⃣ Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/login-admin`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    console.log('✅ Admin login successful:', loginResponse.data);

    // Test 4: Get Admin by ID
    console.log('\n3️⃣ Testing Get Admin by ID...');
    const getAdminResponse = await axios.get(`${BASE_URL}/get-admin/${superAdminId}`);
    console.log('✅ Admin retrieved:', getAdminResponse.data);

    // Test 5: Get All Admins
    console.log('\n4️⃣ Testing Get All Admins...');
    const getAllResponse = await axios.get(`${BASE_URL}/get-all-admins`);
    console.log('✅ All admins retrieved:', getAllResponse.data);

    // Test 6: Get Admins by Role
    console.log('\n5️⃣ Testing Get Admins by Role...');
    const getByRoleResponse = await axios.get(`${BASE_URL}/get-admins-by-role/Super Admin`);
    console.log('✅ Super Admins retrieved:', getByRoleResponse.data);

    // Test 7: Update Admin
    console.log('\n6️⃣ Testing Update Admin...');
    const updateResponse = await axios.put(`${BASE_URL}/update-admin/${librarianId}`, {
      fullName: 'Updated Librarian Name',
      role: 'Data Center Admin'
    });
    console.log('✅ Admin updated:', updateResponse.data);

    // Test 8: Change Password
    console.log('\n7️⃣ Testing Change Password...');
    const changePasswordResponse = await axios.post(`${BASE_URL}/change-admin-password/${superAdminId}`, {
      currentPassword: testAdmin.password,
      newPassword: 'NewSuperAdmin123'
    });
    console.log('✅ Password changed:', changePasswordResponse.data);

    // Test 9: Get Audit Logs
    console.log('\n8️⃣ Testing Get Audit Logs...');
    const auditLogsResponse = await axios.get(`${BASE_URL}/admin-audit-logs`);
    console.log('✅ Audit logs retrieved:', auditLogsResponse.data);

    // Test 10: Get Audit Logs for specific admin
    console.log('\n9️⃣ Testing Get Audit Logs for Specific Admin...');
    const specificAuditResponse = await axios.get(`${BASE_URL}/admin-audit-logs/${superAdminId}`);
    console.log('✅ Specific admin audit logs:', specificAuditResponse.data);

    // Test 11: Delete Admin (should fail for last Super Admin)
    console.log('\n🔟 Testing Delete Admin Protection...');
    try {
      await axios.delete(`${BASE_URL}/delete-admin/${superAdminId}`);
    } catch (error) {
      console.log('✅ Super Admin deletion protection working:', error.response.data);
    }

    // Test 12: Delete Librarian (should work)
    console.log('\n1️⃣1️⃣ Testing Delete Admin...');
    const deleteResponse = await axios.delete(`${BASE_URL}/delete-admin/${librarianId}`);
    console.log('✅ Admin deleted:', deleteResponse.data);

    console.log('\n🎉 All admin authentication tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test invalid scenarios
async function testInvalidScenarios() {
  console.log('\n🧪 Testing Invalid Scenarios...\n');

  try {
    // Test invalid login
    console.log('1️⃣ Testing Invalid Login...');
    try {
      await axios.post(`${BASE_URL}/login-admin`, {
        email: 'invalid@email.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid login rejected:', error.response.data);
    }

    // Test invalid role
    console.log('\n2️⃣ Testing Invalid Role...');
    try {
      await axios.post(`${BASE_URL}/register-admin`, {
        fullName: 'Invalid Role Admin',
        email: 'invalid@library.com',
        password: 'Password123',
        role: 'Invalid Role'
      });
    } catch (error) {
      console.log('✅ Invalid role rejected:', error.response.data);
    }

    // Test weak password
    console.log('\n3️⃣ Testing Weak Password...');
    try {
      await axios.post(`${BASE_URL}/register-admin`, {
        fullName: 'Weak Password Admin',
        email: 'weak@library.com',
        password: 'weak'
      });
    } catch (error) {
      console.log('✅ Weak password rejected:', error.response.data);
    }

    console.log('\n🎉 Invalid scenario tests completed!');

  } catch (error) {
    console.error('❌ Invalid scenario test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runAllTests() {
  await testAdminAuth();
  await testInvalidScenarios();
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3000/');
    console.log('✅ Server is running:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Admin Authentication Test Suite\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
}

main();

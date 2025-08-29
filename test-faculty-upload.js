const db = require('./config/database');

async function testFacultyUpload() {
  try {
    console.log('🧪 Testing faculty profile photo upload process...\n');

    // Check if faculty exists
    const [faculty] = await db.execute('SELECT FacultyID, FirstName, LastName, ProfilePhoto FROM faculty WHERE FacultyID = ?', ['2022-99999']);
    
    if (faculty.length === 0) {
      console.log('❌ Faculty 2022-99999 not found');
      return;
    }

    console.log('👤 Faculty found:', faculty[0]);
    console.log('📸 Current ProfilePhoto:', faculty[0].ProfilePhoto || 'NULL');

    // Simulate uploading a profile photo
    const testImageUrl = '/api/v1/uploads/profile-photos/faculty_2022-99999_1234567890.jpg';
    
    console.log('\n🔄 Simulating profile photo upload...');
    console.log('📤 Test image URL:', testImageUrl);

    // Update faculty record with test image URL
    const updateQuery = `UPDATE faculty SET ProfilePhoto = ? WHERE FacultyID = ?`;
    await db.execute(updateQuery, [testImageUrl, '2022-99999']);

    console.log('✅ Database update completed');

    // Verify the update
    const [updatedFaculty] = await db.execute('SELECT FacultyID, FirstName, LastName, ProfilePhoto FROM faculty WHERE FacultyID = ?', ['2022-99999']);
    
    console.log('\n🔍 Verification:');
    console.log('👤 Updated faculty:', updatedFaculty[0]);
    console.log('📸 New ProfilePhoto:', updatedFaculty[0].ProfilePhoto);

    if (updatedFaculty[0].ProfilePhoto === testImageUrl) {
      console.log('✅ Profile photo URL saved successfully!');
    } else {
      console.log('❌ Profile photo URL not saved correctly');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing faculty upload:', error.message);
    process.exit(1);
  }
}

testFacultyUpload();

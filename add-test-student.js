const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('🔍 Adding test student for authentication testing...');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'dblibrary'
});

async function addTestStudent() {
  try {
    // Test student data
    const studentData = {
      studentID: '2024-00001',
      fullName: 'Test Student',
      course: 'BSIT',
      yearLevel: 3,
      section: 'A',
      email: 'test.student@benedicto.edu.ph',
      phoneNumber: '09123456789',
      password: 'password123' // Simple password for testing
    };

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(studentData.password, 10);

    console.log('📝 Student data to insert:');
    console.log(`   Student ID: ${studentData.studentID}`);
    console.log(`   Name: ${studentData.fullName}`);
    console.log(`   Course: ${studentData.course} Year ${studentData.yearLevel} Section ${studentData.section}`);
    console.log(`   Email: ${studentData.email}`);
    console.log(`   Password: ${studentData.password} (for testing)`);
    console.log('');

    // Check if student already exists
    const checkQuery = 'SELECT StudentID FROM Students WHERE StudentID = ?';
    db.query(checkQuery, [studentData.studentID], (err, results) => {
      if (err) {
        console.error('❌ Error checking existing student:', err.message);
        db.end();
        return;
      }

      if (results.length > 0) {
        console.log('⚠️  Test student already exists. Updating password...');
        
        const updateQuery = 'UPDATE Students SET Password = ? WHERE StudentID = ?';
        db.query(updateQuery, [hashedPassword, studentData.studentID], (err, result) => {
          if (err) {
            console.error('❌ Error updating student:', err.message);
          } else {
            console.log('✅ Test student password updated successfully!');
            console.log('');
            console.log('🧪 Test credentials:');
            console.log(`   Student ID: ${studentData.studentID}`);
            console.log(`   Password: ${studentData.password}`);
          }
          db.end();
        });
      } else {
        console.log('➕ Adding new test student...');
        
        const insertQuery = `
          INSERT INTO Students (
            StudentID, FullName, Course, YearLevel, Section,
            Email, PhoneNumber, Password,
            EnrollmentStatus, AccountStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Allowed')
        `;

        db.query(insertQuery, [
          studentData.studentID,
          studentData.fullName,
          studentData.course,
          studentData.yearLevel,
          studentData.section,
          studentData.email,
          studentData.phoneNumber,
          hashedPassword
        ], (err, result) => {
          if (err) {
            console.error('❌ Error inserting student:', err.message);
          } else {
            console.log('✅ Test student added successfully!');
            console.log('');
            console.log('🧪 Test credentials:');
            console.log(`   Student ID: ${studentData.studentID}`);
            console.log(`   Password: ${studentData.password}`);
          }
          db.end();
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    db.end();
  }
}

db.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ Database connection successful!');
  addTestStudent();
});

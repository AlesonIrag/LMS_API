const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Checking existing students in database...');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'dblibrary'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ Database connection successful!');
  
  // Check for existing students
  db.query('SELECT StudentID, FullName, Course, YearLevel, Section, Email, EnrollmentStatus, AccountStatus FROM Students LIMIT 10', (err, results) => {
    if (err) {
      console.error('❌ Error querying students:', err.message);
    } else {
      console.log(`📊 Found ${results.length} students in database:`);
      console.log('');
      
      if (results.length === 0) {
        console.log('⚠️  No students found in database');
        console.log('💡 You may need to register a test student first');
      } else {
        results.forEach((student, index) => {
          console.log(`${index + 1}. ${student.StudentID} - ${student.FullName}`);
          console.log(`   Course: ${student.Course} Year ${student.YearLevel} Section ${student.Section}`);
          console.log(`   Email: ${student.Email}`);
          console.log(`   Status: ${student.EnrollmentStatus} / ${student.AccountStatus}`);
          console.log('');
        });
      }
    }
    
    db.end();
    console.log('🎉 Student check completed!');
  });
});

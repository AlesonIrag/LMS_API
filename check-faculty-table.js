const db = require('./config/database');

async function checkFacultyTable() {
  try {
    console.log('🔍 Checking faculty table structure...\n');

    // Check table structure
    const [columns] = await db.execute('DESCRIBE faculty');
    
    console.log('📋 Faculty table columns:');
    columns.forEach(col => {
      console.log(`   ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
    });

    console.log('\n🔍 Checking faculty records...');
    
    // Check faculty records
    const [faculty] = await db.execute('SELECT FacultyID, FirstName, LastName, Email, ProfilePhoto FROM faculty LIMIT 5');
    
    console.log('\n👥 Faculty records:');
    if (faculty.length === 0) {
      console.log('   No faculty found in database');
    } else {
      faculty.forEach(fac => {
        console.log(`   ID: ${fac.FacultyID} | ${fac.FirstName} ${fac.LastName} | ${fac.Email} | Photo: ${fac.ProfilePhoto || 'NULL'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking faculty table:', error.message);
    process.exit(1);
  }
}

checkFacultyTable();

const db = require('./config/database');

async function checkFaculty() {
  try {
    console.log('Checking faculty in database...\n');

    // Check faculty table
    const [faculty] = await db.execute('SELECT FacultyID, FullName, Email, Department, Position, Status, CreatedAt FROM faculty ORDER BY FacultyID');
    
    console.log('Current Faculty:');
    if (faculty.length === 0) {
      console.log('   No faculty found in database');
    } else {
      faculty.forEach(fac => {
        console.log(`   ID: ${fac.FacultyID} | ${fac.FullName} | ${fac.Email} | ${fac.Department} | ${fac.Position} | ${fac.Status}`);
      });
    }

    // Check if facultyauditlogs table exists
    try {
      const [logs] = await db.execute(`
        SELECT 
          fal.LogID,
          fal.FacultyID,
          f.FullName as FacultyName,
          fal.Action,
          fal.Timestamp
        FROM facultyauditlogs fal
        LEFT JOIN faculty f ON fal.FacultyID = f.FacultyID
        ORDER BY fal.Timestamp DESC
        LIMIT 10
      `);

      console.log('\nRecent Faculty Audit Logs:');
      if (logs.length === 0) {
        console.log('   No audit logs found');
      } else {
        logs.forEach(log => {
          console.log(`   ${log.Timestamp} | Faculty: ${log.FacultyName || 'Unknown'} | Action: ${log.Action}`);
        });
      }
    } catch (error) {
      console.log('\nFaculty audit logs table not found!');
      console.log('   Please run the updated dblibrary.sql file to create the facultyauditlogs table.');
      console.log('   Or run this SQL command:');
      console.log(`
CREATE TABLE facultyauditlogs (
  LogID int(11) NOT NULL AUTO_INCREMENT,
  FacultyID int(11) NOT NULL,
  Action varchar(255) DEFAULT NULL,
  AffectedTable varchar(100) DEFAULT NULL,
  AffectedID int(11) DEFAULT NULL,
  Timestamp timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (LogID),
  KEY FacultyID (FacultyID),
  CONSTRAINT facultyauditlogs_ibfk_1 FOREIGN KEY (FacultyID) REFERENCES faculty (FacultyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
      `);
    }

    // Check departments
    const [departments] = await db.execute('SELECT DISTINCT Department FROM faculty WHERE Department IS NOT NULL ORDER BY Department');
    console.log('\nDepartments:');
    if (departments.length === 0) {
      console.log('   No departments found');
    } else {
      departments.forEach(dept => {
        console.log(`   - ${dept.Department}`);
      });
    }

    // Check positions
    const [positions] = await db.execute('SELECT DISTINCT Position FROM faculty WHERE Position IS NOT NULL ORDER BY Position');
    console.log('\nPositions:');
    if (positions.length === 0) {
      console.log('   No positions found');
    } else {
      positions.forEach(pos => {
        console.log(`   - ${pos.Position}`);
      });
    }

    console.log('\nDatabase check completed!');

  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    process.exit(0);
  }
}

checkFaculty();
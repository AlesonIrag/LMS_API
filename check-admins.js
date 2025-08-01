const db = require('./config/database');

async function checkAdmins() {
  try {
    console.log('Checking admins in database...\n');

    // Check admins table
    const [admins] = await db.execute('SELECT AdminID, FullName, Email, Role, Status, CreatedAt FROM admins ORDER BY AdminID');
    
    console.log('Current Admins:');
    if (admins.length === 0) {
      console.log('   No admins found in database');
    } else {
      admins.forEach(admin => {
        console.log(`   ID: ${admin.AdminID} | ${admin.FullName} | ${admin.Email} | ${admin.Role} | ${admin.Status}`);
      });
    }

    // Check audit logs
    const [logs] = await db.execute(`
      SELECT 
        aal.LogID,
        aal.AdminID,
        a.FullName as AdminName,
        aal.Action,
        aal.Timestamp
      FROM adminauditlogs aal
      LEFT JOIN admins a ON aal.AdminID = a.AdminID
      ORDER BY aal.Timestamp DESC
      LIMIT 10
    `);

    console.log('\nRecent Admin Audit Logs:');
    if (logs.length === 0) {
      console.log('   No audit logs found');
    } else {
      logs.forEach(log => {
        console.log(`   ${log.Timestamp} | Admin: ${log.AdminName || 'Unknown'} | Action: ${log.Action}`);
      });
    }

    console.log('\nDatabase check completed!');

  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAdmins();
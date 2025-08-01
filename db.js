const mysql = require('mysql2');
require('dotenv').config();



const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'dblibrary'
});





db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err.message);
    console.error(' Connection details:');
    console.error(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   User: ${process.env.DB_USER || 'root'}`);
    console.error(`   Database: ${process.env.DB_NAME || 'dblibrary'}`);
    console.error(' Please check your database credentials and ensure MySQL is running');
    return;
  }

  console.log('MySQL Connected successfully');


});






db.on('error', (err) => {
  console.error(' Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
  }
});

module.exports = db;
  
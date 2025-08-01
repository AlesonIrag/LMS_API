const mysql = require('mysql2/promise');
      require('dotenv').config();
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
database: process.env.DB_NAME || 'dblibrary',
    waitForConnections: true,
  connectionLimit: 10,
      queueLimit: 0,
authPlugins: {
    mysql_native_password: () => () => Buffer.alloc(0)
  }
      });
const testConnection = async () => {
    try {
  const connection = await pool.getConnection();
      console.log('MySQL Connected successfully');
connection.release();
    } catch (err) {
  console.error('MySQL connection failed:', err.message);
      console.error('Connection details:');
console.error(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   User: ${process.env.DB_USER || 'root'}`);
  console.error(`   Database: ${process.env.DB_NAME || 'dblibrary'}`);
      console.error('Please check your database credentials and ensure MySQL is running');
}
    };
testConnection();
      pool.on('connection', (connection) => {
console.log('New connection established as id ' + connection.threadId);
    });
  pool.on('error', (err) => {
      console.error('Database pool error:', err);
if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
  }
      });
module.exports = pool;

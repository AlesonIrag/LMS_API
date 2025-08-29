const db = require('../config/database');

async function createPasswordResetTables() {
  try {
    console.log('🔄 Creating password reset tables...');

    // Create OTP storage table
    const createOTPTable = `
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_type ENUM('student', 'faculty', 'admin') NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_type (email, user_type),
        INDEX idx_otp_expires (otp_code, expires_at),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.execute(createOTPTable);
    console.log('✅ password_reset_otps table created successfully');

    // Create password reset tokens table
    const createTokensTable = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_type ENUM('student', 'faculty', 'admin') NOT NULL,
        reset_token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_type (email, user_type),
        INDEX idx_token (reset_token),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.execute(createTokensTable);
    console.log('✅ password_reset_tokens table created successfully');

    // Clean up expired records (older than 24 hours)
    const cleanupOTPs = `
      DELETE FROM password_reset_otps 
      WHERE expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    `;

    const cleanupTokens = `
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    `;

    await db.execute(cleanupOTPs);
    await db.execute(cleanupTokens);
    console.log('✅ Cleaned up expired records');

    console.log('🎉 Password reset tables setup completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating password reset tables:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  createPasswordResetTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createPasswordResetTables };

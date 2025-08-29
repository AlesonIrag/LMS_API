const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('userType')
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid user type')
];

const validateOTP = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('userType')
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid user type'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

const validatePasswordReset = [
  body('resetToken')
    .isLength({ min: 64, max: 64 })
    .isAlphanumeric()
    .withMessage('Invalid reset token'),
  body('newPassword')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters with uppercase, lowercase, and number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Helper function to get user table and ID field based on user type
function getUserTableInfo(userType) {
  switch (userType) {
    case 'student':
      return {
        table: 'Students',
        idField: 'StudentID',
        emailField: 'Email',
        statusField: 'AccountStatus',
        statusValue: 'Allowed'
      };
    case 'faculty':
      return {
        table: 'faculty',
        idField: 'FacultyID',
        emailField: 'Email',
        statusField: 'Status',
        statusValue: 'Active'
      };
    case 'admin':
      return {
        table: 'admins',
        idField: 'AdminID',
        emailField: 'Email',
        statusField: 'Status',
        statusValue: 'Active'
      };
    default:
      throw new Error('Invalid user type');
  }
}

// POST /request-otp - Request OTP for password reset
router.post('/request-otp', validateEmail, asyncHandler(async (req, res) => {
  console.log('🔍 OTP request received:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ OTP request validation failed:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, userType } = req.body;
  console.log('📧 Looking for user:', { email, userType });

  try {
    // Check if user exists in the appropriate table
    const { table, emailField, statusField, statusValue } = getUserTableInfo(userType);
    const checkUserQuery = `SELECT ${emailField} FROM ${table} WHERE ${emailField} = ? AND ${statusField} = ?`;
    console.log('🔍 Executing query:', checkUserQuery);
    console.log('🔍 Query parameters:', [email, statusValue]);
    const [userResults] = await db.execute(checkUserQuery, [email, statusValue]);
    console.log('🔍 Query results:', userResults);

    if (userResults.length === 0) {
      console.log('❌ No user found in table:', table);
      return res.status(404).json({
        success: false,
        message: 'Email not found in our system. Please consider filling out the manual request form for assistance.',
        suggestManualForm: true
      });
    }

    // Generate OTP
    const otp = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);

    // Clean up any existing OTPs for this email and user type
    await db.execute(
      'DELETE FROM password_reset_otps WHERE email = ? AND user_type = ?',
      [email, userType]
    );

    // Store OTP in database
    await db.execute(
      'INSERT INTO password_reset_otps (email, user_type, otp_code, expires_at) VALUES (?, ?, ?, ?)',
      [email, userType, otp, expiresAt]
    );

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(email, otp, userType);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
    });

  } catch (error) {
    console.error('Error in request-otp:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
}));

// POST /verify-otp - Verify OTP and generate reset token
router.post('/verify-otp', validateOTP, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, userType, otp } = req.body;

  try {
    // Find valid OTP
    const [otpResults] = await db.execute(
      'SELECT * FROM password_reset_otps WHERE email = ? AND user_type = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE',
      [email, userType, otp]
    );

    if (otpResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    // Mark OTP as used
    await db.execute(
      'UPDATE password_reset_otps SET is_used = TRUE WHERE id = ?',
      [otpResults[0].id]
    );

    // Generate reset token
    const resetToken = emailService.generateResetToken();
    const tokenExpiresAt = new Date(Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS) || 1) * 60 * 60 * 1000);

    // Clean up any existing tokens for this email and user type
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE email = ? AND user_type = ?',
      [email, userType]
    );

    // Store reset token
    await db.execute(
      'INSERT INTO password_reset_tokens (email, user_type, reset_token, expires_at) VALUES (?, ?, ?, ?)',
      [email, userType, resetToken, tokenExpiresAt]
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken,
      expiresIn: parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS) || 1
    });

  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
}));

// POST /reset-password - Reset password using token
router.post('/reset-password', validatePasswordReset, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Password reset validation failed:', errors.array());
    console.log('📝 Request body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { resetToken, newPassword } = req.body;

  try {
    // Find valid reset token
    const [tokenResults] = await db.execute(
      'SELECT * FROM password_reset_tokens WHERE reset_token = ? AND expires_at > NOW() AND is_used = FALSE',
      [resetToken]
    );

    if (tokenResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please start the process again.'
      });
    }

    const { email, user_type: userType } = tokenResults[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in appropriate table
    const { table } = getUserTableInfo(userType);
    await db.execute(
      `UPDATE ${table} SET Password = ? WHERE Email = ?`,
      [hashedPassword, email]
    );

    // Mark token as used
    await db.execute(
      'UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?',
      [tokenResults[0].id]
    );

    // Send success email
    await emailService.sendPasswordResetSuccessEmail(email, userType);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
}));

// GET /cleanup - Clean up expired records (for maintenance)
router.get('/cleanup', asyncHandler(async (req, res) => {
  try {
    // Clean up expired OTPs
    const [otpCleanup] = await db.execute(
      'DELETE FROM password_reset_otps WHERE expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );

    // Clean up expired tokens
    const [tokenCleanup] = await db.execute(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );

    res.json({
      success: true,
      message: 'Cleanup completed',
      otpsRemoved: otpCleanup.affectedRows,
      tokensRemoved: tokenCleanup.affectedRows
    });

  } catch (error) {
    console.error('Error in cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed'
    });
  }
}));

module.exports = router;

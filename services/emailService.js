const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate secure reset token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create OTP email template
  createOTPEmailTemplate(otp, userType = 'student') {
    const themeColors = {
      student: { primary: '#3B82F6', secondary: '#1E40AF' },
      faculty: { primary: '#059669', secondary: '#047857' },
      admin: { primary: '#DC2626', secondary: '#B91C1C' }
    };

    const colors = themeColors[userType] || themeColors.student;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - Benedicto College Library</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
             Password Reset Request
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            Benedicto College Library Management System
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">
            Your One-Time Password (OTP)
          </h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
            We received a request to reset your password. Please use the following 6-digit code to verify your identity:
          </p>

          <!-- OTP Display -->
          <div style="background-color: #f9fafb; border: 2px dashed ${colors.primary}; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; color: ${colors.primary}; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
            <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px;">
              This code will expire in 10 minutes
            </p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
            </p>
          </div>

          <p style="color: #4b5563; line-height: 1.6; margin: 20px 0 0 0;">
            Best regards,<br>
            <strong>Benedicto College Library Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Create password reset success email template
  createPasswordResetSuccessTemplate(userType = 'student') {
    const themeColors = {
      student: { primary: '#3B82F6', secondary: '#1E40AF' },
      faculty: { primary: '#059669', secondary: '#047857' },
      admin: { primary: '#DC2626', secondary: '#B91C1C' }
    };

    const colors = themeColors[userType] || themeColors.student;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - Benedicto College Library</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
             Password Reset Successful
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            Benedicto College Library Management System
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">
            Your password has been successfully reset!
          </h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
            Your password has been successfully updated. You can now log in to your account using your new password.
          </p>

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 30px 0; border-radius: 4px;">
            <p style="color: #047857; margin: 0; font-size: 14px;">
              <strong>Security Tip:</strong> For your account security, make sure to use a strong password and keep it confidential.
            </p>
          </div>

          <p style="color: #4b5563; line-height: 1.6; margin: 20px 0 0 0;">
            Best regards,<br>
            <strong>Benedicto College Library Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Send OTP email
  async sendOTPEmail(email, otp, userType = 'student') {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      console.log('📧 Sending OTP email to:', email, 'with OTP:', otp, 'for user type:', userType);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Benedicto College Library',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        },
        to: email,
        subject: `Password Reset OTP: ${otp} - Benedicto College Library`,
        html: this.createOTPEmailTemplate(otp, userType),
        text: `Your password reset OTP is: ${otp}. This code will expire in 10 minutes. If you didn't request this, please ignore this email.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset success email
  async sendPasswordResetSuccessEmail(email, userType = 'student') {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      console.log('📧 Sending password reset SUCCESS email to:', email, 'for user type:', userType);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Benedicto College Library',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        },
        to: email,
        subject: 'Password Reset Successful - Benedicto College Library',
        html: this.createPasswordResetSuccessTemplate(userType),
        text: 'Your password has been successfully reset. You can now log in with your new password.'
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset success email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset success email:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email connection
  async testConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      console.log('✅ Email service connection test successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();

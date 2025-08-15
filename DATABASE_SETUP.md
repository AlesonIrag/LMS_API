# Database Setup Guide

## Prerequisites
- MySQL or MariaDB installed and running
- Access to MySQL command line or a GUI tool like phpMyAdmin

## Step 1: Create Database User and Database

Connect to MySQL as root and run these commands:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS dblibrary;

-- Create the user (if it doesn't exist)
CREATE USER IF NOT EXISTS 'lms_user'@'localhost' IDENTIFIED BY 'lms2026';

-- Grant privileges
GRANT ALL PRIVILEGES ON dblibrary.* TO 'lms_user'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE dblibrary;
```

## Step 2: Create Students Table

```sql
CREATE TABLE IF NOT EXISTS Students (
    StudentID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Course VARCHAR(100) DEFAULT 'N/A',
    YearLevel INT DEFAULT 0,
    Section VARCHAR(50) DEFAULT 'N/A',
    Email VARCHAR(255) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(20) DEFAULT 'N/A',
    Password VARCHAR(255) NOT NULL,
    EnrollmentStatus ENUM('Active', 'Inactive') DEFAULT 'Active',
    AccountStatus ENUM('Allowed', 'Blocked') DEFAULT 'Allowed',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Step 3: Create Password Reset Tables

```sql
-- Create OTP storage table
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
);

-- Create password reset tokens table
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
);
```

## Step 4: Verify Setup

```sql
-- Check if tables were created
DESCRIBE Students;
DESCRIBE password_reset_otps;
DESCRIBE password_reset_tokens;

-- Test insert (optional)
INSERT INTO Students (FullName, Email, Password) 
VALUES ('Test Student', 'test@example.com', 'hashedpassword123');

-- Check the data
SELECT * FROM Students;
```

## Alternative: Using Root User

If you prefer to use the root user, update your `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_root_password
DB_NAME=dblibrary
```

## Troubleshooting

### Common Issues:

1. **Access Denied Error**: 
   - Check username and password in `.env` file
   - Ensure the user has proper privileges
   - Try using root user temporarily

2. **Database Not Found**:
   - Create the database using the SQL commands above
   - Check the database name in `.env` file

3. **Connection Refused**:
   - Ensure MySQL/MariaDB service is running
   - Check if the host and port are correct

### Quick Fix Commands:

```bash
# Start MySQL service (Windows)
net start mysql

# Start MySQL service (Linux/Mac)
sudo systemctl start mysql
# or
sudo service mysql start
```

## Testing the API

Once the database is set up, you can test the registration endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/register-student \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "course": "BSIT",
    "yearLevel": 3,
    "section": "A",
    "phoneNumber": "09123456789"
  }'
```

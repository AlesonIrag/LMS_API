# Professional Student Management API

A production-ready Node.js Express server with MySQL database integration, featuring comprehensive security, validation, and error handling for student management operations.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Copy the `.env` file and update database credentials:
```env
DB_HOST=localhost
DB_USER=lms_user
DB_PASS=lms2026
DB_NAME=dblibrary
```

### 3. Set Up Database
Follow the instructions in `DATABASE_SETUP.md` to create the database and tables.

### 4. Test Database Connection
```bash
npm run test-db
```

### 5. Start Server
```bash
npm start
```

The server will start on `http://localhost:3000`

## 🚀 Features

- **Professional Express.js Setup** - Latest Express v5 with modern middleware
- **Database Connection Pooling** - MySQL2 with connection pooling for better performance
- **Security Features** - Helmet, CORS, rate limiting, input validation
- **Input Validation** - Comprehensive validation with express-validator
- **Error Handling** - Professional error handling and logging
- **API Versioning** - Structured API versioning (v1)
- **Password Security** - bcryptjs hashing with strong password requirements
- **Request Logging** - Morgan logging for development and production
- **Compression** - Response compression for better performance

## 📋 API Endpoints (v1)

### Health Check
- **GET** `/`
- **GET** `/api`
- Returns server status and API information

### Admin Authentication
- **POST** `/api/v1/adminauth/register-admin` - Register new admin
- **POST** `/api/v1/adminauth/login-admin` - Admin login
- **GET** `/api/v1/adminauth/get-admin/:adminID` - Get admin by ID
- **GET** `/api/v1/adminauth/get-all-admins` - Get all admins
- **GET** `/api/v1/adminauth/get-admins-by-role/:role` - Get admins by role
- **PUT** `/api/v1/adminauth/update-admin/:adminID` - Update admin
- **DELETE** `/api/v1/adminauth/delete-admin/:adminID` - Delete admin
- **GET** `/api/v1/adminauth/admin-audit-logs/:adminID?` - Get audit logs
- **POST** `/api/v1/adminauth/change-admin-password/:adminID` - Change password

## 👥 Admin Roles & Permissions

### Role Hierarchy
1. **Super Admin** (Highest Level)
   - Full system access
   - Can manage all admins and system settings
   - Can create, update, delete any admin
   - Access to all audit logs and system logs

2. **Data Center Admin**
   - Manages data, reports, and system maintenance
   - Can manage Librarians and Librarian Staff
   - Access to reports and audit logs
   - Cannot manage Super Admins

3. **Librarian**
   - Manages books, transactions, and library operations
   - Can manage Librarian Staff
   - Limited access to reports
   - Cannot manage higher-level admins

4. **Librarian Staff** (Lowest Level)
   - Basic library operations
   - Limited administrative access
   - Cannot manage other admins
   - Read-only access to most data

### Security Features
- **Password Hashing**: bcryptjs with salt rounds
- **Role-based Access Control**: Hierarchical permission system
- **Audit Logging**: All admin actions are logged with timestamps
- **Account Protection**: Cannot delete the last Super Admin
- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Protection against brute force attacks

### Student Management
- **POST** `/api/v1/auth/register-student`
- **GET** `/api/v1/auth/get-student/:studentID`
- **GET** `/api/v1/auth/get-all-students`
- **PUT** `/api/v1/auth/update-student/:studentID`
- **DELETE** `/api/v1/auth/delete-student/:studentID`

All endpoints include:
- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling
- ✅ Security headers

#### Request Body:
```json
{
  "fullName": "Nathaniel Inocando",
  "email": "NathanielInocando@email.com",
  "password": "helloworld@123",
  "course": "BSIT",
  "yearLevel": 3,
  "section": "A",
  "phoneNumber": "09123456789"
}
```

#### Required Fields:
- `fullName` (string)
- `email` (string, must be unique)
- `password` (string, will be hashed)

#### Optional Fields:
- `course` (string, defaults to "N/A")
- `yearLevel` (number, defaults to 0)
- `section` (string, defaults to "N/A")
- `phoneNumber` (string, defaults to "N/A")

#### Response:
```json
{
  "message": "✅ Student registered successfully",
  "studentID": 123
}
```

## 🧪 Testing

### Register Student:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register-student \
  -H "Content-Type: application/json" \
  -d '{
    "studentID": "2025-00001",
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "password": "SecurePass123",
    "course": "BSCS",
    "yearLevel": 2,
    "section": "B",
    "phoneNumber": "09987654321"
  }'
```

### Get Student:
```bash
curl http://localhost:3000/api/v1/auth/get-student/2025-00001
```

### Get All Students:
```bash
curl http://localhost:3000/api/v1/auth/get-all-students
```

### Update Student:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/update-student/2025-00001 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Updated",
    "course": "BSIT",
    "yearLevel": 3
  }'
```

### Delete Student:
```bash
curl -X DELETE http://localhost:3000/api/v1/auth/delete-student/2025-00001
```

### Test with PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register-student" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"fullName":"Test User","email":"test@example.com","password":"test123"}'
```

## 🛠️ Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server
- `npm run test-db` - Test database connection and setup

## 🔧 Troubleshooting

### Database Connection Issues
1. Run `npm run test-db` to diagnose connection problems
2. Check if MySQL/MariaDB is running
3. Verify credentials in `.env` file
4. Follow `DATABASE_SETUP.md` for database setup

### Common Errors
- **Access Denied**: Check database user credentials
- **Database Not Found**: Create the database using setup guide
- **Connection Refused**: Ensure MySQL service is running

## 📁 Project Structure

```
backend-api/
├── server.js          # Main server file
├── db.js             # Database connection
├── routes/
│   └── auth.js       # Authentication routes
├── .env              # Environment variables
├── package.json      # Dependencies and scripts
├── test-db.js        # Database connection test
├── DATABASE_SETUP.md # Database setup guide
└── README.md         # This file
```

## 🔒 Security & Professional Features

### Security
- **Helmet.js** - Security headers (CSP, HSTS, etc.)
- **Rate Limiting** - 100 requests/15min general, 5 requests/15min for auth
- **Password Security** - bcryptjs hashing with complexity requirements
- **Input Validation** - express-validator with comprehensive rules
- **CORS Configuration** - Configurable allowed origins
- **SQL Injection Protection** - Parameterized queries

### Performance
- **Connection Pooling** - MySQL2 connection pool (10 connections)
- **Response Compression** - gzip compression for responses
- **Async/Await** - Modern async patterns throughout

### Development
- **Structured Logging** - Morgan with environment-based configuration
- **Error Handling** - Centralized error handling with proper HTTP codes
- **Environment Configuration** - Comprehensive .env setup
- **API Versioning** - Structured v1 API with future expansion support

### Validation Rules
- **Email** - Valid email format, normalized
- **Password** - Min 6 chars, must contain uppercase, lowercase, and number
- **Student ID** - Format: YYYY-NNNNN (e.g., 2025-00001)
- **Phone** - Philippine format: 09XXXXXXXXX
- **Year Level** - Integer between 1-6

## 📝 Notes

- The server will start even if database connection fails
- Database errors are logged but don't crash the server
- All passwords are automatically hashed before storage
- Student IDs are auto-generated by the database

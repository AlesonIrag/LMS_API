const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validateFacultyRegistration, validateFacultyUpdate, validateFacultyId, validateFacultyLogin } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { blacklistToken } = require('../middleware/jwtAuth');

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper function to combine name fields
const combineNameFields = (firstName, lastName, middleInitial = null, suffix = null) => {
  let fullName = `${firstName} ${lastName}`;
  if (middleInitial && middleInitial !== 'N/A') {
    fullName = `${firstName} ${middleInitial} ${lastName}`;
  }
  if (suffix && suffix !== 'N/A') {
    fullName += ` ${suffix}`;
  }
  return fullName;
};

// Generate JWT token for faculty
const generateFacultyToken = (faculty) => {
  const fullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);
  return jwt.sign(
    {
      facultyId: faculty.FacultyID,
      firstName: faculty.FirstName,
      lastName: faculty.LastName,
      middleInitial: faculty.MiddleInitial || 'N/A',
      suffix: faculty.Suffix || 'N/A',
      fullName: fullName,
      email: faculty.Email,
      department: faculty.Department,
      position: faculty.Position,
      type: 'faculty'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper function to log faculty actions
const logFacultyAction = async (facultyId, action, affectedTable = null, affectedId = null) => {
  try {
    const logQuery = `
      INSERT INTO facultyauditlogs (FacultyID, Action, AffectedTable, AffectedID)
      VALUES (?, ?, ?, ?)
    `;
    await db.execute(logQuery, [facultyId, action, affectedTable, affectedId]);
  } catch (error) {
    console.error('Failed to log faculty action:', error);
  }
};

// POST /register-faculty
router.post('/register-faculty', validateFacultyRegistration, asyncHandler(async (req, res) => {
  const {
    facultyId,
    firstName,
    lastName,
    middleInitial,
    suffix,
    email,
    phoneNumber,
    password,
    department,
    position,
    status = 'Active'
  } = req.body;

  // Validate facultyId format (YYYY-NNNNN or YYYY-NNNNNN)
  const facultyIdPattern = /^\d{4}-\d{5,6}$/;
  if (!facultyIdPattern.test(facultyId)) {
    return res.status(400).json({
      success: false,
      error: '❌ Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN (e.g., 2022-99999 or 2022-000001)'
    });
  }

  // Check if faculty ID already exists (store as string with dash)
  const checkQuery = `SELECT FacultyID FROM faculty WHERE FacultyID = ?`;
  const [existingFaculty] = await db.execute(checkQuery, [facultyId]);

  if (existingFaculty.length > 0) {
    return res.status(409).json({
      success: false,
      error: '❌ Faculty ID already exists. Please use a different ID.'
    });
  }

  // Set default values for optional fields
  const finalMiddleInitial = middleInitial || 'N/A';
  const finalSuffix = suffix || 'N/A';
  const fullName = combineNameFields(firstName, lastName, finalMiddleInitial, finalSuffix);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const insertQuery = `
    INSERT INTO faculty (
      FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, Password, Department, Position, Status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute(
    insertQuery,
    [facultyId, firstName, lastName, finalMiddleInitial, finalSuffix, email, phoneNumber, hashedPassword, department, position, status]
  );

  // Log the faculty creation action
  await logFacultyAction(facultyId, `Faculty account created - ID: ${facultyId}, Department: ${department}, Position: ${position}`, 'faculty', facultyId);

  res.status(201).json({
    success: true,
    message: '✅ Faculty registered successfully',
    data: {
      facultyID: facultyId,
      firstName,
      lastName,
      middleInitial: finalMiddleInitial,
      suffix: finalSuffix,
      fullName,
      email,
      phoneNumber,
      department,
      position,
      status
    }
  });
}));

// POST /login-faculty
router.post('/login-faculty', validateFacultyLogin, asyncHandler(async (req, res) => {
  const { facultyId, password } = req.body;

  console.log('🚀 Faculty login attempt for:', facultyId);

  console.log('🔍 Looking for faculty with ID:', facultyId);

  const selectQuery = `SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, ProfilePhoto, Password, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty WHERE FacultyID = ? AND Status = 'Active'`;
  const [results] = await db.execute(selectQuery, [facultyId]);

  if (results.length === 0) {
    console.log('❌ Faculty not found or account not active:', facultyId);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid faculty ID or password'
    });
  }

  const faculty = results[0];
  const facultyFullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);
  console.log('🔍 Found faculty:', facultyFullName);

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, faculty.Password);
  if (!isPasswordValid) {
    console.log('❌ Invalid password for faculty:', facultyId);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid faculty ID or password'
    });
  }

  // Log the login action
  await logFacultyAction(faculty.FacultyID, 'Faculty login');

  // Remove password from response
  delete faculty.Password;

  // Add computed fullName
  faculty.fullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);

  // Convert full URLs to relative URLs for frontend proxy
  if (faculty.ProfilePhoto) {
    if (faculty.ProfilePhoto.startsWith('http://localhost:3000/api/')) {
      faculty.ProfilePhoto = faculty.ProfilePhoto.replace('http://localhost:3000', '');
      console.log('🔗 Login - Converted to relative URL:', faculty.ProfilePhoto);
    } else {
      console.log('🔗 Login - ProfilePhoto URL (already relative):', faculty.ProfilePhoto);
    }
  }

  // Generate JWT token
  const token = generateFacultyToken(faculty);

  console.log('✅ Faculty login successful:', facultyFullName);

  res.json({
    success: true,
    message: '✅ Faculty login successful',
    data: faculty,
    token: token
  });
}));

// POST /validate-session - Validate faculty JWT token
router.post('/validate-session', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Token is required'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if faculty still exists and is active
    const selectQuery = `SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, ProfilePhoto, Department, Position, Status FROM faculty WHERE FacultyID = ? AND Status = 'Active'`;
    const [results] = await db.execute(selectQuery, [decoded.facultyId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Faculty not found or account not active'
      });
    }

    const faculty = results[0];
    faculty.fullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);

    // Convert full URLs to relative URLs for frontend proxy
    if (faculty.ProfilePhoto) {
      if (faculty.ProfilePhoto.startsWith('http://localhost:3000/api/')) {
        faculty.ProfilePhoto = faculty.ProfilePhoto.replace('http://localhost:3000', '');
        console.log('🔗 Session - Converted to relative URL:', faculty.ProfilePhoto);
      } else {
        console.log('🔗 Session - ProfilePhoto URL (already relative):', faculty.ProfilePhoto);
      }
    }

    res.json({
      success: true,
      message: '✅ Session valid',
      data: faculty
    });

  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid or expired token'
    });
  }
}));

// POST /logout - Faculty logout (blacklist token)
router.post('/logout', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: '❌ Token is required for logout'
    });
  }

  try {
    // Verify token before blacklisting
    const decoded = jwt.verify(token, JWT_SECRET);

    // Blacklist the token
    blacklistToken(token);

    console.log(`🚪 Faculty logout: ${decoded.fullName}`);

    res.json({
      success: true,
      message: '✅ Faculty logout successful'
    });
  } catch (error) {
    // Even if token is invalid, consider logout successful
    console.log('🚪 Faculty logout with invalid token');
    res.json({
      success: true,
      message: '✅ Faculty logout successful'
    });
  }
}));

// GET /get-faculty/:facultyID
router.get('/get-faculty/:facultyID', validateFacultyId, asyncHandler(async (req, res) => {
  const { facultyID } = req.params;

  const selectQuery = `SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, ProfilePhoto, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty WHERE FacultyID = ?`;
  const [results] = await db.execute(selectQuery, [facultyID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  const faculty = results[0];
  faculty.fullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);

  // Convert full URLs to relative URLs for frontend proxy
  if (faculty.ProfilePhoto) {
    if (faculty.ProfilePhoto.startsWith('http://localhost:3000/api/')) {
      faculty.ProfilePhoto = faculty.ProfilePhoto.replace('http://localhost:3000', '');
    }
  }
  res.json({
    success: true,
    message: '✅ Faculty found',
    data: faculty
  });
}));

// GET /get-all-faculty
router.get('/get-all-faculty', asyncHandler(async (req, res) => {
  const selectQuery = `
    SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt
    FROM faculty
    ORDER BY Department, LastName, FirstName ASC
  `;

  const [results] = await db.execute(selectQuery);

  // Add computed fullName to each faculty
  const facultyWithFullName = results.map(faculty => ({
    ...faculty,
    fullName: combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix)
  }));

  res.json({
    success: true,
    message: '✅ Faculty retrieved successfully',
    count: facultyWithFullName.length,
    data: facultyWithFullName
  });
}));

// GET /get-faculty-by-department/:department
router.get('/get-faculty-by-department/:department', asyncHandler(async (req, res) => {
  const { department } = req.params;

  const selectQuery = `
    SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt
    FROM faculty
    WHERE Department = ?
    ORDER BY LastName, FirstName ASC
  `;

  const [results] = await db.execute(selectQuery, [department]);

  // Add computed fullName to each faculty
  const facultyWithFullName = results.map(faculty => ({
    ...faculty,
    fullName: combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix)
  }));

  res.json({
    success: true,
    message: `✅ Faculty from ${department} retrieved successfully`,
    count: facultyWithFullName.length,
    data: facultyWithFullName
  });
}));

// GET /get-faculty-by-position/:position
router.get('/get-faculty-by-position/:position', asyncHandler(async (req, res) => {
  const { position } = req.params;

  const selectQuery = `
    SELECT FacultyID, FirstName, LastName, MiddleInitial, Suffix, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt
    FROM faculty
    WHERE Position = ?
    ORDER BY Department, LastName, FirstName ASC
  `;

  const [results] = await db.execute(selectQuery, [position]);

  // Add computed fullName to each faculty
  const facultyWithFullName = results.map(faculty => ({
    ...faculty,
    fullName: combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix)
  }));

  res.json({
    success: true,
    message: `✅ Faculty with position ${position} retrieved successfully`,
    count: facultyWithFullName.length,
    data: facultyWithFullName
  });
}));

// PUT /update-faculty/:facultyID
router.put('/update-faculty/:facultyID', validateFacultyUpdate, asyncHandler(async (req, res) => {
  const { facultyID } = req.params;
  const {
    firstName,
    lastName,
    middleInitial,
    suffix,
    email,
    phoneNumber,
    password,
    department,
    position,
    status,
    profilePhoto
  } = req.body;

  console.log('📥 FACULTY BACKEND: Update request body:', req.body);
  console.log('🔍 FACULTY BACKEND: profilePhoto from request:', profilePhoto);
  console.log('🔍 FACULTY BACKEND: profilePhoto type:', typeof profilePhoto);

  // Check if faculty exists
  const checkQuery = `SELECT * FROM faculty WHERE FacultyID = ?`;
  const [results] = await db.execute(checkQuery, [facultyID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  const currentFaculty = results[0];

  // Build update query dynamically
  let updateQuery = `UPDATE faculty SET `;
  let queryParams = [];
  let updateFields = [];

  if (firstName) {
    updateFields.push('FirstName = ?');
    queryParams.push(firstName);
  }
  if (lastName) {
    updateFields.push('LastName = ?');
    queryParams.push(lastName);
  }
  if (middleInitial !== undefined) {
    const finalMiddleInitial = middleInitial || 'N/A';
    updateFields.push('MiddleInitial = ?');
    queryParams.push(finalMiddleInitial);
  }
  if (suffix !== undefined) {
    const finalSuffix = suffix || 'N/A';
    updateFields.push('Suffix = ?');
    queryParams.push(finalSuffix);
  }

  // Note: FullName is computed in response, not stored in database

  if (email) {
    updateFields.push('Email = ?');
    queryParams.push(email);
  }
  if (phoneNumber) {
    updateFields.push('PhoneNumber = ?');
    queryParams.push(phoneNumber);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateFields.push('Password = ?');
    queryParams.push(hashedPassword);
  }
  if (department) {
    updateFields.push('Department = ?');
    queryParams.push(department);
  }
  if (position) {
    updateFields.push('Position = ?');
    queryParams.push(position);
  }
  if (status) {
    updateFields.push('Status = ?');
    queryParams.push(status);
  }
  if (profilePhoto !== undefined) {
    console.log('✅ FACULTY BACKEND: Including ProfilePhoto in update:', profilePhoto);
    updateFields.push('ProfilePhoto = ?');
    queryParams.push(profilePhoto);
  } else {
    console.log('❌ FACULTY BACKEND: ProfilePhoto not included in update (undefined)');
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: '❌ No fields to update'
    });
  }

  updateQuery += updateFields.join(', ') + ' WHERE FacultyID = ?';
  queryParams.push(facultyID);

  const [updateResult] = await db.execute(updateQuery, queryParams);

  if (updateResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  // Log the update action
  const changes = [];
  if (firstName && firstName !== currentFaculty.FirstName) changes.push(`First Name: ${currentFaculty.FirstName} → ${firstName}`);
  if (lastName && lastName !== currentFaculty.LastName) changes.push(`Last Name: ${currentFaculty.LastName} → ${lastName}`);
  if (middleInitial !== undefined && middleInitial !== currentFaculty.MiddleInitial) changes.push(`Middle Initial: ${currentFaculty.MiddleInitial} → ${middleInitial || 'N/A'}`);
  if (suffix !== undefined && suffix !== currentFaculty.Suffix) changes.push(`Suffix: ${currentFaculty.Suffix} → ${suffix || 'N/A'}`);
  if (email && email !== currentFaculty.Email) changes.push(`Email: ${currentFaculty.Email} → ${email}`);
  if (phoneNumber && phoneNumber !== currentFaculty.PhoneNumber) changes.push(`Phone: ${currentFaculty.PhoneNumber} → ${phoneNumber}`);
  if (department && department !== currentFaculty.Department) changes.push(`Department: ${currentFaculty.Department} → ${department}`);
  if (position && position !== currentFaculty.Position) changes.push(`Position: ${currentFaculty.Position} → ${position}`);
  if (status && status !== currentFaculty.Status) changes.push(`Status: ${currentFaculty.Status} → ${status}`);
  if (password) changes.push('Password updated');

  await logFacultyAction(facultyID, `Faculty profile updated: ${changes.join(', ')}`, 'faculty', facultyID);

  // Prepare response data
  const responseData = {
    facultyID,
    firstName: firstName || currentFaculty.FirstName,
    lastName: lastName || currentFaculty.LastName,
    middleInitial: middleInitial !== undefined ? (middleInitial || 'N/A') : currentFaculty.MiddleInitial,
    suffix: suffix !== undefined ? (suffix || 'N/A') : currentFaculty.Suffix,
    email: email || currentFaculty.Email,
    phoneNumber: phoneNumber || currentFaculty.PhoneNumber,
    department: department || currentFaculty.Department,
    position: position || currentFaculty.Position,
    status: status || currentFaculty.Status
  };

  // Add computed fullName
  responseData.fullName = combineNameFields(responseData.firstName, responseData.lastName, responseData.middleInitial, responseData.suffix);

  res.json({
    success: true,
    message: '✅ Faculty updated successfully',
    data: responseData
  });
}));

// DELETE /delete-faculty/:facultyID
router.delete('/delete-faculty/:facultyID', validateFacultyId, asyncHandler(async (req, res) => {
  const { facultyID } = req.params;

  // Check if faculty exists
  const checkQuery = `SELECT * FROM faculty WHERE FacultyID = ?`;
  const [results] = await db.execute(checkQuery, [facultyID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  const faculty = results[0];

  // Log the deletion action before deleting
  const facultyFullName = combineNameFields(faculty.FirstName, faculty.LastName, faculty.MiddleInitial, faculty.Suffix);
  await logFacultyAction(facultyID, `Faculty account deleted - ${facultyFullName} (${faculty.Department}, ${faculty.Position})`, 'faculty', facultyID);

  const deleteQuery = `DELETE FROM faculty WHERE FacultyID = ?`;
  const [deleteResult] = await db.execute(deleteQuery, [facultyID]);

  if (deleteResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  res.json({
    success: true,
    message: '✅ Faculty deleted successfully',
    data: {
      facultyID,
      deletedFaculty: {
        firstName: faculty.FirstName,
        lastName: faculty.LastName,
        middleInitial: faculty.MiddleInitial,
        suffix: faculty.Suffix,
        fullName: facultyFullName,
        email: faculty.Email,
        department: faculty.Department,
        position: faculty.Position
      }
    }
  });
}));

// GET /faculty-audit-logs (all logs)
router.get('/faculty-audit-logs', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const selectQuery = `
    SELECT
      fal.LogID,
      fal.FacultyID,
      f.FirstName,
      f.LastName,
      f.MiddleInitial,
      f.Suffix,
      f.FullName as FacultyName,
      f.Department as FacultyDepartment,
      f.Position as FacultyPosition,
      fal.Action,
      fal.AffectedTable,
      fal.AffectedID,
      fal.Timestamp
    FROM facultyauditlogs fal
    LEFT JOIN faculty f ON fal.FacultyID = f.FacultyID
    ORDER BY fal.Timestamp DESC LIMIT ? OFFSET ?
  `;

  const [results] = await db.execute(selectQuery, [parseInt(limit), parseInt(offset)]);

  res.json({
    success: true,
    message: '✅ Faculty audit logs retrieved successfully',
    count: results.length,
    data: results
  });
}));

// GET /faculty-audit-logs/:facultyID (logs for specific faculty)
router.get('/faculty-audit-logs/:facultyID', asyncHandler(async (req, res) => {
  const { facultyID } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const selectQuery = `
    SELECT
      fal.LogID,
      fal.FacultyID,
      f.FirstName,
      f.LastName,
      f.MiddleInitial,
      f.Suffix,
      f.FullName as FacultyName,
      f.Department as FacultyDepartment,
      f.Position as FacultyPosition,
      fal.Action,
      fal.AffectedTable,
      fal.AffectedID,
      fal.Timestamp
    FROM facultyauditlogs fal
    LEFT JOIN faculty f ON fal.FacultyID = f.FacultyID
    WHERE fal.FacultyID = ?
    ORDER BY fal.Timestamp DESC LIMIT ? OFFSET ?
  `;

  const [results] = await db.execute(selectQuery, [facultyID, parseInt(limit), parseInt(offset)]);

  res.json({
    success: true,
    message: '✅ Faculty audit logs retrieved successfully',
    count: results.length,
    data: results
  });
}));

// POST /change-faculty-password/:facultyID
router.post('/change-faculty-password/:facultyID', validateFacultyId, asyncHandler(async (req, res) => {
  const { facultyID } = req.params;
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: '❌ Current password and new password are required'
    });
  }

  // Validate new password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: '❌ New password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, and one number'
    });
  }

  // Get current faculty
  const selectQuery = `SELECT * FROM faculty WHERE FacultyID = ?`;
  const [results] = await db.execute(selectQuery, [facultyID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Faculty not found'
    });
  }

  const faculty = results[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, faculty.Password);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      success: false,
      error: '❌ Current password is incorrect'
    });
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  const updateQuery = `UPDATE faculty SET Password = ? WHERE FacultyID = ?`;
  await db.execute(updateQuery, [hashedNewPassword, facultyID]);

  // Log the password change
  await logFacultyAction(facultyID, 'Password changed', 'faculty', facultyID);

  res.json({
    success: true,
    message: '✅ Password changed successfully'
  });
}));

module.exports = router;

/*

FACULTY AUTHENTICATION API ENDPOINTS - API v1

POST /register-faculty
http://localhost:3000/api/v1/facultyauth/register-faculty
{
  "facultyId": "2022-99999",
  "firstName": "Maria",
  "lastName": "Santos",
  "middleInitial": "D",
  "suffix": "Dr.",
  "email": "maria.santos@benedictocollege.edu.ph",
  "phoneNumber": "+639123456789",
  "password": "FacultyPass123",
  "department": "Computer Science",
  "position": "Professor",
  "status": "Active"
}

POST /login-faculty
http://localhost:3000/api/v1/facultyauth/login-faculty
{
  "facultyId": "2022-99999",
  "password": "FacultyPass123"
}

GET /get-faculty/:facultyID
http://localhost:3000/api/v1/facultyauth/get-faculty/1

GET /get-all-faculty
http://localhost:3000/api/v1/facultyauth/get-all-faculty

GET /get-faculty-by-department/:department
http://localhost:3000/api/v1/facultyauth/get-faculty-by-department/Computer%20Science
http://localhost:3000/api/v1/facultyauth/get-faculty-by-department/Mathematics
http://localhost:3000/api/v1/facultyauth/get-faculty-by-department/English

GET /get-faculty-by-position/:position
http://localhost:3000/api/v1/facultyauth/get-faculty-by-position/Professor
http://localhost:3000/api/v1/facultyauth/get-faculty-by-position/Associate%20Professor
http://localhost:3000/api/v1/facultyauth/get-faculty-by-position/Assistant%20Professor
http://localhost:3000/api/v1/facultyauth/get-faculty-by-position/Instructor

PUT /update-faculty/:facultyID
http://localhost:3000/api/v1/facultyauth/update-faculty/1
{
  "firstName": "Maria",
  "lastName": "Santos-Updated",
  "middleInitial": "D",
  "suffix": "Dr.",
  "email": "maria.santos.updated@benedictocollege.edu.ph",
  "phoneNumber": "+639987654321",
  "department": "Information Technology",
  "position": "Associate Professor",
  "status": "Active"
}

DELETE /delete-faculty/:facultyID
http://localhost:3000/api/v1/facultyauth/delete-faculty/1

GET /faculty-audit-logs
http://localhost:3000/api/v1/facultyauth/faculty-audit-logs
http://localhost:3000/api/v1/facultyauth/faculty-audit-logs?limit=100&offset=0

GET /faculty-audit-logs/:facultyID
http://localhost:3000/api/v1/facultyauth/faculty-audit-logs/1

POST /change-faculty-password/:facultyID
http://localhost:3000/api/v1/facultyauth/change-faculty-password/1
{
  "currentPassword": "FacultyPass123",
  "newPassword": "NewFacultyPass456"
}

FACULTY SCHEMA:
- FacultyID (Required, manually input as YYYY-NNNNN or YYYY-NNNNNN format, stored as string)
- FirstName (Required, 1-100 characters)
- LastName (Required, 1-100 characters)
- MiddleInitial (Optional, max 10 characters, defaults to 'N/A')
- Suffix (Optional, max 20 characters, defaults to 'N/A')
- FullName (Auto-generated from name fields)
- Email (Required, valid email format, unique)
- PhoneNumber (Required, valid phone number)
- Password (Required, min 6 chars with uppercase, lowercase, number)
- Department (Required, 2-100 characters)
- Position (Required, 2-100 characters)
- Status (Active/Inactive, default: Active)
- CreatedAt (Auto-generated timestamp)
- UpdatedAt (Auto-updated timestamp)

FACULTY ID FORMAT:
- Input format: YYYY-NNNNN or YYYY-NNNNNN (e.g., 2022-99999, 2022-000001, 2023-000045)
- Stored as string with dash in database (e.g., 2022-99999, 2022-000001, 2023-000045)
- Must be unique across all faculty members

COMMON DEPARTMENTS:
- Computer Science
- Information Technology
- Mathematics
- English
- Business Administration
- Education
- Engineering
- Nursing
- Psychology

COMMON POSITIONS:
- Professor
- Associate Professor
- Assistant Professor
- Instructor
- Department Head
- Dean
- Lecturer

*/

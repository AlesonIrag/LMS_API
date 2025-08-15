const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validateStudentRegistration, validateStudentUpdate, validateStudentId } = require('../middleware/validation');
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

// Generate JWT token for student
const generateStudentToken = (student) => {
  const fullName = combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix);
  return jwt.sign(
    {
      studentId: student.StudentID,
      firstName: student.FirstName,
      lastName: student.LastName,
      middleInitial: student.MiddleInitial || 'N/A',
      suffix: student.Suffix || 'N/A',
      fullName: fullName,
      email: student.Email,
      type: 'student'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Validation middleware for student login
const validateStudentLogin = (req, res, next) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({
      success: false,
      error: '❌ Student ID and password are required'
    });
  }

  // Validate student ID format (YYYY-NNNNN)
  const studentIdPattern = /^[0-9]{4}-[0-9]{5}$/;
  if (!studentIdPattern.test(studentId)) {
    return res.status(400).json({
      success: false,
      error: '❌ Invalid student ID format. Expected format: YYYY-NNNNN'
    });
  }

  next();
};

// POST /register-student
router.post('/register-student', validateStudentRegistration, asyncHandler(async (req, res) => {
  let {
    studentID,
    firstName,
    lastName,
    middleInitial,
    suffix,
    course,
    yearLevel,
    section,
    email,
    phoneNumber,
    password
  } = req.body;

  // Set defaults for optional fields
  course = course?.trim() !== '' ? course : 'N/A';
  section = section?.trim() !== '' ? section : 'N/A';
  phoneNumber = phoneNumber?.trim() !== '' ? phoneNumber : 'N/A';
  yearLevel = yearLevel && !isNaN(yearLevel) ? parseInt(yearLevel) : 0;

  // Set default values for optional fields
  const finalMiddleInitial = middleInitial || 'N/A';
  const finalSuffix = suffix || 'N/A';
  const fullName = combineNameFields(firstName, lastName, finalMiddleInitial, finalSuffix);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const handleInsert = async (idToUse) => {
    const insertQuery = `
      INSERT INTO Students (
        StudentID, FirstName, LastName, MiddleInitial, Suffix, Course, YearLevel, Section,
        Email, PhoneNumber, Password,
        EnrollmentStatus, AccountStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Allowed')
    `;

    console.log('🔍 DEBUG: About to execute INSERT query:', insertQuery);
    console.log('🔍 DEBUG: Parameters:', [idToUse, firstName, lastName, finalMiddleInitial, finalSuffix, course, yearLevel, section, email, phoneNumber, hashedPassword]);

    const [result] = await db.execute(
      insertQuery,
      [idToUse, firstName, lastName, finalMiddleInitial, finalSuffix, course, yearLevel, section, email, phoneNumber, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: '✅ Student registered successfully',
      data: {
        studentID: idToUse,
        firstName,
        lastName,
        middleInitial: finalMiddleInitial,
        suffix: finalSuffix,
        fullName,
        email,
        course,
        yearLevel,
        section
      }
    });
  };

  if (studentID && studentID.trim() !== '') {
    // Check if manual StudentID already exists
    const checkQuery = `SELECT * FROM Students WHERE StudentID = ?`;
    const [existing] = await db.execute(checkQuery, [studentID]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: '❌ StudentID already exists.'
      });
    }

    await handleInsert(studentID);
  } else {
    // Auto-generate StudentID
    const getLastIDQuery = `SELECT StudentID FROM Students ORDER BY StudentID DESC LIMIT 1`;
    const [results] = await db.execute(getLastIDQuery);

    const currentYear = new Date().getFullYear();
    let newID;

    if (results.length === 0) {
      newID = `${currentYear}-00001`;
    } else {
      const lastID = results[0].StudentID;
      const [year, number] = lastID.split('-');
      const nextNumber = String(parseInt(number) + 1).padStart(5, '0');
      newID = `${year}-${nextNumber}`;
    }

    await handleInsert(newID);
  }
}));

// POST /login - Student login
router.post('/login', validateStudentLogin, asyncHandler(async (req, res) => {
  const { studentId, password } = req.body;

  console.log('🚀 Student login attempt for:', studentId);

  // Find student by StudentID
  const selectQuery = `SELECT StudentID, FirstName, LastName, MiddleInitial, Suffix, Course, YearLevel, Section, Email, PhoneNumber, Password, EnrollmentStatus, AccountStatus, CreatedAt, UpdatedAt FROM Students WHERE StudentID = ? AND AccountStatus = 'Allowed'`;
  const [results] = await db.execute(selectQuery, [studentId]);

  if (results.length === 0) {
    console.log('❌ Student not found or account not allowed:', studentId);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid student ID or password'
    });
  }

  const student = results[0];
  const studentFullName = combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix);
  console.log('🔍 Found student:', studentFullName);

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, student.Password);
  if (!isPasswordValid) {
    console.log('❌ Invalid password for student:', studentId);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid student ID or password'
    });
  }

  // Remove password from response
  delete student.Password;

  // Add computed fullName
  student.fullName = combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix);

  // Generate JWT token
  const token = generateStudentToken(student);

  console.log('✅ Student login successful:', studentFullName);

  res.json({
    success: true,
    message: '✅ Student login successful',
    data: student,
    token: token
  });
}));

// POST /validate-session - Validate student session
router.post('/validate-session', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Token required for session validation'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if student still exists and is active
    const selectQuery = `SELECT StudentID, FirstName, LastName, MiddleInitial, Suffix, Email, Course, YearLevel, Section, PhoneNumber, EnrollmentStatus, AccountStatus FROM Students WHERE StudentID = ? AND AccountStatus = 'Allowed'`;
    const [results] = await db.execute(selectQuery, [decoded.studentId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Student not found or account not allowed'
      });
    }

    const student = results[0];
    student.fullName = combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix);

    res.json({
      success: true,
      message: '✅ Session valid',
      data: student
    });
  } catch (error) {
    console.log('❌ Token validation failed:', error.message);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid or expired token'
    });
  }
}));

// POST /logout - Student logout (blacklist token)
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

    console.log(`🚪 Student logout: ${decoded.fullName}`);

    res.json({
      success: true,
      message: '✅ Student logout successful'
    });
  } catch (error) {
    // Even if token is invalid, consider logout successful
    console.log('🚪 Student logout with invalid token');
    res.json({
      success: true,
      message: '✅ Student logout successful'
    });
  }
}));

// DELETE /delete-student/:studentID
router.delete('/delete-student/:studentID', validateStudentId, asyncHandler(async (req, res) => {
  const { studentID } = req.params;

  const deleteQuery = `DELETE FROM Students WHERE StudentID = ?`;
  const [result] = await db.execute(deleteQuery, [studentID]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Student not found.'
    });
  }

  res.json({
    success: true,
    message: `🗑️ Student with ID ${studentID} has been deleted.`
  });
}));

// GET /get-student/:studentID
router.get('/get-student/:studentID', validateStudentId, asyncHandler(async (req, res) => {
  const { studentID } = req.params;

  const selectQuery = `SELECT StudentID, FirstName, LastName, MiddleInitial, Suffix, Course, YearLevel, Section, Email, PhoneNumber, ProfilePhoto, EnrollmentStatus, AccountStatus, CreatedAt, UpdatedAt FROM Students WHERE StudentID = ?`;
  const [results] = await db.execute(selectQuery, [studentID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Student not found.'
    });
  }

  const student = results[0];
  console.log('🔍 Raw ProfilePhoto from DB:', student.ProfilePhoto); // Debug log
  delete student.Password;
  student.fullName = combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix);

  // Convert full URLs to relative URLs for frontend proxy
  if (student.ProfilePhoto) {
    if (student.ProfilePhoto.startsWith('http://localhost:3000/api/')) {
      student.ProfilePhoto = student.ProfilePhoto.replace('http://localhost:3000', '');
      console.log('🔗 Converted to relative URL:', student.ProfilePhoto); // Debug log
    } else {
      console.log('🔗 ProfilePhoto URL (already relative):', student.ProfilePhoto); // Debug log
    }
  }

  res.json({
    success: true,
    message: '✅ Student found',
    data: student
  });
}));

// GET /get-all-students
router.get('/get-all-students', asyncHandler(async (req, res) => {
  const selectQuery = `SELECT StudentID, FirstName, LastName, MiddleInitial, Suffix, Course, YearLevel, Section, Email, PhoneNumber, EnrollmentStatus, AccountStatus, CreatedAt, UpdatedAt FROM Students ORDER BY LastName, FirstName ASC`;

  const [results] = await db.execute(selectQuery);

  // Add computed fullName to each student
  const studentsWithFullName = results.map(student => ({
    ...student,
    fullName: combineNameFields(student.FirstName, student.LastName, student.MiddleInitial, student.Suffix)
  }));

  res.json({
    success: true,
    message: '✅ Students retrieved successfully',
    count: studentsWithFullName.length,
    data: studentsWithFullName
  });
}));

// PUT /update-student/:studentID
router.put('/update-student/:studentID', validateStudentUpdate, asyncHandler(async (req, res) => {
  const { studentID } = req.params;
  let {
    firstName,
    lastName,
    middleInitial,
    suffix,
    course,
    yearLevel,
    section,
    email,
    phoneNumber,
    password,
    enrollmentStatus,
    accountStatus
  } = req.body;

  // Check if student exists
  const checkQuery = `SELECT * FROM Students WHERE StudentID = ?`;
  const [results] = await db.execute(checkQuery, [studentID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Student not found.'
    });
  }

  const currentStudent = results[0];

  // Use existing values if not provided and calculate new fullName
  firstName = firstName || currentStudent.FirstName;
  lastName = lastName || currentStudent.LastName;
  middleInitial = middleInitial !== undefined ? (middleInitial || 'N/A') : currentStudent.MiddleInitial;
  suffix = suffix !== undefined ? (suffix || 'N/A') : currentStudent.Suffix;
  const fullName = combineNameFields(firstName, lastName, middleInitial, suffix);

  course = course || currentStudent.Course;
  yearLevel = yearLevel !== undefined ? parseInt(yearLevel) : currentStudent.YearLevel;
  section = section || currentStudent.Section;
  email = email || currentStudent.Email;
  phoneNumber = phoneNumber || currentStudent.PhoneNumber;
  enrollmentStatus = enrollmentStatus || currentStudent.EnrollmentStatus;
  accountStatus = accountStatus || currentStudent.AccountStatus;

  let updateQuery = `
    UPDATE Students SET
    FirstName = ?, LastName = ?, MiddleInitial = ?, Suffix = ?,
    Course = ?, YearLevel = ?, Section = ?,
    Email = ?, PhoneNumber = ?, EnrollmentStatus = ?, AccountStatus = ?
  `;
  let queryParams = [firstName, lastName, middleInitial, suffix, course, yearLevel, section, email, phoneNumber, enrollmentStatus, accountStatus];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateQuery += `, Password = ?`;
    queryParams.push(hashedPassword);
  }

  updateQuery += ` WHERE StudentID = ?`;
  queryParams.push(studentID);

  const [updateResult] = await db.execute(updateQuery, queryParams);

  if (updateResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Student not found.'
    });
  }

  res.json({
    success: true,
    message: '✅ Student updated successfully',
    data: {
      studentID,
      firstName,
      lastName,
      middleInitial,
      suffix,
      fullName,
      email,
      course,
      yearLevel,
      section,
      enrollmentStatus,
      accountStatus
    }
  });
}));

// Change Password Route
router.post('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  console.log('Change password request received:', { currentPassword: '***', newPassword: '***' });

  // Get student ID from JWT token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const studentId = decoded.studentId;
    console.log('Decoded student ID:', studentId);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    // Get current student data
    const [students] = await db.execute(
      'SELECT * FROM students WHERE StudentID = ?',
      [studentId]
    );

    if (students.length === 0) {
      console.log('Student not found:', studentId);
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = students[0];
    console.log('Found student:', student.StudentID, student.FirstName, student.LastName);

    // Verify current password
    console.log('Comparing passwords...');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, student.Password);
    console.log('Password comparison result:', isCurrentPasswordValid);

    if (!isCurrentPasswordValid) {
      console.log('Current password is incorrect');
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await db.execute(
      'UPDATE students SET Password = ? WHERE StudentID = ?',
      [hashedNewPassword, studentId]
    );

    res.json({
      message: 'Password changed successfully',
      success: true
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    throw error;
  }
}));

module.exports = router;

/*



PARA POSTING FORMAT - API v1

POST /register-student
http://localhost:3000/api/v1/auth/register-student
{
  "studentID": "2025-00143",
  "firstName": "Nathaniel",
  "lastName": "Inocando",
  "middleInitial": "M",
  "suffix": "",
  "course": "BSIT",
  "yearLevel": 4,
  "section": "A",
  "email": "humsilkysweet@gmail.com",
  "phoneNumber": "09123456789",
  "password": "HelloNathan123"
}

DELETE /delete-student/:studentID
http://localhost:3000/api/v1/auth/delete-student/2025-00143

GET /get-student/:studentID
http://localhost:3000/api/v1/auth/get-student/2025-00143

GET /get-all-students
http://localhost:3000/api/v1/auth/get-all-students

PUT /update-student/:studentID
http://localhost:3000/api/v1/auth/update-student/2025-00143
{
  "firstName": "Nathaniel",
  "lastName": "Updated",
  "middleInitial": "M",
  "suffix": "Jr",
  "course": "BSCS",
  "yearLevel": 3,
  "section": "B",
  "email": "newemail@gmail.com",
  "phoneNumber": "09987654321",
  "password": "NewPassword123",
  "enrollmentStatus": "Active",
  "accountStatus": "Allowed"
}





*/
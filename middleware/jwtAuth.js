const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { asyncHandler } = require('./errorHandler');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Generic JWT authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const authenticateJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Access token is required'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach decoded token data to request
    req.user = decoded;
    req.userType = decoded.type;
    
    console.log(`🔐 JWT Auth: ${decoded.type} authenticated - ${decoded.fullName}`);
    next();
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: '❌ Invalid or expired token'
    });
  }
});

/**
 * Student-specific JWT middleware
 * Verifies student token and checks if student exists and is active
 */
const authenticateStudent = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Student access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'student') {
      return res.status(403).json({
        success: false,
        error: '❌ Invalid token type for student access'
      });
    }

    // Verify student still exists and is active
    const selectQuery = `SELECT StudentID, FullName, Email, Course, YearLevel, Section, PhoneNumber, EnrollmentStatus, AccountStatus FROM students WHERE StudentID = ? AND AccountStatus = 'Allowed'`;
    const [results] = await db.execute(selectQuery, [decoded.studentId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Student not found or account not allowed'
      });
    }

    req.user = decoded;
    req.student = results[0];
    console.log(`🎓 Student authenticated: ${decoded.fullName}`);
    next();
  } catch (error) {
    console.error('❌ Student JWT verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: '❌ Invalid or expired student token'
    });
  }
});

/**
 * Faculty-specific JWT middleware
 * Verifies faculty token and checks if faculty exists and is active
 */
const authenticateFaculty = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Faculty access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'faculty') {
      return res.status(403).json({
        success: false,
        error: '❌ Invalid token type for faculty access'
      });
    }

    // Verify faculty still exists and is active
    const selectQuery = `SELECT FacultyID, FullName, Email, PhoneNumber, Department, Position, Status FROM faculty WHERE FacultyID = ? AND Status = 'Active'`;
    const [results] = await db.execute(selectQuery, [decoded.facultyId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Faculty not found or account not active'
      });
    }

    req.user = decoded;
    req.faculty = results[0];
    console.log(`👨‍🏫 Faculty authenticated: ${decoded.fullName}`);
    next();
  } catch (error) {
    console.error('❌ Faculty JWT verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: '❌ Invalid or expired faculty token'
    });
  }
});

/**
 * Admin-specific JWT middleware
 * Verifies admin token and checks if admin exists and is active
 */
const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '❌ Admin access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '❌ Invalid token type for admin access'
      });
    }

    // Verify admin still exists and is active
    const selectQuery = `SELECT AdminID, FullName, Email, Role, Status FROM admins WHERE AdminID = ? AND Status = 'Active'`;
    const [results] = await db.execute(selectQuery, [decoded.adminId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Admin not found or account not active'
      });
    }

    req.user = decoded;
    req.admin = results[0];
    console.log(`👨‍💼 Admin authenticated: ${decoded.fullName} (${decoded.role})`);
    next();
  } catch (error) {
    console.error('❌ Admin JWT verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: '❌ Invalid or expired admin token'
    });
  }
});

/**
 * Role-based authorization middleware
 * Checks if authenticated admin has required role
 */
const requireRole = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: '❌ Admin authentication required'
      });
    }

    const userRole = req.admin.Role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `❌ Access denied. Required role: ${allowedRoles.join(' or ')}. Current role: ${userRole}`
      });
    }

    console.log(`✅ Role authorization passed: ${userRole}`);
    next();
  });
};

/**
 * Token blacklist functionality (for logout)
 * In production, this should use Redis or database
 */
const blacklistedTokens = new Set();

const blacklistToken = (token) => {
  blacklistedTokens.add(token);
  console.log('🚫 Token blacklisted');
};

const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

const checkBlacklist = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token && isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      error: '❌ Token has been revoked'
    });
  }

  next();
});

module.exports = {
  authenticateJWT,
  authenticateStudent,
  authenticateFaculty,
  authenticateAdmin,
  requireRole,
  blacklistToken,
  isTokenBlacklisted,
  checkBlacklist
};

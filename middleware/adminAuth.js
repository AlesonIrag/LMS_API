const db = require('../config/database');
const { asyncHandler } = require('./errorHandler');

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  'Super Admin': 4,
  'Data Center Admin': 3,
  'Librarian': 2,
  'Librarian Staff': 1
};

// Middleware to verify admin authentication
const verifyAdmin = asyncHandler(async (req, res, next) => {
  const { adminID } = req.body || req.params || req.query;
  
  if (!adminID) {
    return res.status(401).json({
      success: false,
      error: '❌ Admin ID required for authentication'
    });
  }

  // Get admin from database
  const selectQuery = `SELECT AdminID, FullName, Email, Role, Status FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(selectQuery, [adminID]);

  if (results.length === 0) {
    return res.status(401).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  const admin = results[0];

  if (admin.Status !== 'Active') {
    return res.status(401).json({
      success: false,
      error: '❌ Admin account is inactive'
    });
  }

  // Attach admin info to request
  req.admin = admin;
  next();
});

// Middleware to check if admin has required role or higher
const requireRole = (requiredRole) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: '❌ Admin authentication required'
      });
    }

    const adminRoleLevel = ROLE_HIERARCHY[req.admin.Role];
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

    if (adminRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        success: false,
        error: `❌ Access denied. Required role: ${requiredRole} or higher. Current role: ${req.admin.Role}`
      });
    }

    next();
  });
};

// Middleware to check if admin can perform action on target admin
const canManageAdmin = asyncHandler(async (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      error: '❌ Admin authentication required'
    });
  }

  const { adminID: targetAdminID } = req.params;
  
  if (!targetAdminID) {
    return next(); // No target admin to check
  }

  // Get target admin info
  const selectQuery = `SELECT Role FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(selectQuery, [targetAdminID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Target admin not found'
    });
  }

  const targetAdmin = results[0];
  const currentAdminRoleLevel = ROLE_HIERARCHY[req.admin.Role];
  const targetAdminRoleLevel = ROLE_HIERARCHY[targetAdmin.Role];

  // Super Admin can manage anyone
  if (req.admin.Role === 'Super Admin') {
    return next();
  }

  // Admins cannot manage admins with equal or higher roles
  if (currentAdminRoleLevel <= targetAdminRoleLevel) {
    return res.status(403).json({
      success: false,
      error: `❌ Cannot manage admin with role: ${targetAdmin.Role}. Insufficient permissions.`
    });
  }

  next();
});

// Middleware for Super Admin only actions
const requireSuperAdmin = requireRole('Super Admin');

// Middleware for Data Center Admin or higher
const requireDataCenterAdmin = requireRole('Data Center Admin');

// Middleware for Librarian or higher
const requireLibrarian = requireRole('Librarian');

// Middleware to log admin actions
const logAdminAction = (action, affectedTable = null) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.admin) {
      return next();
    }

    try {
      const affectedID = req.params.id || req.params.adminID || req.params.studentID || req.params.bookID || null;
      
      const logQuery = `
        INSERT INTO adminauditlogs (AdminID, Action, AffectedTable, AffectedID)
        VALUES (?, ?, ?, ?)
      `;
      
      await db.execute(logQuery, [req.admin.AdminID, action, affectedTable, affectedID]);
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }

    next();
  });
};

// Permission definitions for different operations
const PERMISSIONS = {
  // Admin management
  CREATE_ADMIN: ['Super Admin'],
  UPDATE_ADMIN: ['Super Admin', 'Data Center Admin'],
  DELETE_ADMIN: ['Super Admin'],
  VIEW_ADMIN: ['Super Admin', 'Data Center Admin', 'Librarian'],
  
  // Student management
  CREATE_STUDENT: ['Super Admin', 'Data Center Admin', 'Librarian'],
  UPDATE_STUDENT: ['Super Admin', 'Data Center Admin', 'Librarian'],
  DELETE_STUDENT: ['Super Admin', 'Data Center Admin'],
  VIEW_STUDENT: ['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'],
  
  // Book management
  CREATE_BOOK: ['Super Admin', 'Data Center Admin', 'Librarian'],
  UPDATE_BOOK: ['Super Admin', 'Data Center Admin', 'Librarian'],
  DELETE_BOOK: ['Super Admin', 'Data Center Admin'],
  VIEW_BOOK: ['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'],
  
  // Transaction management
  CREATE_TRANSACTION: ['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'],
  UPDATE_TRANSACTION: ['Super Admin', 'Data Center Admin', 'Librarian'],
  VIEW_TRANSACTION: ['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'],
  
  // Reports and logs
  VIEW_REPORTS: ['Super Admin', 'Data Center Admin', 'Librarian'],
  VIEW_AUDIT_LOGS: ['Super Admin', 'Data Center Admin'],
  VIEW_SYSTEM_LOGS: ['Super Admin', 'Data Center Admin']
};

// Middleware to check specific permissions
const requirePermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: '❌ Admin authentication required'
      });
    }

    const allowedRoles = PERMISSIONS[permission];
    
    if (!allowedRoles || !allowedRoles.includes(req.admin.Role)) {
      return res.status(403).json({
        success: false,
        error: `❌ Access denied. Permission '${permission}' required. Current role: ${req.admin.Role}`
      });
    }

    next();
  });
};

module.exports = {
  verifyAdmin,
  requireRole,
  requireSuperAdmin,
  requireDataCenterAdmin,
  requireLibrarian,
  canManageAdmin,
  logAdminAction,
  requirePermission,
  PERMISSIONS,
  ROLE_HIERARCHY
};

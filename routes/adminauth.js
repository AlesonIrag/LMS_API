const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validateAdminRegistration, validateAdminUpdate, validateAdminId, validateAdminLogin } = require('../middleware/validation');
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

// Helper function to format name fields for response
const formatNameFields = (firstName, lastName, middleInitial, suffix) => {
  return {
    firstName,
    lastName,
    middleInitial: middleInitial || 'N/A',
    suffix: suffix || 'N/A',
    fullName: combineNameFields(firstName, lastName, middleInitial, suffix)
  };
};

// Generate JWT token for admin
const generateAdminToken = (admin) => {
  const fullName = combineNameFields(admin.FirstName, admin.LastName, admin.MiddleInitial, admin.Suffix);
  return jwt.sign(
    {
      adminId: admin.AdminID,
      firstName: admin.FirstName,
      lastName: admin.LastName,
      middleInitial: admin.MiddleInitial || 'N/A',
      suffix: admin.Suffix || 'N/A',
      fullName: fullName,
      email: admin.Email,
      role: admin.Role,
      type: 'admin'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper function to log admin actions
const logAdminAction = async (adminId, action, affectedTable = null, affectedId = null) => {
  try {
    const logQuery = `
      INSERT INTO adminauditlogs (AdminID, Action, AffectedTable, AffectedID)
      VALUES (?, ?, ?, ?)
    `;
    await db.execute(logQuery, [adminId, action, affectedTable, affectedId]);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// POST /register-admin
router.post('/register-admin', validateAdminRegistration, asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    middleInitial,
    suffix,
    email,
    password,
    role = 'Librarian',
    status = 'Active'
  } = req.body;

  // Set default values for optional fields
  const finalMiddleInitial = middleInitial || 'N/A';
  const finalSuffix = suffix || 'N/A';
  const fullName = combineNameFields(firstName, lastName, finalMiddleInitial, finalSuffix);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const insertQuery = `
    INSERT INTO admins (
      FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Password, Role, Status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute(
    insertQuery,
    [firstName, lastName, finalMiddleInitial, finalSuffix, fullName, email, hashedPassword, role, status]
  );

  // Log the admin creation action
  await logAdminAction(result.insertId, `Admin account created - Role: ${role}`, 'admins', result.insertId);

  res.status(201).json({
    success: true,
    message: '✅ Admin registered successfully',
    data: {
      adminID: result.insertId,
      firstName,
      lastName,
      middleInitial: finalMiddleInitial,
      suffix: finalSuffix,
      fullName,
      email,
      role,
      status
    }
  });
}));

// POST /login-admin
router.post('/login-admin', validateAdminLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find admin by email
  const selectQuery = `SELECT AdminID, FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Password, Role, Status, ProfilePhoto, CreatedAt, UpdatedAt FROM admins WHERE Email = ? AND Status = 'Active'`;
  const [results] = await db.execute(selectQuery, [email]);

  if (results.length === 0) {
    return res.status(401).json({
      success: false,
      error: '❌ Invalid credentials or account inactive'
    });
  }

  const admin = results[0];

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, admin.Password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: '❌ Invalid credentials'
    });
  }

  // Log the login action
  await logAdminAction(admin.AdminID, 'Admin login');

  // Remove password from response
  delete admin.Password;

  // Generate JWT token
  const token = generateAdminToken(admin);

  res.json({
    success: true,
    message: '✅ Admin login successful',
    data: admin,
    token: token
  });
}));

// POST /validate-session - Validate admin JWT token
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

    // Check if admin still exists and is active
    const selectQuery = `SELECT AdminID, FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Role, Status FROM admins WHERE AdminID = ? AND Status = 'Active'`;
    const [results] = await db.execute(selectQuery, [decoded.adminId]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        error: '❌ Admin not found or account not active'
      });
    }

    const admin = results[0];

    res.json({
      success: true,
      message: '✅ Session valid',
      data: admin
    });

  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({
      success: false,
      error: '❌ Invalid or expired token'
    });
  }
}));

// POST /logout - Admin logout (blacklist token)
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

    // Log the logout action
    await logAdminAction(decoded.adminId, 'Admin logout');

    // Blacklist the token
    blacklistToken(token);

    console.log(`🚪 Admin logout: ${decoded.fullName}`);

    res.json({
      success: true,
      message: '✅ Admin logout successful'
    });
  } catch (error) {
    // Even if token is invalid, consider logout successful
    console.log('🚪 Admin logout with invalid token');
    res.json({
      success: true,
      message: '✅ Admin logout successful'
    });
  }
}));

// GET /get-admin/:adminID
router.get('/get-admin/:adminID', validateAdminId, asyncHandler(async (req, res) => {
  const { adminID } = req.params;

  const selectQuery = `SELECT AdminID, FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Role, Status, ProfilePhoto, CreatedAt, UpdatedAt FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(selectQuery, [adminID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  const admin = results[0];

  res.json({
    success: true,
    message: '✅ Admin found',
    data: admin
  });
}));

// GET /get-all-admins - With pagination support
router.get('/get-all-admins', asyncHandler(async (req, res) => {
  console.log('👥 GET /get-all-admins - With pagination support');

  // Extract pagination parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  console.log('📄 Pagination params:', { page, limit, offset });

  // Get total count of admins
  const countQuery = 'SELECT COUNT(*) as total FROM admins';
  const [countResult] = await db.execute(countQuery);
  const totalAdmins = countResult[0].total;
  const totalPages = Math.ceil(totalAdmins / limit);

  console.log('📊 Total admins:', totalAdmins, 'Total pages:', totalPages);

  // Get paginated admins
  const selectQuery = `
    SELECT AdminID, FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Role, Status, CreatedAt, UpdatedAt
    FROM admins
    ORDER BY Role, LastName, FirstName ASC
    LIMIT ? OFFSET ?
  `;

  const [results] = await db.execute(selectQuery, [limit, offset]);
  console.log(`Found ${results.length} admins for page ${page}`);

  // Get stats for all admins (not just current page)
  const statsQuery = `
    SELECT 
      COUNT(*) as totalAdmins,
      SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END) as activeAdmins,
      SUM(CASE WHEN Status = 'Inactive' THEN 1 ELSE 0 END) as inactiveAdmins,
      SUM(CASE WHEN Role = 'Super Admin' THEN 1 ELSE 0 END) as superAdmins,
      SUM(CASE WHEN Role = 'Librarian' THEN 1 ELSE 0 END) as librarians,
      SUM(CASE WHEN Role = 'Librarian Staff' THEN 1 ELSE 0 END) as librarianStaff,
      SUM(CASE WHEN Role = 'Data Center Admin' THEN 1 ELSE 0 END) as dataCenterAdmins
    FROM admins
  `;
  const [statsResult] = await db.execute(statsQuery);
  const stats = statsResult[0];

  res.json({
    success: true,
    message: `✅ Retrieved ${results.length} admins for page ${page} of ${totalPages}`,
    count: results.length,
    data: results,
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalAdmins: totalAdmins,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    stats: {
      totalAdmins: parseInt(stats.totalAdmins),
      activeAdmins: parseInt(stats.activeAdmins),
      inactiveAdmins: parseInt(stats.inactiveAdmins),
      superAdmins: parseInt(stats.superAdmins),
      librarians: parseInt(stats.librarians),
      librarianStaff: parseInt(stats.librarianStaff),
      dataCenterAdmins: parseInt(stats.dataCenterAdmins)
    }
  });
}));

// GET /get-admins-by-role/:role
router.get('/get-admins-by-role/:role', asyncHandler(async (req, res) => {
  const { role } = req.params;
  
  const validRoles = ['Super Admin', 'Admin', 'Librarian', 'Librarian Staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: '❌ Invalid role. Valid roles: Super Admin, Admin, Librarian, Librarian Staff'
    });
  }

  const selectQuery = `
    SELECT AdminID, FirstName, LastName, MiddleInitial, Suffix, FullName, Email, Role, Status, CreatedAt, UpdatedAt
    FROM admins
    WHERE Role = ?
    ORDER BY LastName, FirstName ASC
  `;

  const [results] = await db.execute(selectQuery, [role]);

  res.json({
    success: true,
    message: `✅ ${role}s retrieved successfully`,
    count: results.length,
    data: results
  });
}));

// PUT /update-admin/:adminID
router.put('/update-admin/:adminID', validateAdminUpdate, asyncHandler(async (req, res) => {
  const { adminID } = req.params;
  const {
    firstName,
    lastName,
    middleInitial,
    suffix,
    email,
    password,
    role,
    status
  } = req.body;

  // Check if admin exists
  const checkQuery = `SELECT * FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(checkQuery, [adminID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  const currentAdmin = results[0];

  // Build update query dynamically
  let updateQuery = `UPDATE admins SET `;
  let queryParams = [];
  let updateFields = [];
  let fullNameUpdated = false;

  if (firstName) {
    updateFields.push('FirstName = ?');
    queryParams.push(firstName);
    fullNameUpdated = true;
  }
  if (lastName) {
    updateFields.push('LastName = ?');
    queryParams.push(lastName);
    fullNameUpdated = true;
  }
  if (middleInitial !== undefined) {
    const finalMiddleInitial = middleInitial || 'N/A';
    updateFields.push('MiddleInitial = ?');
    queryParams.push(finalMiddleInitial);
    fullNameUpdated = true;
  }
  if (suffix !== undefined) {
    const finalSuffix = suffix || 'N/A';
    updateFields.push('Suffix = ?');
    queryParams.push(finalSuffix);
    fullNameUpdated = true;
  }

  // If any name field is updated, recalculate FullName
  if (fullNameUpdated) {
    const newFirstName = firstName || currentAdmin.FirstName;
    const newLastName = lastName || currentAdmin.LastName;
    const newMiddleInitial = middleInitial !== undefined ? (middleInitial || 'N/A') : currentAdmin.MiddleInitial;
    const newSuffix = suffix !== undefined ? (suffix || 'N/A') : currentAdmin.Suffix;
    const newFullName = combineNameFields(newFirstName, newLastName, newMiddleInitial, newSuffix);
    updateFields.push('FullName = ?');
    queryParams.push(newFullName);
  }

  if (email) {
    updateFields.push('Email = ?');
    queryParams.push(email);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateFields.push('Password = ?');
    queryParams.push(hashedPassword);
  }
  if (role) {
    updateFields.push('Role = ?');
    queryParams.push(role);
  }
  if (status) {
    updateFields.push('Status = ?');
    queryParams.push(status);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: '❌ No fields to update'
    });
  }

  updateQuery += updateFields.join(', ') + ' WHERE AdminID = ?';
  queryParams.push(adminID);

  const [updateResult] = await db.execute(updateQuery, queryParams);

  if (updateResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  // Log the update action
  const changes = [];
  if (firstName && firstName !== currentAdmin.FirstName) changes.push(`First Name: ${currentAdmin.FirstName} → ${firstName}`);
  if (lastName && lastName !== currentAdmin.LastName) changes.push(`Last Name: ${currentAdmin.LastName} → ${lastName}`);
  if (middleInitial !== undefined && middleInitial !== currentAdmin.MiddleInitial) changes.push(`Middle Initial: ${currentAdmin.MiddleInitial} → ${middleInitial || 'N/A'}`);
  if (suffix !== undefined && suffix !== currentAdmin.Suffix) changes.push(`Suffix: ${currentAdmin.Suffix} → ${suffix || 'N/A'}`);
  if (email && email !== currentAdmin.Email) changes.push(`Email: ${currentAdmin.Email} → ${email}`);
  if (role && role !== currentAdmin.Role) changes.push(`Role: ${currentAdmin.Role} → ${role}`);
  if (status && status !== currentAdmin.Status) changes.push(`Status: ${currentAdmin.Status} → ${status}`);
  if (password) changes.push('Password updated');

  await logAdminAction(adminID, `Admin profile updated: ${changes.join(', ')}`, 'admins', adminID);

  // Prepare response data
  const responseData = {
    adminID,
    firstName: firstName || currentAdmin.FirstName,
    lastName: lastName || currentAdmin.LastName,
    middleInitial: middleInitial !== undefined ? (middleInitial || 'N/A') : currentAdmin.MiddleInitial,
    suffix: suffix !== undefined ? (suffix || 'N/A') : currentAdmin.Suffix,
    email: email || currentAdmin.Email,
    role: role || currentAdmin.Role,
    status: status || currentAdmin.Status
  };

  // Add computed fullName
  responseData.fullName = combineNameFields(responseData.firstName, responseData.lastName, responseData.middleInitial, responseData.suffix);

  res.json({
    success: true,
    message: '✅ Admin updated successfully',
    data: responseData
  });
}));

// DELETE /delete-admin/:adminID
router.delete('/delete-admin/:adminID', validateAdminId, asyncHandler(async (req, res) => {
  const { adminID } = req.params;

  // Check if admin exists
  const checkQuery = `SELECT * FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(checkQuery, [adminID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  const admin = results[0];

  // Prevent deletion of Super Admin if it's the last one
  if (admin.Role === 'Super Admin') {
    const superAdminCountQuery = `SELECT COUNT(*) as count FROM admins WHERE Role = 'Super Admin' AND Status = 'Active'`;
    const [countResult] = await db.execute(superAdminCountQuery);

    if (countResult[0].count <= 1) {
      return res.status(400).json({
        success: false,
        error: '❌ Cannot delete the last active Super Admin'
      });
    }
  }

  // Log the deletion action before deleting
  const adminFullName = combineNameFields(admin.FirstName, admin.LastName, admin.MiddleInitial, admin.Suffix);
  await logAdminAction(adminID, `Admin account deleted - ${adminFullName} (${admin.Role})`, 'admins', adminID);

  const deleteQuery = `DELETE FROM admins WHERE AdminID = ?`;
  const [deleteResult] = await db.execute(deleteQuery, [adminID]);

  if (deleteResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  res.json({
    success: true,
    message: '✅ Admin deleted successfully',
    data: {
      adminID,
      deletedAdmin: {
        firstName: admin.FirstName,
        lastName: admin.LastName,
        middleInitial: admin.MiddleInitial,
        suffix: admin.Suffix,
        fullName: adminFullName,
        email: admin.Email,
        role: admin.Role
      }
    }
  });
}));

// GET /admin-audit-logs (all logs)
router.get('/admin-audit-logs', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const selectQuery = `
    SELECT
      aal.LogID,
      aal.AdminID,
      a.FirstName,
      a.LastName,
      a.MiddleInitial,
      a.Suffix,
      a.FullName as AdminName,
      a.Role as AdminRole,
      aal.Action,
      aal.AffectedTable,
      aal.AffectedID,
      aal.Timestamp
    FROM adminauditlogs aal
    LEFT JOIN admins a ON aal.AdminID = a.AdminID
    ORDER BY aal.Timestamp DESC LIMIT ? OFFSET ?
  `;

  const [results] = await db.execute(selectQuery, [parseInt(limit), parseInt(offset)]);

  res.json({
    success: true,
    message: '✅ Admin audit logs retrieved successfully',
    count: results.length,
    data: results
  });
}));

// GET /admin-audit-logs/:adminID (logs for specific admin)
router.get('/admin-audit-logs/:adminID', asyncHandler(async (req, res) => {
  const { adminID } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const selectQuery = `
    SELECT
      aal.LogID,
      aal.AdminID,
      a.FirstName,
      a.LastName,
      a.MiddleInitial,
      a.Suffix,
      a.FullName as AdminName,
      a.Role as AdminRole,
      aal.Action,
      aal.AffectedTable,
      aal.AffectedID,
      aal.Timestamp
    FROM adminauditlogs aal
    LEFT JOIN admins a ON aal.AdminID = a.AdminID
    WHERE aal.AdminID = ?
    ORDER BY aal.Timestamp DESC LIMIT ? OFFSET ?
  `;

  const [results] = await db.execute(selectQuery, [adminID, parseInt(limit), parseInt(offset)]);

  res.json({
    success: true,
    message: '✅ Admin audit logs retrieved successfully',
    count: results.length,
    data: results
  });
}));

// POST /change-admin-password/:adminID
router.post('/change-admin-password/:adminID', validateAdminId, asyncHandler(async (req, res) => {
  const { adminID } = req.params;
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

  // Get current admin
  const selectQuery = `SELECT * FROM admins WHERE AdminID = ?`;
  const [results] = await db.execute(selectQuery, [adminID]);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: '❌ Admin not found'
    });
  }

  const admin = results[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.Password);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      success: false,
      error: '❌ Current password is incorrect'
    });
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  const updateQuery = `UPDATE admins SET Password = ? WHERE AdminID = ?`;
  await db.execute(updateQuery, [hashedNewPassword, adminID]);

  // Log the password change
  await logAdminAction(adminID, 'Password changed', 'admins', adminID);

  res.json({
    success: true,
    message: '✅ Password changed successfully'
  });
}));

// GET /profile/:adminId - Get admin profile details
router.get('/profile/:adminId', asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  // Validate admin ID
  if (!adminId || isNaN(adminId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid admin ID'
    });
  }

  // Get admin details from database
  const query = `
    SELECT AdminID, FirstName, MiddleInitial, LastName, Suffix, FullName,
           Email, Role, Status, ProfilePhoto, CreatedAt, UpdatedAt
    FROM Admins
    WHERE AdminID = ? AND Status = 'Active'
  `;

  const [rows] = await db.execute(query, [adminId]);

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Admin not found'
    });
  }

  const admin = rows[0];

  // Convert full URLs to relative URLs for frontend proxy
  if (admin.ProfilePhoto) {
    if (admin.ProfilePhoto.startsWith('http://localhost:3000/api/')) {
      admin.ProfilePhoto = admin.ProfilePhoto.replace('http://localhost:3000', '');
    }
  }

  res.json({
    success: true,
    message: 'Admin profile retrieved successfully',
    data: {
      AdminID: admin.AdminID,
      FirstName: admin.FirstName,
      MiddleInitial: admin.MiddleInitial,
      LastName: admin.LastName,
      Suffix: admin.Suffix,
      FullName: admin.FullName || combineNameFields(admin.FirstName, admin.LastName, admin.MiddleInitial, admin.Suffix),
      Email: admin.Email,
      Role: admin.Role,
      Status: admin.Status,
      ProfilePhoto: admin.ProfilePhoto,
      CreatedAt: admin.CreatedAt,
      UpdatedAt: admin.UpdatedAt
    }
  });
}));

// PUT /profile/:adminId - Update admin profile
router.put('/profile/:adminId', asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { firstName, lastName, email, phoneNumber, profilePhoto } = req.body;

  // Validate admin ID
  if (!adminId || isNaN(adminId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid admin ID'
    });
  }

  // Validate required fields
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      error: 'First name, last name, and email are required'
    });
  }

  // Check if admin exists
  const checkQuery = `SELECT AdminID FROM Admins WHERE AdminID = ? AND Status = 'Active'`;
  const [existingAdmin] = await db.execute(checkQuery, [adminId]);

  if (existingAdmin.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Admin not found'
    });
  }

  // Update admin profile
  const fullName = combineNameFields(firstName, lastName);
  const updateQuery = `
    UPDATE Admins
    SET FirstName = ?, LastName = ?, FullName = ?, Email = ?, ProfilePhoto = ?, UpdatedAt = CURRENT_TIMESTAMP
    WHERE AdminID = ?
  `;

  await db.execute(updateQuery, [firstName, lastName, fullName, email, profilePhoto, adminId]);

  console.log(`✅ Admin profile updated for ID ${adminId}`);

  res.json({
    success: true,
    message: 'Admin profile updated successfully',
    data: {
      AdminID: parseInt(adminId),
      FirstName: firstName,
      LastName: lastName,
      FullName: fullName,
      Email: email,
      ProfilePhoto: profilePhoto
    }
  });
}));

module.exports = router;

/*

ADMIN AUTHENTICATION API ENDPOINTS - API v1

POST /register-admin
http://localhost:3000/api/v1/adminauth/register-admin
{
  "firstName": "Nathaniel",
  "lastName": "Inocando",
  "middleInitial": "P",
  "suffix": "",
  "email": "nathanielinocando@aol.com",
  "password": "HelloNathan123",
  "role": "Super Admin",
  "status": "Active"
}

POST /login-admin
http://localhost:3000/api/v1/adminauth/login-admin
{
  "email": "nathanielinocando@aol.com",
  "password": "HelloNathan123"
}

GET /get-admin/:adminID
http://localhost:3000/api/v1/adminauth/get-admin/1

GET /get-all-admins
http://localhost:3000/api/v1/adminauth/get-all-admins

GET /get-admins-by-role/:role
http://localhost:3000/api/v1/adminauth/get-admins-by-role/Super%20Admin
http://localhost:3000/api/v1/adminauth/get-admins-by-role/Admin
http://localhost:3000/api/v1/adminauth/get-admins-by-role/Librarian
http://localhost:3000/api/v1/adminauth/get-admins-by-role/Librarian%20Staff

PUT /update-admin/:adminID
http://localhost:3000/api/v1/adminauth/update-admin/1
{
  "firstName": "Nathaniel",
  "lastName": "Updated",
  "middleInitial": "P",
  "suffix": "Jr",
  "email": "nathaniel.updated@library.com",
  "role": "Admin",
  "status": "Active"
}

DELETE /delete-admin/:adminID
http://localhost:3000/api/v1/adminauth/delete-admin/1

GET /admin-audit-logs
http://localhost:3000/api/v1/adminauth/admin-audit-logs
http://localhost:3000/api/v1/adminauth/admin-audit-logs?limit=100&offset=0

GET /admin-audit-logs/:adminID
http://localhost:3000/api/v1/adminauth/admin-audit-logs/1

POST /change-admin-password/:adminID
http://localhost:3000/api/v1/adminauth/change-admin-password/1
{
  "currentPassword": "HelloNathan123",
  "newPassword": "Helloworld-UPDATED-NGA-PASSWORD"
}

ADMIN ROLES:
- Super Admin: Full system access, can manage all admins and system settings
- Admin: Manages data, reports, and system maintenance
- Librarian: Manages books, transactions, and library operations
- Librarian Staff: Basic library operations, limited administrative access

*/

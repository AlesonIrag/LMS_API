const express = require('express');
const router = express.Router();
                    const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { validateAdminRegistration,      validateAdminUpdate, validateAdminId,
    validateAdminLogin
} = require('../middleware/validation');
const {
    asyncHandler
} = require('../middleware/errorHandler');

const logAdminAction = async (adminId, action, affectedTable = null, affectedId = null) => {
    try {
        const logQuery = `INSERT INTO adminauditlogs (AdminID, Action, AffectedTable, AffectedID) VALUES (?, ?, ?, ?)`;
        await db.execute(logQuery, [adminId, action, affectedTable, affectedId]);
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};

router.post('/register-admin', validateAdminRegistration, asyncHandler(async (req, res) => {
    const {
        fullName,
        email,
        password,
        role = 'Librarian',
        status = 'Active'
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO admins (FullName, Email, Password, Role, Status) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await db.execute(insertQuery, [fullName, email, hashedPassword, role, status]);
    await logAdminAction(result.insertId, `Admin account created - Role: ${role}`, 'admins', result.insertId);
    res.status(201).json({
        success: true,
        message: '✅ Admin registered successfully',
        data: {
            adminID: result.insertId,
            fullName,
            email,
            role,
            status
        }
    });
}));

router.post('/login-admin', validateAdminLogin, asyncHandler(async (req, res) => {
    const {
        email,
        password
    } = req.body;
    const selectQuery = `SELECT * FROM admins WHERE Email = ? AND Status = 'Active'`;
    const [results] = await db.execute(selectQuery, [email]);
    if (results.length === 0) {
        return res.status(401).json({
            success: false,
            error: '❌ Invalid credentials or account inactive'
        });
    }
    const admin = results[0];
    const isPasswordValid = await bcrypt.compare(password, admin.Password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            error: '❌ Invalid credentials'
        });
    }
    await logAdminAction(admin.AdminID, 'Admin login');
    res.json({
        success: true,
        message: '✅ Admin login successful',
        data: {
            adminID: admin.AdminID,
            fullName: admin.FullName,
            role: admin.Role
        }
    });
}));

router.get('/get-admin/:adminID', validateAdminId, asyncHandler(async (req, res) => {
    const {
        adminID
    } = req.params;
    const selectQuery = `SELECT AdminID, FullName, Email, Role, Status, CreatedAt, UpdatedAt FROM admins WHERE AdminID = ?`;
    const [results] = await db.execute(selectQuery, [adminID]);
    if (results.length === 0) {
        return res.status(404).json({
            success: false,
            error: '❌ Admin not found'
        });
    }
    res.json({
        success: true,
        message: '✅ Admin retrieved successfully',
        data: results[0]
    });
}));

router.get('/get-all-admins', asyncHandler(async (req, res) => {
    const {
        limit = 50, offset = 0
    } = req.query;
    const selectQuery = `SELECT AdminID, FullName, Email, Role, Status, CreatedAt, UpdatedAt FROM admins ORDER BY FullName ASC LIMIT ? OFFSET ?`;
    const [results] = await db.execute(selectQuery, [parseInt(limit), parseInt(offset)]);
    res.json({
        success: true,
        message: '✅ All admins retrieved successfully',
        count: results.length,
        data: results
    });
}));

router.get('/get-admins-by-role/:role', asyncHandler(async (req, res) => {
    const {
        role
    } = req.params;
    const {
        limit = 50, offset = 0
    } = req.query;
    const selectQuery = `SELECT AdminID, FullName, Email, Role, Status, CreatedAt, UpdatedAt FROM admins WHERE Role = ? ORDER BY FullName ASC LIMIT ? OFFSET ?`;
    const [results] = await db.execute(selectQuery, [role, parseInt(limit), parseInt(offset)]);
    res.json({
        success: true,
        message: `✅ Admins with role '${role}' retrieved successfully`,
        count: results.length,
        data: results
    });
}));

router.put('/update-admin/:adminID', validateAdminUpdate, asyncHandler(async (req, res) => {
    const {
        adminID
    } = req.params;
    const {
        fullName,
        email,
        password,
        role,
        status
    } = req.body;
    const checkQuery = `SELECT * FROM admins WHERE AdminID = ?`;
    const [results] = await db.execute(checkQuery, [adminID]);
    if (results.length === 0) {
        return res.status(404).json({
            success: false,
            error: '❌ Admin not found'
        });
    }
    const currentAdmin = results[0];
    let updateQuery = `UPDATE admins SET `;
    let queryParams = [];
    let updateFields = [];
    if (fullName) {
        updateFields.push('FullName = ?');
        queryParams.push(fullName);
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
    const changes = [];
    if (fullName && fullName !== currentAdmin.FullName) changes.push(`Name: ${currentAdmin.FullName} → ${fullName}`);
    if (email && email !== currentAdmin.Email) changes.push(`Email: ${currentAdmin.Email} → ${email}`);
    if (role && role !== currentAdmin.Role) changes.push(`Role: ${currentAdmin.Role} → ${role}`);
    if (status && status !== currentAdmin.Status) changes.push(`Status: ${currentAdmin.Status} → ${status}`);
    if (password) changes.push('Password updated');
    await logAdminAction(adminID, `Admin profile updated: ${changes.join(', ')}`, 'admins', adminID);
    res.json({
        success: true,
        message: '✅ Admin updated successfully',
        data: {
            adminID,
            fullName: fullName || currentAdmin.FullName,
            email: email || currentAdmin.Email,
            role: role || currentAdmin.Role,
            status: status || currentAdmin.Status
        }
    });
}));

router.delete('/delete-admin/:adminID', validateAdminId, asyncHandler(async (req, res) => {
    const {
        adminID
    } = req.params;
    const checkQuery = `SELECT * FROM admins WHERE AdminID = ?`;
    const [results] = await db.execute(checkQuery, [adminID]);
    if (results.length === 0) {
        return res.status(404).json({
            success: false,
            error: '❌ Admin not found'
        });
    }
    const admin = results[0];
    await logAdminAction(adminID, `Admin account deleted - ${admin.FullName} (${admin.Role})`, 'admins', adminID);
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
                fullName: admin.FullName,
                email: admin.Email,
                role: admin.Role
            }
        }
    });
}));

router.get('/admin-audit-logs', asyncHandler(async (req, res) => {
    const {
        limit = 50, offset = 0
    } = req.query;
    const selectQuery = `SELECT aal.LogID, aal.AdminID, a.FullName as AdminName, a.Role as AdminRole, aal.Action, aal.AffectedTable, aal.AffectedID, aal.Timestamp FROM adminauditlogs aal LEFT JOIN admins a ON aal.AdminID = a.AdminID ORDER BY aal.Timestamp DESC LIMIT ? OFFSET ?`;
    const [results] = await db.execute(selectQuery, [parseInt(limit), parseInt(offset)]);
    res.json({
        success: true,
        message: '✅ Admin audit logs retrieved successfully',
        count: results.length,
        data: results
    });
}));

router.get('/admin-audit-logs/:adminID', asyncHandler(async (req, res) => {
    const {
        adminID
    } = req.params;
    const {
        limit = 50, offset = 0
    } = req.query;
    const selectQuery = `SELECT aal.LogID, aal.AdminID, a.FullName as AdminName, a.Role as AdminRole, aal.Action, aal.AffectedTable, aal.AffectedID, aal.Timestamp FROM adminauditlogs aal LEFT JOIN admins a ON aal.AdminID = a.AdminID WHERE aal.AdminID = ? ORDER BY aal.Timestamp DESC LIMIT ? OFFSET ?`;
    const [results] = await db.execute(selectQuery, [adminID, parseInt(limit), parseInt(offset)]);
    res.json({
        success: true,
        message: '✅ Admin audit logs retrieved successfully',
        count: results.length,
        data: results
    });
}));

router.post('/change-admin-password/:adminID', validateAdminId, asyncHandler(async (req, res) => {
    const {
        adminID
    } = req.params;
    const {
        currentPassword,
        newPassword
    } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: '❌ Current password and new password are required'
        });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            success: false,
            error: '❌ New password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, and one number'
        });
    }
    const selectQuery = `SELECT * FROM admins WHERE AdminID = ?`;
    const [results] = await db.execute(selectQuery, [adminID]);
    if (results.length === 0) {
        return res.status(404).json({
            success: false,
            error: '❌ Admin not found'
        });
    }
    const admin = results[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.Password);
    if (!isCurrentPasswordValid) {
        return res.status(401).json({
            success: false,
            error: '❌ Current password is incorrect'
        });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = `UPDATE admins SET Password = ? WHERE AdminID = ?`;
    await db.execute(updateQuery, [hashedNewPassword, adminID]);
    await logAdminAction(adminID, 'Password changed', 'admins', adminID);
    res.json({
        success: true,
        message: '✅ Password changed successfully'
    });
}));

module.exports = router;
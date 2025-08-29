const { body, param, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    console.log('📝 Request body:', req.body);
    console.log('📝 Request params:', req.params);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Student registration validation
const validateStudentRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be between 1 and 100 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('studentID')
    .optional()
    .matches(/^\d{4}-\d{5}$/)
    .withMessage('Student ID must be in format YYYY-NNNNN (e.g., 2025-00001)'),
  
  body('course')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Course is required and must not exceed 100 characters'),

  body('yearLevel')
    .isInt({ min: 1, max: 6 })
    .withMessage('Year level is required and must be between 1 and 6'),

  body('section')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Section must not exceed 50 characters'),

  body('phoneNumber')
    .matches(/^09\d{9}$/)
    .withMessage('Phone number is required and must be in format 09XXXXXXXXX'),
  
  handleValidationErrors
];

// Student update validation
const validateStudentUpdate = [
  param('studentID')
    .matches(/^\d{4}-\d{5}$/)
    .withMessage('Student ID must be in format YYYY-NNNNN'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('course')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Course must not exceed 100 characters'),
  
  body('yearLevel')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year level must be between 1 and 6'),
  
  body('section')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Section must not exceed 50 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^09\d{9}$/)
    .withMessage('Phone number must be in format 09XXXXXXXXX'),
  
  body('enrollmentStatus')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Enrollment status must be Active or Inactive'),
  
  body('accountStatus')
    .optional()
    .isIn(['Allowed', 'Blocked'])
    .withMessage('Account status must be Allowed or Blocked'),
  
  handleValidationErrors
];

// Student ID parameter validation
const validateStudentId = [
  param('studentID')
    .matches(/^\d{4}-\d{5}$/)
    .withMessage('Student ID must be in format YYYY-NNNNN'),
  
  handleValidationErrors
];

// Admin registration validation
const validateAdminRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be between 1 and 100 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .optional()
    .isIn(['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'])
    .withMessage('Role must be one of: Super Admin, Data Center Admin, Librarian, Librarian Staff'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),

  handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Admin update validation
const validateAdminUpdate = [
  param('adminID')
    .isInt({ min: 1 })
    .withMessage('Admin ID must be a positive integer'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .optional()
    .isIn(['Super Admin', 'Data Center Admin', 'Librarian', 'Librarian Staff'])
    .withMessage('Role must be one of: Super Admin, Data Center Admin, Librarian, Librarian Staff'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),

  handleValidationErrors
];

// Admin ID parameter validation
const validateAdminId = [
  param('adminID')
    .isInt({ min: 1 })
    .withMessage('Admin ID must be a positive integer'),

  handleValidationErrors
];

// Faculty registration validation
const validateFacultyRegistration = [
  body('facultyId')
    .matches(/^\d{4}-\d{5,6}$/)
    .withMessage('Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN (e.g., 2022-99999 or 2022-000001)'),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be between 1 and 100 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),

  body('position')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),

  handleValidationErrors
];

// Faculty login validation
const validateFacultyLogin = [
  body('facultyId')
    .matches(/^\d{4}-\d{5,6}$/)
    .withMessage('Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Faculty update validation
const validateFacultyUpdate = [
  param('facultyID')
    .matches(/^\d{4}-\d{5,6}$/)
    .withMessage('Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),

  body('middleInitial')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Middle initial must not exceed 10 characters'),

  body('suffix')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Suffix must not exceed 20 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),

  body('position')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),

  body('profilePhoto')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Profile photo URL must not exceed 500 characters'),

  handleValidationErrors
];

// Faculty ID parameter validation
const validateFacultyId = [
  param('facultyID')
    .matches(/^\d{4}-\d{5,6}$/)
    .withMessage('Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN'),

  handleValidationErrors
];

module.exports = {
  validateStudentRegistration,
  validateStudentUpdate,
  validateStudentId,
  validateAdminRegistration,
  validateAdminLogin,
  validateAdminUpdate,
  validateAdminId,
  validateFacultyRegistration,
  validateFacultyLogin,
  validateFacultyUpdate,
  validateFacultyId,
  handleValidationErrors
};

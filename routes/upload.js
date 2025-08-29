const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${extension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// POST /upload/profile-photo/:studentId - Upload student profile photo
router.post('/profile-photo/:studentId', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log(`📸 Student upload request for ID: ${studentId}`);
    console.log(`📁 File received:`, req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'NO FILE');

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;
    const optimizedFilename = `optimized-${filename}`;
    const optimizedPath = path.join(profilePhotosDir, optimizedFilename);

    // Optimize image using Sharp
    await sharp(originalPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(optimizedPath);

    // Delete original file
    fs.unlinkSync(originalPath);

    // Generate URL for the optimized image
    const imageUrl = `/api/v1/uploads/profile-photos/${optimizedFilename}`;

    // Update student record in database with new profile photo URL
    const db = require('../config/database');
    const updateQuery = `UPDATE Students SET ProfilePhoto = ? WHERE StudentID = ?`;
    await db.execute(updateQuery, [imageUrl, studentId]);

    console.log(`✅ Profile photo uploaded for student ${studentId}: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        imageUrl: imageUrl,
        filename: optimizedFilename,
        originalName: req.file.originalname,
        size: fs.statSync(optimizedPath).size
      }
    });

  } catch (error) {
    console.error('❌ Error uploading profile photo:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload profile photo',
      details: error.message
    });
  }
});

// GET /uploads/profile-photos/:filename - Serve profile photos
router.get('/profile-photos/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(profilePhotosDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('ETag', `"${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error serving profile photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image'
    });
  }
});

// DELETE /upload/profile-photo/:studentId - Delete student profile photo
router.delete('/profile-photo/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const db = require('../config/database');

    // Get current profile photo URL from database
    const selectQuery = `SELECT ProfilePhoto FROM Students WHERE StudentID = ?`;
    const [results] = await db.execute(selectQuery, [studentId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const currentPhotoUrl = results[0].ProfilePhoto;
    
    if (currentPhotoUrl && currentPhotoUrl.startsWith('/api/v1/uploads/profile-photos/')) {
      // Extract filename from URL
      const filename = path.basename(currentPhotoUrl);
      const filePath = path.join(profilePhotosDir, filename);

      // Delete file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted profile photo file: ${filename}`);
      }
    }

    // Update database to remove profile photo URL
    const updateQuery = `UPDATE Students SET ProfilePhoto = NULL WHERE StudentID = ?`;
    await db.execute(updateQuery, [studentId]);

    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting profile photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile photo'
    });
  }
});

// POST /upload/admin-profile-photo/:adminId - Upload admin profile photo
router.post('/admin-profile-photo/:adminId', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { adminId } = req.params;

    console.log(`📸 Admin upload request for ID: ${adminId}`);
    console.log(`📁 File received:`, req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'NO FILE');

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;
    const optimizedFilename = `admin-optimized-${filename}`;
    const optimizedPath = path.join(profilePhotosDir, optimizedFilename);

    // Optimize image using Sharp
    await sharp(originalPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(optimizedPath);

    // Delete original file
    fs.unlinkSync(originalPath);

    // Generate URL for the optimized image
    const imageUrl = `/api/v1/uploads/profile-photos/${optimizedFilename}`;

    // Update admin record in database with new profile photo URL
    const db = require('../config/database');
    const updateQuery = `UPDATE Admins SET ProfilePhoto = ? WHERE AdminID = ?`;
    await db.execute(updateQuery, [imageUrl, adminId]);

    console.log(`✅ Profile photo uploaded for admin ${adminId}: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Admin profile photo uploaded successfully',
      data: {
        imageUrl: imageUrl,
        filename: optimizedFilename,
        originalName: req.file.originalname,
        size: fs.statSync(optimizedPath).size
      }
    });

  } catch (error) {
    console.error('❌ Error uploading admin profile photo:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload admin profile photo',
      details: error.message
    });
  }
});

// DELETE /upload/admin-profile-photo/:adminId - Delete admin profile photo
router.delete('/admin-profile-photo/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const db = require('../config/database');

    // Get current profile photo URL from database
    const selectQuery = `SELECT ProfilePhoto FROM Admins WHERE AdminID = ?`;
    const [rows] = await db.execute(selectQuery, [adminId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    const currentPhotoUrl = rows[0].ProfilePhoto;

    // Delete file from filesystem if it exists
    if (currentPhotoUrl && currentPhotoUrl.startsWith('/api/v1/uploads/profile-photos/')) {
      const filename = path.basename(currentPhotoUrl);
      const filePath = path.join(profilePhotosDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted admin profile photo file: ${filename}`);
      }
    }

    // Update database to remove profile photo URL
    const updateQuery = `UPDATE Admins SET ProfilePhoto = NULL WHERE AdminID = ?`;
    await db.execute(updateQuery, [adminId]);

    res.json({
      success: true,
      message: 'Admin profile photo deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting admin profile photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete admin profile photo'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed.'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    error: error.message || 'File upload error'
  });
});

// POST /upload/profile-photo/:facultyId - Upload faculty profile photo
router.post('/profile-photo/:facultyId', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { facultyId } = req.params;

    console.log(`📸 Faculty profile photo upload request for faculty ID: ${facultyId}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('📁 Original file info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
    }

    // Validate file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const optimizedFilename = `faculty_${facultyId}_${timestamp}${fileExtension}`;

    // Paths
    const originalPath = req.file.path;
    const optimizedPath = path.join(uploadDir, optimizedFilename);

    console.log('🔄 Processing image with Sharp...');

    // Process image with Sharp
    await sharp(originalPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(optimizedPath);

    console.log('✅ Image processing completed');

    // Delete original file
    fs.unlinkSync(originalPath);

    // Generate URL for the optimized image
    const imageUrl = `/api/v1/uploads/profile-photos/${optimizedFilename}`;

    // Update faculty record in database with new profile photo URL
    const db = require('../config/database');
    const updateQuery = `UPDATE faculty SET ProfilePhoto = ? WHERE FacultyID = ?`;
    await db.execute(updateQuery, [imageUrl, facultyId]);

    console.log(`✅ Profile photo uploaded for faculty ${facultyId}: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Faculty profile photo uploaded successfully',
      data: {
        imageUrl: imageUrl,
        filename: optimizedFilename,
        originalName: req.file.originalname,
        size: fs.statSync(optimizedPath).size
      }
    });

  } catch (error) {
    console.error('❌ Error uploading faculty profile photo:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload faculty profile photo',
      details: error.message
    });
  }
});

// DELETE /upload/faculty-profile-photo/:facultyId - Delete faculty profile photo
router.delete('/faculty-profile-photo/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;

    console.log(`🗑️ Faculty profile photo deletion request for faculty ID: ${facultyId}`);

    // Get current profile photo from database
    const db = require('../config/database');
    const selectQuery = `SELECT ProfilePhoto FROM faculty WHERE FacultyID = ?`;
    const [results] = await db.execute(selectQuery, [facultyId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty not found'
      });
    }

    const currentPhoto = results[0].ProfilePhoto;

    if (currentPhoto) {
      // Extract filename from URL
      const filename = path.basename(currentPhoto);
      const filePath = path.join(uploadDir, filename);

      // Delete file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      }
    }

    // Update database to remove profile photo URL
    const updateQuery = `UPDATE faculty SET ProfilePhoto = NULL WHERE FacultyID = ?`;
    await db.execute(updateQuery, [facultyId]);

    console.log(`✅ Faculty profile photo deleted for faculty ${facultyId}`);

    res.json({
      success: true,
      message: 'Faculty profile photo deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting faculty profile photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete faculty profile photo',
      details: error.message
    });
  }
});

module.exports = router;

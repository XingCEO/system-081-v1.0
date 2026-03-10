const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveUploadDirectory } = require('../utils/uploads');

const router = express.Router();
const uploadDirectory = resolveUploadDirectory();

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${uuidv4()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.mimetype)) {
      callback(new HttpError(400, '僅支援 JPG、PNG、GIF、WEBP 圖片格式。'));
      return;
    }

    callback(null, true);
  }
});

router.post(
  '/',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請先選擇要上傳的圖片。'
      });
    }

    return res.json({
      success: true,
      data: {
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`
      }
    });
  }
);

module.exports = router;

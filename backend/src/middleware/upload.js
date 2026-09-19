import multer from 'multer';

// Use memory storage so we can access file.buffer directly for cryptographic hashing
const storage = multer.memoryStorage();

// File size limit: 50MB for forensic demonstration
export const evidenceUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

import multer from 'multer';

// Use MemoryStorage so file buffers can be directly streamed to Cloudinary and parsed by pdfExtractor
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max limit
  }
});

export default upload;

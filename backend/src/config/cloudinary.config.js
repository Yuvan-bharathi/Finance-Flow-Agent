import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.js';

/**
 * Cloudinary v2 Client Configuration
 * Uses Cloudinary credentials from environment configuration.
 */
cloudinary.config({
  cloud_name: config.storage.cloudinary.cloudName,
  api_key: config.storage.cloudinary.apiKey,
  api_secret: config.storage.cloudinary.apiSecret,
  secure: true
});

/**
 * Uploads an in-memory file buffer directly to Cloudinary.
 * 
 * @param {Buffer} fileBuffer - The binary buffer of the uploaded file
 * @param {string} fileName - Original filename
 * @param {string} folder - Target Cloudinary folder
 * @returns {Promise<{ secure_url: string, public_id: string, bytes: number, format: string }>}
 */
export const uploadBufferToCloudinary = (fileBuffer, fileName = 'document.pdf', folder = 'financeflow_documents') => {
  return new Promise((resolve, reject) => {
    const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${cleanName}_${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto', // Handles PDF, DOCX, images, etc.
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;

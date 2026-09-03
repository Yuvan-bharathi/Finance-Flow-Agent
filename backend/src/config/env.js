import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Module: Config / Environment Variables
 * Purpose: Loads and exports environment variables from .env file.
 * 
 * Called by:
 * - server.js
 * - db.js
 * - tokenHelper.js
 * - groq.config.js
 * 
 * Data flow:
 * .env File ➔ dotenv.config() ➔ process.env ➔ Exported config object
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    url: process.env.DATABASE_URL || process.env.MYSQL_URL || '',
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'financeflow_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    ssl: (process.env.DB_SSL === 'true' ||
          process.env.DB_HOST?.includes('tidbcloud.com') ||
          process.env.DB_HOST?.includes('aivencloud.com') ||
          process.env.DATABASE_URL?.includes('ssl') ||
          process.env.MYSQL_URL?.includes('ssl') ||
          (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
      ? { rejectUnauthorized: false }
      : undefined
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieSecret: process.env.COOKIE_SECRET || 'fallback_cookie_secret'
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    provider: process.env.STORAGE_PROVIDER || 'cloudinary',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 's6nrfj9n',
      apiKey: process.env.CLOUDINARY_API_KEY || '515879427875558',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '2u-xoR7c98MH7Qkur392yScc5gw',
      url: process.env.CLOUDINARY_URL || 'cloudinary://515879427875558:2u-xoR7c98MH7Qkur392yScc5gw@s6nrfj9n'
    }
  },
  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
  },
  agents: {
    autoTriggerPipeline: process.env.AUTO_TRIGGER_PIPELINE !== 'false',
    precheckThreshold: parseInt(process.env.RECONCILIATION_PRECHECK_THRESHOLD || '85', 10),
    maxBulkCases: parseInt(process.env.MAX_BULK_CASES || '50', 10),
    maxSelectedCases: parseInt(process.env.MAX_SELECTED_CASES || '20', 10),
    maxConcurrentRuns: parseInt(process.env.MAX_CONCURRENT_AGENT_RUNS || '5', 10)
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'nyuvanbharathi@gmail.com',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Finance Flow AI <nyuvanbharathi@gmail.com>',
    resendApiKey: process.env.RESEND_API_KEY || '',
    brevoApiKey: process.env.BREVO_API_KEY || ''
  }
};

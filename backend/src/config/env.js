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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'financeflow_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
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
    provider: process.env.STORAGE_PROVIDER || 'local'
  },
  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
  }
};

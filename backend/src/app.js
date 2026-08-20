import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import loanRoutes from './routes/loan.routes.js';
import repaymentRoutes from './routes/repayment.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reconciliationRoutes from './routes/reconciliation.routes.js';
import auditRoutes from './routes/audit.routes.js';
import riskRoutes from './routes/risk.routes.js';
import collectionRoutes from './routes/collection.routes.js';
import documentRoutes from './routes/document.routes.js';

/**
 * Express Application Setup
 * 
 * Configures middleware:
 * - CORS (Cross-Origin Resource Sharing for React frontend)
 * - JSON body parser
 * - URL-encoded parser
 * - Cookie parser (for HTTP-only auth token cookies)
 * - Static folder serving (for uploaded documents)
 * - Swagger UI documentation (/api-docs)
 * - Route mounts
 * - Centralized Error Handler
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. CORS Configuration
app.use(cors({
  origin: config.cors.clientUrl,
  credentials: true, // Allows HTTP-only cookies to pass cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cookie Parser
app.use(cookieParser(config.jwt.cookieSecret));

// 4. Static Files (Uploads folder)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// 5. Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 6. Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    name: 'FinanceFlow AI Backend API',
    swagger_docs: 'http://localhost:5000/api-docs',
    timestamp: new Date().toISOString()
  });
});

// 7. API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reconciliations', reconciliationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/documents', documentRoutes);

// 7. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// 8. Centralized Error Handling Middleware
app.use(errorHandler);

export default app;

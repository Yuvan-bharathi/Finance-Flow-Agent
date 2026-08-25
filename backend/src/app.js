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
import agentControlRoutes from './routes/agentControl.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import assistantRoutes from './routes/assistant.routes.js';

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

// 1. CORS Configuration (Allows Vercel production frontend and local dev)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://finance-flow-agent.vercel.app',
  config.cors.clientUrl
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || config.cors.clientUrl === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow incoming web preview requests
    }
  },
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
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #4f46e5; padding: 12px 0; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #4f46e5; font-weight: 800; font-family: sans-serif; }
    .swagger-ui .scheme-container { background: #f8fafc; border-radius: 12px; box-shadow: none; padding: 16px; }
    .swagger-ui .btn.authorize { background-color: #4f46e5; border-color: #4f46e5; color: #fff; border-radius: 8px; font-weight: 700; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
    .swagger-ui .opblock.opblock-post { background: rgba(79, 70, 229, 0.04); border-color: #6366f1; }
    .swagger-ui .opblock.opblock-get { background: rgba(16, 185, 129, 0.04); border-color: #10b981; }
    .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.04); border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.04); border-color: #ef4444; }
  `,
  customSiteTitle: "FinanceFlow AI — Enterprise API Documentation"
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

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
app.use('/api/agents', agentControlRoutes);
app.use('/api/portfolio', portfolioRoutes);          // Agent 5: Portfolio Analytics
app.use('/api/notifications', notificationRoutes);  // Agent 6: Notification & Escalation
app.use('/api/settings', settingsRoutes);            // User & System Settings
app.use('/api/assistant', assistantRoutes);          // AI Financial Copilot

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

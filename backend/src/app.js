import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { correlationMiddleware } from './middleware/correlation.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';

import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import healthRoutes from './routes/health.routes.js';

// Route Modules
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
import anomalyRoutes from './routes/anomaly.routes.js';

/**
 * Express Application Setup (Phase 4 Enterprise Edition)
 * 
 * Configures enterprise middleware:
 * - Distributed Correlation ID Interceptor (X-Correlation-ID)
 * - Structured Request/Response Observability Logger
 * - CORS (Cross-Origin Resource Sharing for React frontend & PWA)
 * - JSON & URL-encoded body parsers
 * - Cookie parser (for HTTP-only auth token cookies)
 * - Static folder serving (for uploaded documents)
 * - Swagger OpenAPI documentation (/api-docs)
 * - Versioned API Routing (/api/v1 and /api)
 * - Centralized Error Handler with Correlation ID logging
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Correlation ID Interceptor (Mounted First to stamp all requests)
app.use(correlationMiddleware);

// 2. Structured Request Observability Logger
app.use(requestLogger);

// 3. CORS Configuration (Allows Vercel production frontend and local dev)
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
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'Correlation-ID',
    'Idempotency-Key',
    'X-Idempotency-Key'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Idempotency-Key',
    'X-Cache-Lookup'
  ]
}));

// 4. Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Cookie Parser
app.use(cookieParser(config.jwt.cookieSecret));

// 6. Static Files (Uploads folder)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// 7. Swagger API Documentation
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

// Interactive Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Raw OpenAPI 3.0 JSON specification
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root Gateway Liveness Handler (handles HEAD / and GET / for Render / Cloud Uptime health checks)
app.all('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    name: 'FinanceFlow AI Enterprise Backend API',
    version: '1.7.0',
    documentation: '/api-docs',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// 8. Health & Observability Probe Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// Apply General Rate Limiter to API Gateways
app.use('/api', apiRateLimiter);

// 9. Register Route Handlers (Both /api/v1 and legacy /api for full backwards compatibility)
const registerRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/companies`, companyRoutes);
  app.use(`${prefix}/loans`, loanRoutes);
  app.use(`${prefix}/repayments`, repaymentRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/reconciliations`, reconciliationRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/risk`, riskRoutes);
  app.use(`${prefix}/collections`, collectionRoutes);
  app.use(`${prefix}/documents`, documentRoutes);
  app.use(`${prefix}/agents`, agentControlRoutes);
  app.use(`${prefix}/portfolio`, portfolioRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
  app.use(`${prefix}/assistant`, assistantRoutes);
  app.use(`${prefix}/anomaly`, anomalyRoutes);
};

// Mount versioned and root API gateways
registerRoutes('/api/v1');
registerRoutes('/api');

// 10. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    correlationId: req.correlationId || 'N/A'
  });
});

// 11. Centralized Error Handling Middleware
app.use(errorHandler);

export default app;

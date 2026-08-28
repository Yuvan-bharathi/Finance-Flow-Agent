import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger & OpenAPI 3.0.3 Configuration Specification (Phase 6)
 *
 * Provides automated interactive API documentation accessible at `/api-docs`
 * and raw OpenAPI JSON specification at `/api-docs.json`.
 *
 * Security Schemes Configured:
 * 1. BearerAuth: JWT Bearer Token in `Authorization: Bearer <token>`
 * 2. CorrelationIdAuth: `X-Correlation-ID` header for distributed tracing
 * 3. IdempotencyKeyAuth: `Idempotency-Key` header for financial mutation deduplication
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FinanceFlow AI — Enterprise REST API & Multi-Agent Platform',
      version: '1.6.0',
      description: `
### FinanceFlow AI Core Financial Operations & Multi-Agent Orchestrator API

Welcome to the interactive OpenAPI documentation for FinanceFlow AI.
This API powers:
- **Autonomous Payment Ingestion & Reconciliation** (Agent 1)
- **Credit Risk Assessment & Borrower Scoring** (Agent 2)
- **Automated Collection Notice Generation** (Agent 3)
- **Legal Contract & Document Intelligence** (Agent 4)
- **Portfolio Health & Collection Analytics** (Agent 5)
- **Real-Time SLA Breach & Escalation Governance** (Agent 6)
- **Multi-Agent Pipeline Orchestration & Priority Queue Engine**
- **Financial ACID Settlements, Idempotency & Immutable Regulatory Audit Trails**

---

### Authentication & Authorization (PBAC)
- Most mutating endpoints require a valid JWT passed in the \`Authorization: Bearer <token>\` header or HTTP-only cookie.
- Fine-grained capabilities are guarded by Permission-Based Access Control (\`requirePermission\`).
      `,
      contact: {
        name: 'FinanceFlow Engineering & Platform Architecture Team',
        url: 'https://github.com/Yuvan-bharathi/Finance-Flow-Agent'
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      },
      {
        url: 'https://finance-flow-agent-1.onrender.com',
        description: 'Production Cloud Deployment (Render)'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JSON Web Token (JWT) acquired from \`/api/v1/auth/login\`.'
        },
        CorrelationIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Correlation-ID',
          description: 'Unique distributed transaction trace ID (Format: \`FF-YYYYMMDD-<uuid8>\`).'
        },
        IdempotencyKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'Idempotency-Key',
          description: 'Unique client-generated UUID to guarantee financial mutation idempotency.'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing, invalid, or expired.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Unauthorized: Missing or invalid authentication token.' },
                  correlation_id: { type: 'string', example: 'FF-20260825-a1b2c3d4' }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'User lacks the required PBAC permission for this action.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Forbidden: Insufficient privileges for this financial operation.' },
                  correlation_id: { type: 'string', example: 'FF-20260825-a1b2c3d4' }
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Too many requests. Client rate limit exceeded.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Too many requests. Please try again in 45 seconds.' },
                  correlation_id: { type: 'string', example: 'FF-20260825-a1b2c3d4' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/routes/health.routes.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinanceFlow AI — Enterprise API Documentation',
      version: '1.0.0',
      description: 'Agentic AI Repayment & Financial Operations Platform API documentation covering Authentication, Ingestion, Multi-Agent Suite (Agents 1-4), Settlement Gate, and Compliance Audit Logs.'
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);

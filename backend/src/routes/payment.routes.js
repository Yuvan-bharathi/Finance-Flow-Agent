import { Router } from 'express';
import {
  ingestPayment,
  ingestMockBankDeposit,
  getPayments,
  getPaymentById
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Payment Routes
 * Base Path: /api/payments
 * 
 * Endpoints:
 * - POST /api/payments/ingest            (Admin, Manager, Accountant) - Section 17 Ingestion API
 * - POST /api/payments/mock-bank-deposit (Admin, Manager, Accountant) - Dummy Bank API Simulator Endpoint
 * - GET  /api/payments                  (Authenticated - All roles)
 * - GET  /api/payments/:id              (Authenticated - All roles)
 */

const router = Router();

router.use(authenticate);

// Section 17 API: Manual raw payment intake with duplicate check & case creation
router.post('/ingest', authorize(['admin', 'manager', 'accountant']), ingestPayment);

// Dummy Bank API Simulator Endpoint (for testing via Postman / UI)
router.post('/mock-bank-deposit', authorize(['admin', 'manager', 'accountant']), ingestMockBankDeposit);

router.get('/', getPayments);
router.get('/:id', getPaymentById);

export default router;

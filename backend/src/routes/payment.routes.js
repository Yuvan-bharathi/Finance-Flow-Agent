import { Router } from 'express';
import {
  ingestPayment,
  getPayments,
  getPaymentById,
  ingestMockBankDeposit
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Payment Ingestion Routes
 * Base path: /api/payments
 */
const router = Router();

router.use(authenticate);

// Ingest payments (Restricted to non-viewer operational roles)
router.post('/ingest', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), ingestPayment);

// Mock bank deposit simulation
router.post('/mock-bank-deposit', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant']), ingestMockBankDeposit);

// Read payments (All authenticated roles)
router.get('/', getPayments);
router.get('/:id', getPaymentById);

export default router;

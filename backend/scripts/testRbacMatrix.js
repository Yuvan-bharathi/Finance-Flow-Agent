import pool from '../src/config/db.js';
import { authorize } from '../src/middleware/rbac.middleware.js';

async function testRbacMatrix() {
  console.log('=============================================================');
  console.log('🛡️ FinanceFlow AI — Full RBAC Permission Matrix Test');
  console.log('=============================================================\n');

  const testCases = [
    { role: 'owner', route: 'POST /api/portfolio/analyze', allowed: ['owner', 'super_admin', 'admin', 'manager'] },
    { role: 'super_admin', route: 'PUT /api/settings/active-model', allowed: ['owner', 'super_admin'] },
    { role: 'admin', route: 'PUT /api/settings/active-model', allowed: ['owner', 'super_admin'] },
    { role: 'manager', route: 'POST /api/companies', allowed: ['owner', 'super_admin', 'admin', 'manager'] },
    { role: 'senior_accountant', route: 'POST /api/reconciliations/approve', allowed: ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant'] },
    { role: 'accountant', route: 'POST /api/reconciliations/approve', allowed: ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant'] },
    { role: 'accountant', route: 'POST /api/payments/ingest', allowed: ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant'] },
    { role: 'viewer', route: 'POST /api/payments/ingest', allowed: ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant'] },
    { role: 'viewer', route: 'GET /api/risk/assess/1', allowed: ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant', 'accountant'] },
    { role: 'viewer', route: 'POST /api/portfolio/analyze', allowed: ['owner', 'super_admin', 'admin', 'manager'] },
    { role: 'viewer', route: 'POST /api/notifications/escalate', allowed: ['owner', 'super_admin', 'admin', 'manager'] },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const middleware = authorize(tc.allowed);
    const mockReq = { user: { role_name: tc.role } };
    let allowedByMiddleware = false;
    let deniedMessage = '';

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        deniedMessage = data.message;
      }
    };

    const mockNext = () => {
      allowedByMiddleware = true;
    };

    middleware(mockReq, mockRes, mockNext);

    const expectedAllowed = tc.allowed.includes(tc.role);
    const success = allowedByMiddleware === expectedAllowed;

    if (success) {
      passed++;
      console.log(`✅ [${tc.role.toUpperCase()}] ${tc.route} ➔ ${allowedByMiddleware ? 'ALLOWED' : 'DENIED (403)'} (Matches Spec)`);
    } else {
      failed++;
      console.log(`❌ [${tc.role.toUpperCase()}] ${tc.route} ➔ Mismatch! Expected ${expectedAllowed ? 'ALLOWED' : 'DENIED'}, got ${allowedByMiddleware ? 'ALLOWED' : 'DENIED'}`);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`📊 Test Summary: ${passed} Passed | ${failed} Failed`);
  console.log(`=============================================================\n`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

testRbacMatrix();

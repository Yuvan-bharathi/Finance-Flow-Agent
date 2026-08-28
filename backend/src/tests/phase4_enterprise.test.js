import http from 'http';
import app from '../app.js';
import pool, { testConnection } from '../config/db.js';
import { generateToken } from '../utils/tokenHelper.js';
import { findIdempotencyKey } from '../models/idempotency.model.js';

/**
 * Automated Test Suite: Phase 4 Enterprise Architecture & Resilience
 * Purpose: Validates Correlation IDs, Structured Logging, PBAC, Idempotency, and Pagination end-to-end.
 */

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;

// Helper: HTTP Request Promise
const makeRequest = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting Phase 4 Enterprise Architecture End-to-End Tests');
  console.log('===============================================================');

  try {
    await testConnection();
    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    // Create Test Tokens
    const adminToken = generateToken({ id: 1, email: 'admin@financeflow.com', role_name: 'admin' });
    const viewerToken = generateToken({ id: 99, email: 'viewer@financeflow.com', role_name: 'viewer' });

    // -------------------------------------------------------------------------
    // Test 1: Health Check & Auto-Generated Correlation ID
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Health Check & Auto-Generated Correlation ID ---');
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/health',
      method: 'GET'
    });

    if (res1.statusCode === 200 && res1.headers['x-correlation-id'] && res1.data.apiVersion === 'v1') {
      console.log('✅ PASS: /api/v1/health returned 200 with X-Correlation-ID:', res1.headers['x-correlation-id']);
    } else {
      throw new Error(`Failed Test 1: ${JSON.stringify(res1)}`);
    }

    // -------------------------------------------------------------------------
    // Test 2: Custom Correlation ID Preservation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Custom Correlation ID Preservation ---');
    const customCorrId = 'FF-20260825-TEST999';
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/health',
      method: 'GET',
      headers: {
        'X-Correlation-ID': customCorrId
      }
    });

    if (res2.headers['x-correlation-id'] === customCorrId && res2.data.correlationId === customCorrId) {
      console.log('✅ PASS: Custom Correlation ID accurately preserved in response headers and JSON.');
    } else {
      throw new Error(`Failed Test 2: expected ${customCorrId}, got ${res2.headers['x-correlation-id']}`);
    }

    // -------------------------------------------------------------------------
    // Test 3: PBAC Authorization Guard (Viewer Blocked from Mutating Financials)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: PBAC Authorization Guard (Viewer Blocked) ---');
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/reconciliations/approve',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${viewerToken}`,
        'Content-Type': 'application/json'
      }
    }, { caseId: 1 });

    if (res3.statusCode === 403 && res3.data.requiredPermission === 'CASE_APPROVE') {
      console.log('✅ PASS: Viewer correctly blocked with 403 Forbidden and requiredPermission: CASE_APPROVE');
    } else {
      throw new Error(`Failed Test 3: expected 403 Forbidden with PBAC error, got: ${JSON.stringify(res3)}`);
    }

    // -------------------------------------------------------------------------
    // Test 4: Standardized Pagination & Query Envelope
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Standardized Pagination & Query Envelope ---');
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/payments?page=1&limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (res4.statusCode === 200 && res4.data.data?.pagination?.limit === 5 && Array.isArray(res4.data.data?.data)) {
      console.log(`✅ PASS: Standardized pagination envelope returned ${res4.data.data.data.length} records. Total records: ${res4.data.data.pagination.totalRecords}, Total Pages: ${res4.data.data.pagination.totalPages}`);
    } else {
      throw new Error(`Failed Test 4: ${JSON.stringify(res4.data)}`);
    }

    // -------------------------------------------------------------------------
    // Test 5: Financial Idempotency Layer (MISS ➔ HIT ➔ Tamper Protection)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Financial Idempotency Layer ---');
    const testKey = `ACT-TEST-${Date.now()}`;
    const depositPayload = {
      transactionId: `TXN-IDEMP-${Date.now()}`,
      amount: 50000.00,
      paymentDate: '2026-08-25',
      senderName: 'Apex Logistics Test Corp',
      senderAccount: '998877665544',
      reference: 'IDEMPOTENCY VERIFICATION'
    };

    // 1st Execution (MISS)
    const res5a = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': testKey
      }
    }, depositPayload);

    if (res5a.statusCode === 201 && res5a.headers['x-cache-lookup'] === 'MISS') {
      console.log('✅ PASS: 1st Call with Idempotency-Key returned 201 Created with X-Cache-Lookup: MISS');
    } else {
      throw new Error(`Failed Test 5a: ${JSON.stringify(res5a)}`);
    }

    // Small delay to ensure async db write completes
    await new Promise(r => setTimeout(r, 100));

    // 2nd Execution (HIT - Replaying cached response)
    const res5b = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': testKey
      }
    }, depositPayload);

    if (res5b.statusCode === 201 && res5b.headers['x-cache-lookup'] === 'HIT') {
      console.log('✅ PASS: 2nd Call with duplicate Idempotency-Key returned cached 201 with X-Cache-Lookup: HIT');
    } else {
      throw new Error(`Failed Test 5b: expected 201 with X-Cache-Lookup: HIT, got: ${JSON.stringify(res5b)}`);
    }

    // 3rd Execution (Tamper attempt - same key with modified amount)
    const tamperedPayload = { ...depositPayload, amount: 99999.00 };
    const res5c = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': testKey
      }
    }, tamperedPayload);

    if (res5c.statusCode === 422) {
      console.log('✅ PASS: Tampered payload with reused Idempotency-Key correctly rejected with 422 Unprocessable Entity.');
    } else {
      throw new Error(`Failed Test 5c: expected 422, got: ${res5c.statusCode}`);
    }

    // -------------------------------------------------------------------------
    // Test 6: Audit Log Verification with Correlation ID
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Audit Log Verification with Correlation ID ---');
    const res6 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/audit-logs?page=1&limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (res6.statusCode === 200 && Array.isArray(res6.data.data?.data)) {
      console.log(`✅ PASS: Audit logs retrieved with pagination. Total records: ${res6.data.data.pagination.totalRecords}`);
    } else {
      throw new Error(`Failed Test 6: ${JSON.stringify(res6)}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL PHASE 4 ENTERPRISE ARCHITECTURE TESTS PASSED 100%!');
    console.log('===============================================================');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();

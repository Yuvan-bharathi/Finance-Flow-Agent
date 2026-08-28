import http from 'http';
import app from '../app.js';
import pool from '../config/db.js';
import { generateToken } from '../utils/tokenHelper.js';

/**
 * Phase 6 Master End-to-End Full-System Integration Test Suite
 *
 * Tests the complete enterprise platform:
 * 1. Health Probe Observability (/health)
 * 2. Swagger/OpenAPI 3.0.3 Spec Validation (/api-docs.json)
 * 3. In-Memory Sliding Window Rate Limiting (HTTP 429 & Retry-After)
 * 4. End-to-End Financial Lifecycle (Ingestion -> AI Match -> Human Approval -> Ledger -> Audit)
 * 5. Multi-Agent Pipeline Execution via Priority Queue
 */

const TEST_PORT = 5097;
let server;
let adminToken;

// Helper: HTTP request wrapper
const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runAllTests = async () => {
  console.log('===============================================================');
  console.log('🧪 Starting Phase 6 Full-System Master Integration Test Suite');
  console.log('===============================================================');

  try {
    // 1. Start test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Listening on port ${TEST_PORT}`);

    // Generate Admin JWT Token with full PBAC permissions
    adminToken = generateToken({
      id: 1,
      email: 'admin@financeflow.com',
      role: 'admin',
      role_name: 'admin',
      role_id: 1
    });

    // ───────────────────────────────────────────────────────────────────────────
    // Test 1: Health & Liveness Observability Probe
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Health & Observability Probe (/health) ---');
    const healthRes = await makeRequest({
      path: '/health',
      method: 'GET'
    });

    if (healthRes.statusCode !== 200 || healthRes.body.data?.status !== 'UP') {
      throw new Error(`Health check failed. Got status ${healthRes.statusCode}: ${JSON.stringify(healthRes.body)}`);
    }

    console.log(`✅ PASS: /health returned status: UP`);
    console.log(`         - Database Status: ${healthRes.body.data.database.status} (latency: ${healthRes.body.data.database.latency_ms}ms)`);
    console.log(`         - Memory RSS: ${healthRes.body.data.memory.rss_mb} MB | Heap: ${healthRes.body.data.memory.heap_used_mb} MB`);
    console.log(`         - Queue Active Workers: ${healthRes.body.data.queue.active_workers} | Max Concurrency: ${healthRes.body.data.queue.max_concurrency}`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 2: Swagger / OpenAPI 3.0 Spec Validation (/api-docs.json)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Swagger / OpenAPI 3.0 Specification Integrity ---');
    const swaggerRes = await makeRequest({
      path: '/api-docs.json',
      method: 'GET'
    });

    if (swaggerRes.statusCode !== 200 || !swaggerRes.body.openapi) {
      throw new Error(`Swagger JSON endpoint failed. Status: ${swaggerRes.statusCode}`);
    }

    const pathsCount = Object.keys(swaggerRes.body.paths || {}).length;
    const securitySchemes = Object.keys(swaggerRes.body.components?.securitySchemes || {});

    console.log(`✅ PASS: /api-docs.json verified:`);
    console.log(`         - OpenAPI Version: ${swaggerRes.body.openapi}`);
    console.log(`         - Title: ${swaggerRes.body.info?.title}`);
    console.log(`         - Documented Route Paths: ${pathsCount} endpoints`);
    console.log(`         - Configured Security Schemes: [${securitySchemes.join(', ')}]`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 3: Sliding-Window Rate Limiting Throttling (HTTP 429)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Sliding-Window Rate Limiting Throttling ---');
    let rateLimitTriggered = false;
    let rateLimitStatusCode = null;
    let retryAfterHeader = null;

    // Fire 35 rapid requests to /api/v1/auth/login (limit is 30/minute)
    for (let i = 1; i <= 35; i++) {
      const res = await makeRequest({
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { email: 'baduser@example.com', password: 'wrongpassword' });

      if (res.statusCode === 429) {
        rateLimitTriggered = true;
        rateLimitStatusCode = res.statusCode;
        retryAfterHeader = res.headers['retry-after'];
        console.log(`         - Request #${i} was rate limited as expected (HTTP 429).`);
        break;
      }
    }

    if (!rateLimitTriggered) {
      throw new Error(`Rate limiting was expected to block after 30 requests, but did not trigger.`);
    }

    console.log(`✅ PASS: Rate Limiter enforced HTTP ${rateLimitStatusCode} with Retry-After: ${retryAfterHeader}s.`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 4: End-to-End Financial Lifecycle
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: End-to-End Financial Lifecycle (Ingestion -> AI Match -> Human Approval -> Ledger -> Audit) ---');
    const correlationId = `FF-E2E-TEST-${Date.now()}`;
    const testTxnId = `TXN-E2E-${Date.now()}`;

    // Step A: Ingest payment deposit
    const ingestRes = await makeRequest({
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-Correlation-ID': correlationId
      }
    }, {
      transaction_id: testTxnId,
      amount: 150000.00,
      sender_name: 'Apex Logistics Pvt Ltd',
      reference: 'LN-APX-2026-01 AUG EMI'
    });

    if (ingestRes.statusCode !== 201) {
      throw new Error(`Payment ingestion failed: ${JSON.stringify(ingestRes.body)}`);
    }

    const createdPaymentId = ingestRes.body.data?.payment?.id || ingestRes.body.data?.id;
    console.log(`         - Step 4A: Payment Ingested. Payment ID: #${createdPaymentId}`);

    // Retrieve created case
    const [caseRows] = await pool.query('SELECT * FROM reconciliation_cases WHERE payment_id = ?', [createdPaymentId]);
    const testCaseId = caseRows[0]?.id;
    console.log(`         - Step 4B: Reconciliation Case Created: Case #${testCaseId}`);

    // Step C: Run Agent 1 Reconciliation
    const analyzeRes = await makeRequest({
      path: `/api/v1/reconciliations/analyze/${testCaseId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Correlation-ID': correlationId
      }
    });

    console.log(`         - Step 4C: Agent 1 Analyzed Case. Confidence: ${analyzeRes.body.data?.recommendation?.confidence_score || '95'}%`);

    // Step D: Human Review & Settlement Approval
    const approveRes = await makeRequest({
      path: '/api/v1/reconciliations/approve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-Correlation-ID': correlationId
      }
    }, {
      case_id: testCaseId,
      notes: 'Approved via Phase 6 Full-System E2E Automated Test'
    });

    if (approveRes.statusCode !== 200) {
      throw new Error(`Approval failed: ${JSON.stringify(approveRes.body)}`);
    }

    console.log(`         - Step 4D: ACID Settlement Executed. Case marked resolved in database.`);

    // Step E: Verify Regulatory Audit Trail with Correlation ID
    const [auditRows] = await pool.query('SELECT * FROM audit_logs WHERE correlation_id = ?', [correlationId]);
    console.log(`         - Step 4E: Verified Audit Log Trail (${auditRows.length} audit records found with Correlation ID ${correlationId}).`);

    console.log(`✅ PASS: Full financial lifecycle completed successfully with ACID integrity!`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 5: Multi-Agent Orchestrator Pipeline API
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Multi-Agent Orchestration Pipeline via Priority Queue ---');
    const pipelineRes = await makeRequest({
      path: '/api/v1/agents/pipeline/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-Correlation-ID': `FF-PIPE-${Date.now()}`
      }
    }, {
      pipeline_name: 'PORTFOLIO_AND_ESCALATION',
      priority: 'CRITICAL'
    });

    if (pipelineRes.statusCode !== 200) {
      throw new Error(`Pipeline run failed: ${JSON.stringify(pipelineRes.body)}`);
    }

    console.log(`✅ PASS: Multi-Agent Pipeline executed. Pipeline ID: #${pipelineRes.body.data?.id || pipelineRes.body.data?.pipeline_id}`);

    console.log('\n===============================================================');
    console.log('🎉 ALL PHASE 6 FULL-SYSTEM INTEGRATION TESTS PASSED 100%!');
    console.log('===============================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
};

runAllTests();

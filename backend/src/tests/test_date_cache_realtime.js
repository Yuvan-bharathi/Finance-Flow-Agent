import http from 'http';
import { io as ClientIO } from '../../../frontend/node_modules/socket.io-client/build/esm/index.js';
import app from '../app.js';
import pool from '../config/db.js';
import { initSocket } from '../config/socket.js';
import { generateToken } from '../utils/tokenHelper.js';
import { cacheService } from '../services/cache.service.js';

/**
 * Automated Integration Test Suite: Date Filter, In-Memory Caching & Real-Time WebSocket Synchronization
 */

const TEST_PORT = 5097;
let server;
let adminToken;
let socketClient;

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          durationMs: duration
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 Starting Date Filter, Cache & Real-Time Sync Integration Tests');
  console.log('================================================================');

  try {
    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Listening on port ${TEST_PORT}`);

    adminToken = generateToken({
      id: 1,
      email: 'admin@financeflow.com',
      role: 'admin',
      role_name: 'admin',
      role_id: 1
    });

    // Flush cache before starting
    cacheService.flushAll();

    // ───────────────────────────────────────────────────────────────────────────
    // Test 1: Date Filter Boundary Query
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Date Filter Boundary Query ---');
    const dateRes = await makeRequest({
      path: '/api/v1/payments?startDate=2024-01-01&endDate=2026-12-31',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (dateRes.statusCode !== 200 || !Array.isArray(dateRes.body.data)) {
      throw new Error(`Date filter query failed: ${JSON.stringify(dateRes.body)}`);
    }
    console.log(`✅ PASS: Date filter query succeeded. Found ${dateRes.body.data.length} records within bounds.`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 2: In-Memory Cache HIT / MISS & Latency Measurement
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: In-Memory Cache HIT / MISS Latency ---');
    cacheService.flushAll();

    // First request: Cache MISS
    const missRes = await makeRequest({
      path: '/api/v1/payments?limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (missRes.headers['x-cache'] !== 'MISS') {
      throw new Error(`Expected X-Cache: MISS on first request, got: ${missRes.headers['x-cache']}`);
    }
    console.log(`✅ PASS: Request 1 returned X-Cache: MISS (${missRes.durationMs}ms)`);

    // Second request: Cache HIT
    const hitRes = await makeRequest({
      path: '/api/v1/payments?limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (hitRes.headers['x-cache'] !== 'HIT') {
      throw new Error(`Expected X-Cache: HIT on second request, got: ${hitRes.headers['x-cache']}`);
    }
    console.log(`✅ PASS: Request 2 returned X-Cache: HIT (${hitRes.durationMs}ms - served from memory)`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 3: Tag-Based Invalidation on Mutation
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Tag-Based Cache Invalidation ---');
    const newTxnId = `TXN-CACHE-TEST-${Date.now()}`;
    const ingestRes = await makeRequest({
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      transactionId: newTxnId,
      amount: 75000.00,
      paymentDate: '2026-08-25',
      senderName: 'Cache Invalidation Test Corp',
      senderAccount: '998877665544',
      reference: 'CACHE INVAL TEST'
    });

    if (ingestRes.statusCode !== 201) {
      throw new Error(`Payment ingestion failed: ${JSON.stringify(ingestRes.body)}`);
    }

    // Third request: should now be a Cache MISS because tag 'payments' was invalidated
    const postInvalidateRes = await makeRequest({
      path: '/api/v1/payments?limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (postInvalidateRes.headers['x-cache'] !== 'MISS') {
      throw new Error(`Expected X-Cache: MISS after mutation invalidation, got: ${postInvalidateRes.headers['x-cache']}`);
    }
    console.log(`✅ PASS: Mutation purged 'payments' cache tag. Next query successfully fetched fresh data (X-Cache: MISS).`);

    // ───────────────────────────────────────────────────────────────────────────
    // Test 4: Near-Real-Time WebSocket Event Delivery
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Near-Real-Time WebSocket Event Delivery ---');
    socketClient = ClientIO(`http://127.0.0.1:${TEST_PORT}`, {
      transports: ['websocket']
    });

    await new Promise((resolve) => socketClient.on('connect', resolve));
    console.log('⚡ Socket test client connected to gateway');

    const eventReceivedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket event timed out after 3000ms')), 3000);
      socketClient.on('PAYMENT_INGESTED', (eventData) => {
        clearTimeout(timer);
        resolve(eventData);
      });
    });

    // Ingest another payment to trigger WebSocket event
    const wsTxnId = `TXN-WS-TEST-${Date.now()}`;
    await makeRequest({
      path: '/api/v1/payments/ingest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      transactionId: wsTxnId,
      amount: 125000.00,
      paymentDate: '2026-08-25',
      senderName: 'WebSocket Live Sync Corp',
      senderAccount: '112233445566',
      reference: 'LIVE EVENT TEST'
    });

    const receivedEvent = await eventReceivedPromise;
    if (!receivedEvent || !receivedEvent.payment || receivedEvent.payment.transaction_id !== wsTxnId) {
      throw new Error(`Received invalid event payload: ${JSON.stringify(receivedEvent)}`);
    }
    console.log(`✅ PASS: WebSocket received PAYMENT_INGESTED event in near-real-time:`);
    console.log(`         - Transaction ID: ${receivedEvent.payment.transaction_id}`);
    console.log(`         - Amount: ₹${receivedEvent.payment.amount}`);
    console.log(`         - Timestamp: ${receivedEvent.timestamp}`);

    console.log('\n================================================================');
    console.log('🎉 ALL DATE FILTER, CACHE & REAL-TIME SYNC TESTS PASSED 100%!');
    console.log('================================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (socketClient) socketClient.disconnect();
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
};

runTests();

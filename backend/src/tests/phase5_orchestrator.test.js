import http from 'http';
import app from '../app.js';
import pool, { testConnection } from '../config/db.js';
import { generateToken } from '../utils/tokenHelper.js';
import { agentQueue, PRIORITY } from '../services/agentQueue.service.js';
import { runPipelineWorkflow, PIPELINE_WORKFLOWS } from '../services/orchestrator.service.js';
import { findPipelineWithSteps } from '../models/pipeline.model.js';

/**
 * Automated Test Suite: Phase 5 Multi-Agent Orchestration & Priority Queue
 */

let server;
const PORT = 5098;

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
  console.log('🧪 Starting Phase 5 Multi-Agent Orchestrator End-to-End Tests');
  console.log('===============================================================');

  try {
    await testConnection();
    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    const adminToken = generateToken({ id: 1, email: 'admin@financeflow.com', role_name: 'admin' });

    // -------------------------------------------------------------------------
    // Test 1: Priority Queue Scheduling & Ordering Test
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Priority Queue Scheduling & Precedence ---');
    const executionOrder = [];

    // Pause queue dispatch briefly by filling concurrency with dummy tasks
    const blockerPromises = [];
    let unblock;
    const blockerGate = new Promise(r => { unblock = r; });

    // Add 5 concurrency blockers
    for (let i = 0; i < 5; i++) {
      blockerPromises.push(
        agentQueue.addJob({
          name: `Blocker-${i}`,
          priority: PRIORITY.MEDIUM,
          task: async () => { await blockerGate; return 'unblocked'; }
        })
      );
    }

    // Now queue a LOW job and then a CRITICAL job
    const lowPromise = agentQueue.addJob({
      name: 'Batch-Nightly-Scan',
      priority: PRIORITY.LOW,
      task: async () => {
        executionOrder.push('LOW_JOB');
        return 'low_done';
      }
    });

    const criticalPromise = agentQueue.addJob({
      name: 'User-Urgent-Trigger',
      priority: PRIORITY.CRITICAL,
      task: async () => {
        executionOrder.push('CRITICAL_JOB');
        return 'critical_done';
      }
    });

    // Release the blockers
    unblock();
    await Promise.all(blockerPromises);
    await Promise.all([criticalPromise, lowPromise]);

    if (executionOrder[0] === 'CRITICAL_JOB' && executionOrder[1] === 'LOW_JOB') {
      console.log('✅ PASS: CRITICAL priority job was dispatched ahead of LOW priority job as expected.');
    } else {
      throw new Error(`Priority ordering failed. Execution order was: ${JSON.stringify(executionOrder)}`);
    }

    // -------------------------------------------------------------------------
    // Test 2: Multi-Agent Workflow State Machine Execution
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Multi-Agent Workflow State Machine ---');
    await pool.execute(`UPDATE reconciliation_cases SET status = 'open' WHERE id = 20;`);
    
    const pipelineResult = await runPipelineWorkflow({
      workflow: PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK,
      contextData: { caseId: 20, companyId: 1 },
      userId: 1,
      priority: PRIORITY.CRITICAL,
      correlationId: 'FF-PHASE5-TEST001'
    });

    if (pipelineResult && pipelineResult.status === 'completed' && Array.isArray(pipelineResult.steps)) {
      console.log(`✅ PASS: Multi-Agent Pipeline #${pipelineResult.id} completed in ${pipelineResult.duration_ms}ms.`);
      console.log(`         Steps executed: ${pipelineResult.steps.length}`);
      pipelineResult.steps.forEach(s => {
        console.log(`         - Step #${s.step_index}: ${s.agent_name} -> [${s.status}] (${s.duration_ms}ms, ${s.tokens_used} tok)`);
      });
    } else {
      throw new Error(`Pipeline execution failed: ${JSON.stringify(pipelineResult)}`);
    }

    // -------------------------------------------------------------------------
    // Test 3: HTTP API POST /api/v1/agents/pipeline/run
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: HTTP REST API Pipeline Trigger ---');
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/agents/pipeline/run',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'FF-PHASE5-HTTP-TEST'
      }
    }, {
      workflow: 'PORTFOLIO_AND_ESCALATION',
      contextData: {}
    });

    if (res3.statusCode === 200 && res3.data.data?.status === 'completed') {
      console.log(`✅ PASS: POST /api/v1/agents/pipeline/run succeeded. Pipeline ID: #${res3.data.data.id}`);
    } else {
      throw new Error(`Failed Test 3: ${JSON.stringify(res3)}`);
    }

    // -------------------------------------------------------------------------
    // Test 4: Historical Executions List & Step Inspector API
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Historical Executions & Step Inspector API ---');
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/agents/pipeline/executions?page=1&limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (res4.statusCode === 200 && Array.isArray(res4.data.data?.data) && res4.data.data.data.length > 0) {
      console.log(`✅ PASS: Retrieved ${res4.data.data.data.length} historical pipeline execution records.`);
      
      // Test single execution inspector
      const firstId = res4.data.data.data[0].id;
      const res4Detail = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/agents/pipeline/executions/${firstId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (res4Detail.statusCode === 200 && Array.isArray(res4Detail.data.data?.steps)) {
        console.log(`✅ PASS: GET /api/v1/agents/pipeline/executions/${firstId} returned full nested step tree (${res4Detail.data.data.steps.length} steps).`);
      } else {
        throw new Error(`Failed to fetch pipeline detail: ${JSON.stringify(res4Detail)}`);
      }
    } else {
      throw new Error(`Failed Test 4: ${JSON.stringify(res4)}`);
    }

    // -------------------------------------------------------------------------
    // Test 5: Queue Status Telemetry API
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Queue Status Telemetry API ---');
    const res5 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/agents/queue/status',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (res5.statusCode === 200 && typeof res5.data.data?.maxConcurrency === 'number') {
      console.log(`✅ PASS: Queue status returned maxConcurrency: ${res5.data.data.maxConcurrency}, active: ${res5.data.data.activeJobsCount}, total completed: ${res5.data.data.stats?.totalCompleted}`);
    } else {
      throw new Error(`Failed Test 5: ${JSON.stringify(res5)}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL PHASE 5 MULTI-AGENT ORCHESTRATOR TESTS PASSED 100%!');
    console.log('===============================================================');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Phase 5 Test Suite Failed:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();

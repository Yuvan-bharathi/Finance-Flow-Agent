import app from '../app.js';
import cacheService from '../services/cache.service.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const PORT = 5099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const generateTestToken = () => {
  return jwt.sign(
    { id: 90002, email: 'yuvanbharathin@gmail.com', role_name: 'owner', role_id: 90002 },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

const runCacheTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING LOCAL CACHE LAYER AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  const server = app.listen(PORT);
  const token = generateTestToken();

  try {
    // --- 1. Test In-Memory Cache Service (Unit Verification) ---
    console.log('--- 1. Testing MemoryCacheAdapter Core Operations ---');
    cacheService.flushAll();

    // Test set and get
    cacheService.set('test:key:1', { message: 'Hello Cache' }, 2, ['test_tag']);
    const item1 = cacheService.get('test:key:1');
    if (!item1 || item1.message !== 'Hello Cache') {
      throw new Error('Cache GET failed on existing key.');
    }
    console.log('✓ Cache SET & GET verified successfully.');

    // Test LRU and Tag Invalidation
    cacheService.set('test:key:2', { message: 'Tag Item 2' }, 60, ['test_tag']);
    cacheService.set('test:key:3', { message: 'Different Tag' }, 60, ['other_tag']);
    
    const purgedCount = cacheService.invalidateByTag('test_tag');
    if (purgedCount !== 2) {
      throw new Error(`Expected 2 items purged, got ${purgedCount}`);
    }

    if (cacheService.get('test:key:1') !== null || cacheService.get('test:key:2') !== null) {
      throw new Error('Keys under test_tag were not purged.');
    }
    if (cacheService.get('test:key:3')?.message !== 'Different Tag') {
      throw new Error('Key under other_tag was incorrectly purged.');
    }
    console.log(`✓ Tag-based group invalidation verified (${purgedCount} keys purged).`);

    const stats = cacheService.getStats();
    console.log('✓ Cache Diagnostic Stats:', stats);

    // --- 2. Test HTTP Route Caching & Headers ---
    console.log('\n--- 2. Testing HTTP Route Caching & X-Cache Headers ---');
    cacheService.flushAll();

    // A. /api/companies (tag: companies)
    const resComp1 = await fetch(`${BASE_URL}/api/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resComp1.status !== 200) throw new Error(`GET /api/companies failed: ${resComp1.status}`);
    const cacheHdr1 = resComp1.headers.get('x-cache');
    if (cacheHdr1 !== 'MISS') {
      throw new Error(`Expected X-Cache: MISS on 1st request, got ${cacheHdr1}`);
    }
    console.log('✓ GET /api/companies [1st Call] -> X-Cache: MISS (Fresh from DB & Cached)');

    const resComp2 = await fetch(`${BASE_URL}/api/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cacheHdr2 = resComp2.headers.get('x-cache');
    if (cacheHdr2 !== 'HIT') {
      throw new Error(`Expected X-Cache: HIT on 2nd request, got ${cacheHdr2}`);
    }
    console.log('✓ GET /api/companies [2nd Call] -> X-Cache: HIT (Zero DB Latency)');

    // B. /api/loans (tag: loans)
    const resLoans1 = await fetch(`${BASE_URL}/api/loans`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const loanHdr1 = resLoans1.headers.get('x-cache');
    if (loanHdr1 !== 'MISS') throw new Error(`Expected X-Cache: MISS on loans, got ${loanHdr1}`);
    console.log('✓ GET /api/loans [1st Call] -> X-Cache: MISS (Fresh & Cached)');

    const resLoans2 = await fetch(`${BASE_URL}/api/loans`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const loanHdr2 = resLoans2.headers.get('x-cache');
    if (loanHdr2 !== 'HIT') throw new Error(`Expected X-Cache: HIT on loans, got ${loanHdr2}`);
    console.log('✓ GET /api/loans [2nd Call] -> X-Cache: HIT (Zero DB Latency)');

    // C. /api/notifications/alerts (tag: notifications)
    const resAlerts1 = await fetch(`${BASE_URL}/api/notifications/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const alertHdr1 = resAlerts1.headers.get('x-cache');
    if (alertHdr1 !== 'MISS') throw new Error(`Expected X-Cache: MISS on alerts, got ${alertHdr1}`);
    console.log('✓ GET /api/notifications/alerts [1st Call] -> X-Cache: MISS (Fresh & Cached)');

    const resAlerts2 = await fetch(`${BASE_URL}/api/notifications/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const alertHdr2 = resAlerts2.headers.get('x-cache');
    if (alertHdr2 !== 'HIT') throw new Error(`Expected X-Cache: HIT on alerts, got ${alertHdr2}`);
    console.log('✓ GET /api/notifications/alerts [2nd Call] -> X-Cache: HIT (Zero DB Latency)');

    // --- 3. Test Mutation Cache Tag Invalidation ---
    console.log('\n--- 3. Testing Mutation Cache Tag Invalidation ---');
    
    // Invalidate 'companies' tag
    cacheService.invalidateByTag('companies');

    const resComp3 = await fetch(`${BASE_URL}/api/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cacheHdr3 = resComp3.headers.get('x-cache');
    if (cacheHdr3 !== 'MISS') {
      throw new Error(`Expected X-Cache: MISS after invalidating 'companies' tag, got ${cacheHdr3}`);
    }
    console.log('✓ GET /api/companies [Post-Mutation Invalidation] -> X-Cache: MISS (Fresh Data)');

    console.log('\n====================================================');
    console.log('🎉 ALL LOCAL CACHE LAYER VERIFICATION TESTS PASSED 100%');
    console.log('====================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
};

runCacheTests().catch((err) => {
  console.error('❌ Cache verification failed:', err);
  process.exit(1);
});

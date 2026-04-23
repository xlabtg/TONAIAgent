/**
 * Load test script.
 *
 * Verifies that:
 *   1. The rate limiter triggers (trade endpoint: 10 req/min → 429 after 10)
 *   2. The body-size guard triggers (413 for > 1 MiB Content-Length)
 *
 * Usage: node scripts/load-test.mjs [BASE_URL]
 *   BASE_URL defaults to http://localhost:3000
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';

async function get(path) {
  return fetch(`${BASE_URL}${path}`);
}

async function post(path, body, headers = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ── Rate limiter test ─────────────────────────────────────────────────────────

console.log('\n--- Rate Limiter Test (trade endpoint: limit=10/min) ---');
let passed = 0;
let blocked = 0;
for (let i = 0; i < 15; i++) {
  const res = await post('/agents', {
    userId: 'load_test_user',
    name: `Agent ${i}`,
    strategy: 'trend',
    budgetTon: 100,
    riskLevel: 'low',
  });
  if (res.status === 202) passed++;
  else if (res.status === 429) blocked++;
  else console.log(`  Request ${i}: unexpected status ${res.status}`);
}
console.log(`  Passed: ${passed}, Blocked (429): ${blocked}`);
if (blocked > 0) {
  console.log('  [OK] Rate limiter triggered correctly.');
} else {
  console.warn('  [WARN] Rate limiter did not trigger — check config.');
}

// ── Body-size guard test ──────────────────────────────────────────────────────

console.log('\n--- Body-Size Guard Test (Content-Length > 1 MiB → 413) ---');
const oversizeRes = await fetch(`${BASE_URL}/agents`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': String(2 * 1024 * 1024),
  },
  body: '{}',
});
if (oversizeRes.status === 413) {
  console.log('  [OK] Body-size guard returned 413 as expected.');
} else {
  console.warn(`  [WARN] Expected 413, got ${oversizeRes.status}.`);
}

// ── Health check ──────────────────────────────────────────────────────────────

console.log('\n--- Health Check ---');
const healthRes = await get('/healthz');
const healthBody = await healthRes.json();
console.log(`  /healthz → ${healthRes.status}`, healthBody);

console.log('\nLoad test complete.\n');

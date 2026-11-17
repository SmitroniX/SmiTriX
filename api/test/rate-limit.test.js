import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, recordAuthFailure, recordAuthSuccess, sanitizeInput } from '../rate-limit.js';

test('rateLimiter permits requests within quota and throttles beyond limit', () => {
  const ip = '192.168.1.100';
  const key = 'POST /api/sync';

  // 60 requests should pass
  for (let i = 0; i < 60; i++) {
    const res = checkRateLimit({}, key, ip, 'u1');
    assert.equal(res.limited, false);
  }

  // 61st should be limited
  const blocked = checkRateLimit({}, key, ip, 'u1');
  assert.equal(blocked.limited, true);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.retryAfter >= 1);
});

test('bruteForceTracker enforces lockout after consecutive failures', () => {
  const ip = '10.0.0.55';
  const key = 'POST /api/login/verify';

  for (let i = 0; i < 7; i++) {
    recordAuthFailure(ip);
  }
  let res = checkRateLimit({}, key, ip, null);
  assert.equal(res.limited, false);

  // 8th failure triggers lockout
  recordAuthFailure(ip);
  res = checkRateLimit({}, key, ip, null);
  assert.equal(res.limited, true);
  assert.equal(res.reason, 'brute-force lockout');
  assert.ok(res.retryAfter > 0);

  // Success resets
  recordAuthSuccess(ip);
  res = checkRateLimit({}, key, ip, null);
  assert.equal(res.limited, false);
});

test('sanitizeInput strips prototype pollution keys and null bytes', () => {
  const malicious = JSON.parse('{"__proto__":{"polluted":true},"user":"test\\u0000name","details":{"constructor":"bad","age":25}}');
  const clean = sanitizeInput(malicious);

  assert.equal(clean.polluted, undefined);
  assert.equal(clean.user, 'testname');
  assert.equal(clean.details.constructor, undefined); // stripped prototype key
  assert.equal(clean.details.age, 25);
});

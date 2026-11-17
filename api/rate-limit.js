/**
 * Enterprise Application Security & Rate Limiting Module for SmiTriX.
 * Multi-tier sliding window rate limiter, brute-force mitigation, and input sanitizer.
 */

// In-memory sliding window counters: bucketKey -> { timestamps: number[] }
const buckets = new Map();
// Brute-force failure tracking: ip -> { count: number, lockedUntil: number }
const bruteForceTracker = new Map();

// Periodic prune to prevent memory leaks (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    b.timestamps = b.timestamps.filter(t => now - t < 60000);
    if (!b.timestamps.length) buckets.delete(key);
  }
  for (const [ip, b] of bruteForceTracker) {
    if (b.lockedUntil < now && b.count <= 0) bruteForceTracker.delete(ip);
  }
}, 60000).unref();

/**
 * Checks sliding-window rate limit for a given request.
 */
export function checkRateLimit(req, routeKey, ip, userId) {
  const now = Date.now();
  const clientKey = ip || 'unknown-peer';

  // 1. Brute-Force Lockout Check on Auth Routes
  const isAuthRoute = routeKey.includes('/api/login') || routeKey.includes('/api/register');
  if (isAuthRoute) {
    const bf = bruteForceTracker.get(clientKey);
    if (bf && bf.lockedUntil > now) {
      const retryAfter = Math.ceil((bf.lockedUntil - now) / 1000);
      return {
        limited: true,
        reason: 'brute-force lockout',
        retryAfter,
        status: 429
      };
    }
  }

  // 2. Determine Route Rate Limit Tier
  let limit = 120; // default requests per minute
  let windowMs = 60000;
  let bucketId = `${routeKey}:${clientKey}`;

  if (isAuthRoute) {
    limit = 30; // 30 auth attempts per minute
  } else if (routeKey.includes('/api/coach')) {
    limit = 35; // 35 coach inference checks per minute
    bucketId = userId ? `coach:${userId}` : bucketId;
  } else if (routeKey.includes('/api/sync')) {
    limit = 60; // 60 sync operations per minute
    bucketId = userId ? `sync:${userId}` : bucketId;
  } else if (routeKey.includes('/api/push')) {
    limit = 40; // 40 push actions per minute
    bucketId = userId ? `push:${userId}` : bucketId;
  }

  // 3. Sliding Window Verification
  let bucket = buckets.get(bucketId);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(bucketId, bucket);
  }

  // Remove timestamps outside window
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      limited: true,
      reason: 'rate limit exceeded',
      retryAfter,
      remaining: 0,
      total: limit,
      status: 429
    };
  }

  bucket.timestamps.push(now);
  return {
    limited: false,
    remaining: limit - bucket.timestamps.length,
    total: limit
  };
}

/**
 * Record a failed authentication attempt to guard against brute-force attacks.
 */
export function recordAuthFailure(ip) {
  if (!ip) return;
  const now = Date.now();
  const entry = bruteForceTracker.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  // If > 8 failed attempts within tracking period, lock IP out for 10 minutes
  if (entry.count >= 8) {
    entry.lockedUntil = now + 10 * 60 * 1000;
  }
  bruteForceTracker.set(ip, entry);
}

/**
 * Clear failure counter on successful authentication.
 */
export function recordAuthSuccess(ip) {
  if (ip && bruteForceTracker.has(ip)) {
    bruteForceTracker.delete(ip);
  }
}

/**
 * Deep sanitization for incoming JSON payloads to prevent prototype pollution and control char injection.
 */
export function sanitizeInput(obj) {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Strip dangerous null bytes
      return obj.replace(/\0/g, '');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  const clean = Object.create(null);
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    clean[k] = sanitizeInput(v);
  }
  return clean;
}

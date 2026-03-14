/**
 * Cross-Runtime Hash Verification Script
 *
 * Computes SHA-256 hashes of canonical contract JSON and outputs them.
 * Run this script under Node, Bun, and Deno to verify identical output.
 *
 * Usage:
 *   node   --experimental-specifier-resolution=node -e "import('./packages/core/scripts/cross-runtime-verify.mjs')"
 *   bun    packages/core/scripts/cross-runtime-verify.mjs
 *   deno run --allow-read packages/core/scripts/cross-runtime-verify.mjs
 *
 * Expected: All three runtimes produce identical hash lines.
 */

// Use Node's built-in crypto (available in Node, Bun, and Deno)
import { createHash } from 'node:crypto';

/** Minimal canonical serialization (mirrors @jurisgenie/core/serialization). */
function canonicalize(obj) {
    const clone = JSON.parse(JSON.stringify(obj));
    const cleaned = removeField(clone, 'hash');
    const stripped = stripNulls(cleaned);
    const sorted = sortKeys(stripped);
    const normalized = normalizeStrings(sorted);
    return JSON.stringify(normalized);
}

function removeField(obj, field) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((i) => removeField(i, field));
    const out = {};
    for (const key of Object.keys(obj)) {
        if (key === field) continue;
        out[key] = removeField(obj[key], field);
    }
    return out;
}

function stripNulls(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripNulls);
    const out = {};
    for (const key of Object.keys(obj)) {
        const v = stripNulls(obj[key]);
        if (v !== undefined) out[key] = v;
    }
    return out;
}

function sortKeys(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    const out = {};
    for (const key of Object.keys(obj).sort()) {
        out[key] = sortKeys(obj[key]);
    }
    return out;
}

function normalizeStrings(obj) {
    if (typeof obj === 'string') return obj.normalize('NFC');
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(normalizeStrings);
    const out = {};
    for (const key of Object.keys(obj)) {
        out[key.normalize('NFC')] = normalizeStrings(obj[key]);
    }
    return out;
}

function sha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}

// ─── Test Vectors ────────────────────────────────────────────────────────────

const vectors = [
    {
        name: 'empty object',
        input: {},
    },
    {
        name: 'simple contract',
        input: {
            id: 'contract-001',
            name: 'test-contract',
            display_name: 'Test Contract',
            version: { major: 1, minor: 0, patch: 0 },
            parties: [
                { id: 'party-a', role: 'BUYER', name: 'Alice', jurisdiction: { country: 'US' }, provenance: 'HUMAN_AUTHORED', schema_version: { major: 1, minor: 0, patch: 0 } },
                { id: 'party-b', role: 'SELLER', name: 'Bob', jurisdiction: { country: 'US' }, provenance: 'HUMAN_AUTHORED', schema_version: { major: 1, minor: 0, patch: 0 } },
            ],
            clauses: [{
                id: 'clause-1',
                type: 'PAYMENT_TERMS',
                title: 'Payment',
                text: 'Pay within 30 days',
                obligations: [],
                rights: [],
                conditions: [],
                language: 'en-US',
                provenance: 'HUMAN_AUTHORED',
                schema_version: { major: 1, minor: 0, patch: 0 },
            }],
            governing_law: { country: 'US' },
            effective_date: '2025-01-01T00:00:00.000Z',
            state: 'ACTIVE',
            state_history: [],
            provenance: 'HUMAN_AUTHORED',
            hash: '',
            schema_version: { major: 1, minor: 0, patch: 0 },
            engine_version: { major: 1, minor: 0, patch: 0 },
        },
    },
    {
        name: 'unicode NFC normalization',
        input: {
            text: 'caf\u0065\u0301',  // NFD decomposed é
            name: 'stra\u00DFe',       // German sharp s
        },
    },
    {
        name: 'null stripping',
        input: {
            a: 1,
            b: null,
            c: { d: null, e: 'hello' },
        },
    },
    {
        name: 'shuffled keys',
        input: {
            z: 1,
            a: 2,
            m: { q: 3, b: 4 },
        },
    },
];

// ─── Execute ─────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  JurisGenie Cross-Runtime Hash Verification                ║');
console.log('╠══════════════════════════════════════════════════════════════╣');

const runtime = typeof Deno !== 'undefined'
    ? `Deno ${Deno.version.deno}`
    : typeof Bun !== 'undefined'
        ? `Bun ${Bun.version}`
        : `Node ${process.version}`;

console.log(`║  Runtime: ${runtime.padEnd(49)}║`);
console.log('╠══════════════════════════════════════════════════════════════╣');

const results = [];
for (const v of vectors) {
    const canonical = canonicalize(v.input);
    const hash = sha256(canonical);
    results.push({ name: v.name, hash });
    console.log(`║  ${v.name.padEnd(28)} ${hash.substring(0, 24)}...  ║`);
}

console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Expected Hashes (must be identical across runtimes):       ║');
console.log('╠══════════════════════════════════════════════════════════════╣');

for (const r of results) {
    console.log(`HASH|${r.name}|${r.hash}`);
}

console.log('╚══════════════════════════════════════════════════════════════╝');

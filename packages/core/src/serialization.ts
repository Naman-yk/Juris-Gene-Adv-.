/**
 * Canonical Serialization for JurisGenie
 *
 * Implements the deterministic serialization algorithm specified in Phase B:
 * 1. Deep clone the object
 * 2. Remove the "hash" field (excluded from its own computation)
 * 3. Strip null/undefined fields recursively
 * 4. Sort all object keys recursively (Unicode codepoint order)
 * 5. NFC-normalize all string values
 * 6. JSON.stringify with no whitespace
 *
 * This produces a canonical JSON string that is identical across platforms,
 * enabling deterministic SHA-256 hashing.
 */

/**
 * Produces a canonical JSON string from any object.
 * The output is deterministic: same input always produces same output.
 *
 * @param obj - The object to canonicalize. Must be JSON-serializable.
 * @returns A canonical JSON string with sorted keys, no nulls, NFC-normalized strings.
 */
export function canonicalize(obj: unknown): string {
    const clone = deepClone(obj);
    const cleaned = removeField(clone, 'hash');
    const stripped = stripNulls(cleaned);
    const sorted = sortKeys(stripped);
    const normalized = normalizeStrings(sorted);
    return JSON.stringify(normalized);
}

/**
 * Deep clones a value using structured clone semantics (JSON round-trip).
 * This is intentionally simple — no prototype chains, no functions, no symbols.
 *
 * @param value - Any JSON-serializable value
 * @returns A deep copy of the value
 */
export function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Recursively removes a named field from an object tree.
 *
 * @param obj - The object to modify
 * @param fieldName - The field name to remove at all levels
 * @returns The modified object (same reference)
 */
function removeField(obj: unknown, fieldName: string): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => removeField(item, fieldName));
    }

    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
        if (key === fieldName) {
            continue;
        }
        result[key] = removeField(record[key], fieldName);
    }
    return result;
}

/**
 * Recursively removes null and undefined values from an object tree.
 * Empty arrays are preserved (they are semantically meaningful).
 *
 * @param obj - The object to strip
 * @returns A new object with no null/undefined fields
 */
function stripNulls(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return undefined;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => stripNulls(item));
    }

    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
        const value = stripNulls(record[key]);
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Recursively sorts all object keys in Unicode codepoint order.
 * Array element order is preserved (position is semantic in contracts).
 *
 * @param obj - The object to sort
 * @returns A new object with sorted keys at every level
 */
function sortKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => sortKeys(item));
    }

    const record = obj as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(record).sort();
    for (const key of keys) {
        sorted[key] = sortKeys(record[key]);
    }
    return sorted;
}

/**
 * Recursively NFC-normalizes all string values.
 * This ensures that equivalent Unicode characters produce identical bytes.
 *
 * @param obj - The object to normalize
 * @returns A new object with all strings NFC-normalized
 */
function normalizeStrings(obj: unknown): unknown {
    if (typeof obj === 'string') {
        return obj.normalize('NFC');
    }

    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => normalizeStrings(item));
    }

    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
        result[key.normalize('NFC')] = normalizeStrings(record[key]);
    }
    return result;
}

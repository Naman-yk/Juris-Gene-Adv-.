/**
 * Inbound Request Schema Validation
 *
 * Validates ExecutionRequest structure before passing to the core engine.
 * Rejects malformed JSON at the adapter boundary — no invalid data
 * reaches the execution layer.
 *
 * PURE FUNCTION — no I/O.
 */

import {
    ExecutionRequest,
    CURRENT_SCHEMA_VERSION,
} from '@jurisgenie/core';

export interface ValidationFailure {
    readonly field: string;
    readonly message: string;
}

export class SchemaValidationError extends Error {
    public readonly failures: readonly ValidationFailure[];

    constructor(failures: ValidationFailure[]) {
        super(`Schema validation failed with ${failures.length} error(s): ${failures.map((f) => `${f.field}: ${f.message}`).join('; ')}`);
        this.name = 'SchemaValidationError';
        this.failures = failures;
    }
}

/**
 * Validates an inbound execution request before it reaches the engine.
 *
 * @param input - Raw JSON-parsed input (unknown type)
 * @returns Validated ExecutionRequest
 * @throws SchemaValidationError if validation fails
 */
export function validateInboundRequest(input: unknown): ExecutionRequest {
    const failures: ValidationFailure[] = [];

    if (input === null || input === undefined || typeof input !== 'object') {
        failures.push({ field: 'root', message: 'Request must be a non-null object' });
        throw new SchemaValidationError(failures);
    }

    const obj = input as Record<string, unknown>;

    // Contract validation
    if (!obj['contract'] || typeof obj['contract'] !== 'object') {
        failures.push({ field: 'contract', message: 'Missing or invalid contract object' });
    } else {
        const contract = obj['contract'] as Record<string, unknown>;
        if (!contract['id'] || typeof contract['id'] !== 'string') {
            failures.push({ field: 'contract.id', message: 'Contract id must be a non-empty string' });
        }
        if (!contract['name'] || typeof contract['name'] !== 'string') {
            failures.push({ field: 'contract.name', message: 'Contract name must be a non-empty string' });
        }
        if (!contract['state'] || typeof contract['state'] !== 'string') {
            failures.push({ field: 'contract.state', message: 'Contract state must be a string' });
        }
        if (!contract['schema_version'] || typeof contract['schema_version'] !== 'object') {
            failures.push({ field: 'contract.schema_version', message: 'Contract schema_version is required (object with major, minor, patch)' });
        } else {
            const sv = contract['schema_version'] as Record<string, unknown>;
            if (typeof sv['major'] !== 'number' || typeof sv['minor'] !== 'number' || typeof sv['patch'] !== 'number') {
                failures.push({ field: 'contract.schema_version', message: 'schema_version must have numeric major, minor, patch fields' });
            } else if (sv['major'] !== CURRENT_SCHEMA_VERSION.major) {
                failures.push({ field: 'contract.schema_version', message: `Expected major version ${CURRENT_SCHEMA_VERSION.major}, got ${sv['major']}` });
            }
        }
        if (!Array.isArray(contract['parties']) || contract['parties'].length === 0) {
            failures.push({ field: 'contract.parties', message: 'Contract must have at least one party' });
        }
        if (!Array.isArray(contract['clauses'])) {
            failures.push({ field: 'contract.clauses', message: 'Contract clauses must be an array' });
        }
    }

    // Event validation
    if (!obj['event'] || typeof obj['event'] !== 'object') {
        failures.push({ field: 'event', message: 'Missing or invalid event object' });
    } else {
        const event = obj['event'] as Record<string, unknown>;
        if (!event['id'] || typeof event['id'] !== 'string') {
            failures.push({ field: 'event.id', message: 'Event id must be a non-empty string' });
        }
        if (!event['type'] || typeof event['type'] !== 'string') {
            failures.push({ field: 'event.type', message: 'Event type must be a string' });
        }
        if (!event['contract_id'] || typeof event['contract_id'] !== 'string') {
            failures.push({ field: 'event.contract_id', message: 'Event contract_id must match contract' });
        }
    }

    // Context validation
    if (!obj['context'] || typeof obj['context'] !== 'object') {
        failures.push({ field: 'context', message: 'Missing or invalid execution context' });
    } else {
        const ctx = obj['context'] as Record<string, unknown>;
        if (!ctx['execution_date'] || typeof ctx['execution_date'] !== 'string') {
            failures.push({ field: 'context.execution_date', message: 'execution_date is required' });
        }
        if (!ctx['request_id'] || typeof ctx['request_id'] !== 'string') {
            failures.push({ field: 'context.request_id', message: 'request_id is required' });
        }
        if (!ctx['simulation'] || typeof ctx['simulation'] !== 'object') {
            failures.push({ field: 'context.simulation', message: 'simulation config is required' });
        }
    }

    if (failures.length > 0) {
        throw new SchemaValidationError(failures);
    }

    return input as ExecutionRequest;
}

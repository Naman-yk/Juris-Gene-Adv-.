/**
 * Structured Audit Logger
 *
 * Captures execution events in a structured, deterministic format.
 * Logged fields: request_id, execution_hash, previous_state, new_state, timestamp.
 *
 * The logger stores entries in-memory for testing and can be wired
 * to external sinks (console, file, remote) in production.
 */

import { ExecutionResult } from '@jurisgenie/core';

export interface AuditEntry {
    readonly request_id: string;
    readonly execution_hash: string;
    readonly previous_state: string;
    readonly new_state: string;
    readonly state_changed: boolean;
    readonly timestamp: string;
    readonly contract_id: string;
    readonly simulation: boolean;
    readonly penalties_count: number;
    readonly obligations_breached_count: number;
    readonly obligations_fulfilled_count: number;
}

export class AuditLogger {
    private readonly entries: AuditEntry[] = [];

    /**
     * Logs an execution result as a structured audit entry.
     *
     * @param result - The execution result to audit
     * @param timestamp - ISO-8601 timestamp (injected, not from clock)
     * @returns The created audit entry
     */
    log(result: ExecutionResult, timestamp?: string): AuditEntry {
        const entry: AuditEntry = {
            request_id: result.request_id,
            execution_hash: result.execution_hash,
            previous_state: result.previous_state,
            new_state: result.new_state,
            state_changed: result.state_changed,
            timestamp: timestamp ?? result.execution_date,
            contract_id: result.contract_id,
            simulation: result.simulation,
            penalties_count: result.penalties.length,
            obligations_breached_count: result.obligations_breached.length,
            obligations_fulfilled_count: result.obligations_fulfilled.length,
        };

        this.entries.push(entry);
        return entry;
    }

    /**
     * Gets all audit entries.
     */
    getEntries(): readonly AuditEntry[] {
        return [...this.entries];
    }

    /**
     * Gets audit entries for a specific contract.
     */
    getByContract(contractId: string): readonly AuditEntry[] {
        return this.entries.filter((e) => e.contract_id === contractId);
    }

    /**
     * Gets audit entries for a specific request.
     */
    getByRequestId(requestId: string): AuditEntry | undefined {
        return this.entries.find((e) => e.request_id === requestId);
    }

    /**
     * Returns the total number of audit entries.
     */
    get count(): number {
        return this.entries.length;
    }

    /**
     * Clears all audit entries.
     */
    clear(): void {
        this.entries.length = 0;
    }
}

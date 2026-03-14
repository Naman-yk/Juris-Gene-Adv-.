/**
 * Blockchain Adapter — Common Interface
 *
 * Defines the interface that all blockchain adapters implement.
 * Adapters are Layer 6 (Integration) — they perform I/O.
 */

import { ExecutionResult } from '@jurisgenie/core';

/** Blockchain transaction receipt. */
export interface BlockchainReceipt {
    readonly tx_hash: string;
    readonly block_number: number;
    readonly network: string;
    readonly timestamp: string;
    readonly status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}

/** Common interface for all blockchain adapters. */
export interface BlockchainAdapter {
    readonly network: string;

    /** Anchors a contract hash to the blockchain. */
    anchorHash(contractId: string, hash: string): Promise<BlockchainReceipt>;

    /** Anchors an execution result hash. */
    anchorExecution(executionResult: ExecutionResult): Promise<BlockchainReceipt>;

    /** Verifies a hash against the blockchain. */
    verifyHash(contractId: string, hash: string): Promise<boolean>;

    /** Gets the current connection status. */
    getStatus(): Promise<{ connected: boolean; network: string; latency_ms: number }>;
}

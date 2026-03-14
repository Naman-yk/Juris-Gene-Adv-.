/**
 * Corda Adapter — STUB
 */

import { ExecutionResult } from '@jurisgenie/core';
import { BlockchainAdapter, BlockchainReceipt } from './types';

export class CordaAdapter implements BlockchainAdapter {
    public readonly network = 'corda';

    async anchorHash(contractId: string, hash: string): Promise<BlockchainReceipt> {
        console.log(`[STUB] Corda: anchoring ${contractId} with hash ${hash.substring(0, 16)}...`);
        return {
            tx_hash: `corda-${'0'.repeat(58)}`,
            block_number: 0,
            network: this.network,
            timestamp: new Date().toISOString(),
            status: 'PENDING',
        };
    }

    async anchorExecution(executionResult: ExecutionResult): Promise<BlockchainReceipt> {
        return this.anchorHash(executionResult.contract_id, executionResult.execution_hash);
    }

    async verifyHash(_contractId: string, _hash: string): Promise<boolean> {
        return false;
    }

    async getStatus(): Promise<{ connected: boolean; network: string; latency_ms: number }> {
        return { connected: false, network: this.network, latency_ms: -1 };
    }
}

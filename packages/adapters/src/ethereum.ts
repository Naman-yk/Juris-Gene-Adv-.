/**
 * Ethereum Blockchain Adapter — STUB
 *
 * Structural implementation — no real chain calls.
 * Provides the interface for Ethereum-compatible hash anchoring.
 */

import { ExecutionResult } from '@jurisgenie/core';
import { BlockchainAdapter, BlockchainReceipt } from './types';

export class EthereumAdapter implements BlockchainAdapter {
    public readonly network = 'ethereum-mainnet';

    async anchorHash(contractId: string, hash: string): Promise<BlockchainReceipt> {
        console.log(`[STUB] Ethereum: anchoring ${contractId} with hash ${hash.substring(0, 16)}...`);
        return {
            tx_hash: `0x${'0'.repeat(64)}`,
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
        console.log('[STUB] Ethereum: hash verification not implemented');
        return false;
    }

    async getStatus(): Promise<{ connected: boolean; network: string; latency_ms: number }> {
        return { connected: false, network: this.network, latency_ms: -1 };
    }
}

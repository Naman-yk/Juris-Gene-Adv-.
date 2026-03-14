/**
 * Per-Contract Execution Lock
 *
 * Prevents concurrent execution on the same contract_id.
 * Uses a synchronous lock table (Map<contractId, boolean>).
 *
 * In a multi-process environment this would be replaced with
 * distributed locking (e.g., Redis SETNX). This implementation
 * is correct for single-process Node.js.
 */

export class ContractLockError extends Error {
    constructor(public readonly contractId: string) {
        super(`Contract ${contractId} is currently locked for execution`);
        this.name = 'ContractLockError';
    }
}

export class ContractLock {
    private readonly locks = new Map<string, { acquiredAt: number; requestId: string }>();

    /**
     * Acquires a lock for a contract.
     *
     * @param contractId - The contract to lock
     * @param requestId - The request acquiring the lock
     * @throws ContractLockError if already locked
     */
    acquire(contractId: string, requestId: string): void {
        if (this.locks.has(contractId)) {
            throw new ContractLockError(contractId);
        }
        this.locks.set(contractId, { acquiredAt: Date.now(), requestId });
    }

    /**
     * Releases a lock for a contract.
     *
     * @param contractId - The contract to unlock
     */
    release(contractId: string): void {
        this.locks.delete(contractId);
    }

    /**
     * Checks if a contract is currently locked.
     */
    isLocked(contractId: string): boolean {
        return this.locks.has(contractId);
    }

    /**
     * Gets lock info for a contract.
     */
    getLockInfo(contractId: string): { acquiredAt: number; requestId: string } | undefined {
        return this.locks.get(contractId);
    }

    /**
     * Executes a function while holding the contract lock.
     * Guarantees lock release even on exception.
     *
     * @param contractId - The contract to lock
     * @param requestId - The request acquiring the lock
     * @param fn - The function to execute under lock
     * @returns The result of fn
     */
    withLock<T>(contractId: string, requestId: string, fn: () => T): T {
        this.acquire(contractId, requestId);
        try {
            return fn();
        } finally {
            this.release(contractId);
        }
    }
}

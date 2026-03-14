/**
 * @jurisgenie/adapters — Public API
 */

export { type BlockchainAdapter, type BlockchainReceipt } from './types';
export { EthereumAdapter } from './ethereum';
export { FabricAdapter } from './fabric';
export { CordaAdapter } from './corda';
export { verifyBeforePersist, HashIntegrityError } from './hash-before-persist';
export { IdempotencyStore, withIdempotency } from './idempotency';
export { ContractLock, ContractLockError } from './contract-lock';
export { validateInboundRequest, SchemaValidationError, type ValidationFailure } from './schema-validation';
export { AuditLogger, type AuditEntry } from './audit-logger';
export { generateSigningKeyPair, signEvent, verifyEventSignature, extractNonRepudiationMetadata, SignatureVerificationError, type SignedEvent, type KeyPair } from './event-signature';
export { ReplayGuard, ReplayAttackError, type ReplayEntry } from './replay-guard';
export { AnchorStore, AnchorAdapter, type AnchorRecord, type AnchorVerification } from './anchor-adapter';

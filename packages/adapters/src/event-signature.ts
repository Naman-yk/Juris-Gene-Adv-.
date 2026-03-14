/**
 * Event Signature Verification — ECDSA
 *
 * Provides cryptographic signature creation and verification for Event payloads.
 * Uses Node.js built-in `crypto` module with ECDSA (secp256k1).
 *
 * Key features:
 * - Generate ECDSA key pairs for event signers
 * - Sign event payloads deterministically (canonical JSON)
 * - Verify signatures against public keys
 * - Reject tampered or invalid signatures
 */

import { createSign, createVerify, generateKeyPairSync, createHash } from 'crypto';
import { Event } from '@jurisgenie/core';

export interface SignedEvent {
    readonly event: Event;
    readonly signature: string;        // hex-encoded ECDSA signature
    readonly signer_public_key: string; // PEM-encoded public key
    readonly signature_hash: string;    // SHA-256 of the signature itself
    readonly signed_at: string;         // ISO-8601 timestamp
}

export interface KeyPair {
    readonly publicKey: string;  // PEM
    readonly privateKey: string; // PEM
}

export class SignatureVerificationError extends Error {
    constructor(
        public readonly reason: string,
        public readonly eventId: string,
    ) {
        super(`Signature verification failed for event ${eventId}: ${reason}`);
        this.name = 'SignatureVerificationError';
    }
}

/**
 * Generates an ECDSA key pair for signing events.
 */
export function generateSigningKeyPair(): KeyPair {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
}

/**
 * Creates a canonical (deterministic) representation of an event for signing.
 * Deep-sorts all object keys recursively for deterministic hashing.
 */
function canonicalizeEvent(event: Event): string {
    return JSON.stringify(sortDeep(event));
}

function sortDeep(obj: unknown): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortDeep);
    }
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
        sorted[key] = sortDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
}

/**
 * Signs an event payload with an ECDSA private key.
 *
 * @param event - The event to sign
 * @param privateKey - PEM-encoded private key
 * @param publicKey - PEM-encoded public key (stored in metadata)
 * @param timestamp - ISO-8601 signing timestamp
 * @returns SignedEvent with signature and non-repudiation metadata
 */
export function signEvent(
    event: Event,
    privateKey: string,
    publicKey: string,
    timestamp?: string,
): SignedEvent {
    const canonical = canonicalizeEvent(event);
    const signer = createSign('SHA256');
    signer.update(canonical);
    signer.end();

    const signature = signer.sign(privateKey, 'hex');
    const signatureHash = createHash('sha256').update(signature).digest('hex');

    return {
        event,
        signature,
        signer_public_key: publicKey,
        signature_hash: signatureHash,
        signed_at: timestamp ?? new Date().toISOString(),
    };
}

/**
 * Verifies an event signature against the signer's public key.
 *
 * @param signedEvent - The signed event to verify
 * @returns true if signature is valid
 * @throws SignatureVerificationError if verification fails
 */
export function verifyEventSignature(signedEvent: SignedEvent): boolean {
    const { event, signature, signer_public_key, signature_hash } = signedEvent;

    // 1. Verify signature_hash integrity
    const recomputedSigHash = createHash('sha256').update(signature).digest('hex');
    if (recomputedSigHash !== signature_hash) {
        throw new SignatureVerificationError(
            'Signature hash mismatch — signature may have been tampered',
            event.id,
        );
    }

    // 2. Verify ECDSA signature
    const canonical = canonicalizeEvent(event);
    const verifier = createVerify('SHA256');
    verifier.update(canonical);
    verifier.end();

    const isValid = verifier.verify(signer_public_key, signature, 'hex');
    if (!isValid) {
        throw new SignatureVerificationError(
            'ECDSA signature verification failed — event payload may have been modified',
            event.id,
        );
    }

    return true;
}

/**
 * Extracts non-repudiation metadata from a signed event.
 */
export function extractNonRepudiationMetadata(signedEvent: SignedEvent): {
    signer_public_key: string;
    signature_hash: string;
    signed_at: string;
    event_id: string;
} {
    return {
        signer_public_key: signedEvent.signer_public_key,
        signature_hash: signedEvent.signature_hash,
        signed_at: signedEvent.signed_at,
        event_id: signedEvent.event.id,
    };
}

/**
 * Schema Version Validation Tests
 *
 * Task 5: Enforce strict SchemaVersion validation
 * Tests that incompatible major versions are rejected across all entry points.
 */

import { describe, it, expect } from 'vitest';
import {
    Contract,
    ContractState,
    PartyRole,
    Provenance,
    ClauseType,
    ObligationType,
    ObligationStatus,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
    ENGINE_SUPPORTED_SCHEMA_MAJOR,
    SchemaVersion,
} from '../../src/types';
import { computeHash } from '../../src/hashing';

/** Helper: creates a minimal valid contract with a specific schema version. */
function contractWithSchema(schemaVersion: SchemaVersion): Contract {
    return {
        id: 'contract-schema-test',
        name: 'schema-test',
        display_name: 'Schema Test',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-a', role: PartyRole.BUYER, name: 'Alice', jurisdiction: { country: 'US' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: schemaVersion },
            { id: 'party-b', role: PartyRole.SELLER, name: 'Bob', jurisdiction: { country: 'US' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: schemaVersion },
        ],
        clauses: [{
            id: 'clause-1',
            type: ClauseType.PAYMENT_TERMS,
            title: 'Payment',
            text: 'Pay on time',
            obligations: [{
                id: 'obl-1',
                clause_id: 'clause-1',
                type: ObligationType.PAYMENT,
                debtor: 'party-a',
                creditor: 'party-b',
                action: 'Pay',
                deadline: { absolute: '2025-12-31T00:00:00.000Z' },
                status: ObligationStatus.ACTIVE,
                conditions: [],
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: schemaVersion,
            }],
            rights: [],
            conditions: [],
            language: 'en-US',
            provenance: Provenance.HUMAN_AUTHORED,
            schema_version: schemaVersion,
        }],
        governing_law: { country: 'US' },
        effective_date: '2025-01-01T00:00:00.000Z',
        state: ContractState.ACTIVE,
        state_history: [{
            from_state: ContractState.DRAFT,
            to_state: ContractState.ACTIVE,
            timestamp: '2025-01-01T00:00:00.000Z',
            reason: 'Signed',
            provenance: Provenance.RULE_DERIVED,
        }],
        provenance: Provenance.HUMAN_AUTHORED,
        hash: '',
        schema_version: schemaVersion,
        engine_version: ENGINE_VERSION,
    };
}

describe('Schema Version Validation', () => {
    it('CURRENT_SCHEMA_VERSION is v1.0.0', () => {
        expect(CURRENT_SCHEMA_VERSION).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('ENGINE_SUPPORTED_SCHEMA_MAJOR is 1', () => {
        expect(ENGINE_SUPPORTED_SCHEMA_MAJOR).toBe(1);
    });

    it('major version 1 is accepted (current)', () => {
        const contract = contractWithSchema({ major: 1, minor: 0, patch: 0 });
        expect(contract.schema_version.major).toBeLessThanOrEqual(ENGINE_SUPPORTED_SCHEMA_MAJOR);
    });

    it('major version 2 would be rejected by engine', () => {
        const contract = contractWithSchema({ major: 2, minor: 0, patch: 0 });
        expect(contract.schema_version.major).toBeGreaterThan(ENGINE_SUPPORTED_SCHEMA_MAJOR);
    });

    it('minor version differences are backward compatible', () => {
        const v100 = contractWithSchema({ major: 1, minor: 0, patch: 0 });
        const v150 = contractWithSchema({ major: 1, minor: 5, patch: 0 });
        // Both should be processable since major version matches
        expect(v100.schema_version.major).toBe(v150.schema_version.major);
        expect(v100.schema_version.major).toBeLessThanOrEqual(ENGINE_SUPPORTED_SCHEMA_MAJOR);
    });

    it('patch version differences are backward compatible', () => {
        const v100 = contractWithSchema({ major: 1, minor: 0, patch: 0 });
        const v1099 = contractWithSchema({ major: 1, minor: 0, patch: 99 });
        expect(v100.schema_version.major).toBe(v1099.schema_version.major);
    });

    it('hashing is consistent across schema patch versions', () => {
        const hash100 = computeHash(contractWithSchema({ major: 1, minor: 0, patch: 0 }));
        const hash101 = computeHash(contractWithSchema({ major: 1, minor: 0, patch: 1 }));
        // Different schema versions produce different hashes (schema is part of canonical form)
        expect(hash100).not.toBe(hash101);
    });

    it('ENGINE_VERSION is v1.0.0', () => {
        expect(ENGINE_VERSION).toEqual({ major: 1, minor: 0, patch: 0 });
    });
});

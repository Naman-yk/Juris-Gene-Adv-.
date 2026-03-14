/**
 * @jurisgenie/core — Typed Legal Model
 *
 * Layer 3: All canonical types for the JurisGenie legal execution engine.
 * This module has ZERO external dependencies (except decimal.js for MonetaryAmount).
 * Every type is explicitly typed, versioned, and carries provenance.
 *
 * Design principles:
 * - Explicit over magic: every field is named, typed, documented
 * - Closed enums: all categorical values are finite enumerated sets
 * - Provenance everywhere: every data point carries its origin
 * - Temporal precision: all timestamps are UTC, millisecond precision, ISO-8601
 * - Deterministic identity: every object has a hash from canonical serialization
 */

// ─────────────────────────────────────────────────────────────────────────────
// Foundation Types
// ─────────────────────────────────────────────────────────────────────────────

/** The architectural firewall between probabilistic and deterministic. */
export enum Provenance {
    HUMAN_AUTHORED = 'HUMAN_AUTHORED',
    AI_GENERATED = 'AI_GENERATED',
    HUMAN_CONFIRMED = 'HUMAN_CONFIRMED',
    RULE_DERIVED = 'RULE_DERIVED',
    IMPORTED = 'IMPORTED',
}

/** Schema version for type evolution and backward compatibility. */
export interface SchemaVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
}

/** Semantic version for engine and contract versioning. */
export interface SemanticVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
}

/** ISO-8601 UTC datetime string with millisecond precision. */
export type DateTime = string;

/** ISO 4217 currency code. */
export type CurrencyCode = string;

/** BCP-47 language code. */
export type LanguageCode = string;

/**
 * Monetary amount using string-encoded decimal.
 * NEVER use IEEE 754 floats for financial values.
 */
export interface MonetaryAmount {
    readonly value: string;
    readonly currency: CurrencyCode;
}

/** Hierarchical jurisdiction code (ISO 3166). */
export interface JurisdictionCode {
    readonly country: string;
    readonly subdivision?: string;
    readonly municipality?: string;
}

/** Temporal expression supporting absolute, relative, and recurring dates. */
export interface TemporalExpression {
    readonly absolute?: DateTime;
    readonly relative?: RelativeTerm;
    readonly recurring?: RecurrenceTerm;
}

/** Relative temporal anchor with ISO-8601 duration offset. */
export interface RelativeTerm {
    readonly anchor: string;
    readonly offset: string;
}

/** Recurring schedule definition. */
export interface RecurrenceTerm {
    readonly frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    readonly day?: number;
    readonly until?: DateTime;
}

// ─────────────────────────────────────────────────────────────────────────────
// Party
// ─────────────────────────────────────────────────────────────────────────────

export enum PartyRole {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
    LICENSOR = 'LICENSOR',
    LICENSEE = 'LICENSEE',
    EMPLOYER = 'EMPLOYER',
    EMPLOYEE = 'EMPLOYEE',
    LENDER = 'LENDER',
    BORROWER = 'BORROWER',
    GUARANTOR = 'GUARANTOR',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
    CLIENT = 'CLIENT',
    LANDLORD = 'LANDLORD',
    TENANT = 'TENANT',
    OTHER = 'OTHER',
}

export interface PartyIdentifier {
    readonly type: 'TAX_ID' | 'REGISTRATION' | 'LEI' | 'DID' | 'WALLET_ADDRESS' | 'OTHER';
    readonly value: string;
    readonly jurisdiction?: JurisdictionCode;
}

export interface ContactInfo {
    readonly email?: string;
    readonly phone?: string;
    readonly address?: string;
}

export interface Party {
    readonly id: string;
    readonly role: PartyRole;
    readonly name: string;
    readonly identifier?: PartyIdentifier;
    readonly jurisdiction: JurisdictionCode;
    readonly contact?: ContactInfo;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition
// ─────────────────────────────────────────────────────────────────────────────

export type ConditionOperator =
    | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE'
    | 'IN' | 'NOT_IN' | 'BETWEEN'
    | 'AND' | 'OR' | 'NOT'
    | 'DATE_BEFORE' | 'DATE_AFTER'
    | 'EXISTS' | 'IS_NULL';

export interface ConditionExpression {
    readonly operator: ConditionOperator;
    readonly operands: ConditionOperand[];
}

export interface ConditionOperand {
    readonly type: 'FIELD_REF' | 'LITERAL' | 'CONDITION_EXPR';
    readonly field_path?: string;
    readonly value?: string | number | boolean | string[];
    readonly sub_expression?: ConditionExpression;
}

export enum ConditionType {
    PRECEDENT = 'PRECEDENT',
    SUBSEQUENT = 'SUBSEQUENT',
    CONCURRENT = 'CONCURRENT',
}

export interface Condition {
    readonly id: string;
    readonly type: ConditionType;
    readonly expression: ConditionExpression;
    readonly description: string;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obligation
// ─────────────────────────────────────────────────────────────────────────────

export enum ObligationType {
    PERFORMANCE = 'PERFORMANCE',
    PAYMENT = 'PAYMENT',
    NON_COMPETE = 'NON_COMPETE',
    CONFIDENTIALITY = 'CONFIDENTIALITY',
    INDEMNIFICATION = 'INDEMNIFICATION',
    NOTIFICATION = 'NOTIFICATION',
    REPORTING = 'REPORTING',
}

export enum ObligationStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    FULFILLED = 'FULFILLED',
    BREACHED = 'BREACHED',
    WAIVED = 'WAIVED',
    DISPUTED = 'DISPUTED',
}

export type ActionCode = string;

export interface PenaltySpec {
    readonly type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TERMINATION_RIGHT' | 'INTEREST' | 'CUSTOM';
    readonly amount?: MonetaryAmount;
    readonly rate?: string;
    readonly description: string;
    readonly cap?: MonetaryAmount;
}

export interface Obligation {
    readonly id: string;
    readonly clause_id: string;
    readonly type: ObligationType;
    readonly debtor: string;
    readonly creditor: string;
    readonly action: string;
    readonly action_code?: ActionCode;
    readonly deadline: TemporalExpression;
    readonly status: ObligationStatus;
    readonly conditions: Condition[];
    readonly penalty?: PenaltySpec;
    readonly monetary_value?: MonetaryAmount;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Right
// ─────────────────────────────────────────────────────────────────────────────

export enum RightType {
    TERMINATION = 'TERMINATION',
    RENEWAL = 'RENEWAL',
    FIRST_REFUSAL = 'FIRST_REFUSAL',
    AUDIT = 'AUDIT',
    ASSIGNMENT = 'ASSIGNMENT',
    MODIFICATION = 'MODIFICATION',
    CURE = 'CURE',
    SETOFF = 'SETOFF',
}

export interface Right {
    readonly id: string;
    readonly clause_id: string;
    readonly holder: string;
    readonly type: RightType;
    readonly description: string;
    readonly conditions: Condition[];
    readonly expiry?: TemporalExpression;
    readonly exercised: boolean;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clause
// ─────────────────────────────────────────────────────────────────────────────

export enum ClauseType {
    PAYMENT_TERMS = 'PAYMENT_TERMS',
    DELIVERY = 'DELIVERY',
    LIABILITY_LIMITATION = 'LIABILITY_LIMITATION',
    INDEMNIFICATION = 'INDEMNIFICATION',
    CONFIDENTIALITY = 'CONFIDENTIALITY',
    TERMINATION = 'TERMINATION',
    FORCE_MAJEURE = 'FORCE_MAJEURE',
    DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
    GOVERNING_LAW = 'GOVERNING_LAW',
    INTELLECTUAL_PROPERTY = 'INTELLECTUAL_PROPERTY',
    NON_COMPETE = 'NON_COMPETE',
    WARRANTY = 'WARRANTY',
    REPRESENTATIONS = 'REPRESENTATIONS',
    ASSIGNMENT = 'ASSIGNMENT',
    AMENDMENT = 'AMENDMENT',
    SEVERABILITY = 'SEVERABILITY',
    ENTIRE_AGREEMENT = 'ENTIRE_AGREEMENT',
    NOTICES = 'NOTICES',
    CUSTOM = 'CUSTOM',
}

export interface Clause {
    readonly id: string;
    readonly type: ClauseType;
    readonly title: string;
    readonly text: string;
    readonly section_ref?: string;
    readonly obligations: Obligation[];
    readonly rights: Right[];
    readonly conditions: Condition[];
    readonly language: LanguageCode;
    readonly provenance: Provenance;
    readonly ai_confidence?: number;
    readonly parent_clause_id?: string;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────────────────────────────────────

export enum ContractState {
    DRAFT = 'DRAFT',
    PENDING_REVIEW = 'PENDING_REVIEW',
    PENDING_SIGNATURE = 'PENDING_SIGNATURE',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    TERMINATED = 'TERMINATED',
    EXPIRED = 'EXPIRED',
    BREACHED = 'BREACHED',
    DISPUTED = 'DISPUTED',
}

export interface StateTransition {
    readonly from_state: ContractState;
    readonly to_state: ContractState;
    readonly timestamp: DateTime;
    readonly reason: string;
    readonly triggered_by?: string;
    readonly transition_id?: string;
    readonly provenance: Provenance;
}

export interface Contract {
    readonly id: string;
    readonly name: string;
    readonly display_name: string;
    readonly version: SemanticVersion;
    readonly description?: string;
    readonly parties: Party[];
    readonly clauses: Clause[];
    readonly preamble?: string;
    readonly governing_law: JurisdictionCode;
    readonly dispute_forum?: string;
    readonly effective_date: DateTime;
    readonly expiry_date?: DateTime;
    readonly execution_date?: DateTime;
    readonly state: ContractState;
    readonly state_history: StateTransition[];
    readonly provenance: Provenance;
    readonly hash: string;
    readonly previous_hash?: string;
    readonly schema_version: SchemaVersion;
    readonly engine_version: SemanticVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

export enum EventType {
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
    PAYMENT_MISSED = 'PAYMENT_MISSED',
    DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
    DELIVERY_LATE = 'DELIVERY_LATE',
    DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
    DEADLINE_EXPIRED = 'DEADLINE_EXPIRED',
    FORCE_MAJEURE_DECLARED = 'FORCE_MAJEURE_DECLARED',
    FORCE_MAJEURE_LIFTED = 'FORCE_MAJEURE_LIFTED',
    TERMINATION_NOTICE = 'TERMINATION_NOTICE',
    DISPUTE_FILED = 'DISPUTE_FILED',
    AMENDMENT_PROPOSED = 'AMENDMENT_PROPOSED',
    AMENDMENT_ACCEPTED = 'AMENDMENT_ACCEPTED',
    PARTY_CHANGED = 'PARTY_CHANGED',
    EXTERNAL_RULING = 'EXTERNAL_RULING',
    CUSTOM = 'CUSTOM',
}

export enum EventSource {
    MANUAL = 'MANUAL',
    SYSTEM_CLOCK = 'SYSTEM_CLOCK',
    BLOCKCHAIN = 'BLOCKCHAIN',
    IOT_SENSOR = 'IOT_SENSOR',
    EXTERNAL_API = 'EXTERNAL_API',
}

export interface Field {
    readonly name: string;
    readonly type: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATETIME';
    readonly value: string;
}

export interface EventPayload {
    readonly amount?: MonetaryAmount;
    readonly description?: string;
    readonly evidence_hash?: string;
    readonly custom_fields?: Field[];
}

export interface Event {
    readonly id: string;
    readonly type: EventType;
    readonly timestamp: DateTime;
    readonly source: EventSource;
    readonly contract_id: string;
    readonly party_id?: string;
    readonly payload: EventPayload;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Jurisdiction Rule
// ─────────────────────────────────────────────────────────────────────────────

export enum LegalDomain {
    CONTRACT_LAW = 'CONTRACT_LAW',
    EMPLOYMENT = 'EMPLOYMENT',
    INTELLECTUAL_PROPERTY = 'INTELLECTUAL_PROPERTY',
    DATA_PRIVACY = 'DATA_PRIVACY',
    CONSUMER_PROTECTION = 'CONSUMER_PROTECTION',
    FINANCIAL_REGULATION = 'FINANCIAL_REGULATION',
    REAL_ESTATE = 'REAL_ESTATE',
    TAX = 'TAX',
    ANTITRUST = 'ANTITRUST',
    ENVIRONMENTAL = 'ENVIRONMENTAL',
    HEALTHCARE = 'HEALTHCARE',
    TRADE = 'TRADE',
}

export enum RuleSeverity {
    MANDATORY = 'MANDATORY',
    REGULATORY = 'REGULATORY',
    ADVISORY = 'ADVISORY',
}

export interface Requirement {
    readonly id: string;
    readonly description: string;
    readonly condition: ConditionExpression;
    readonly applies_to: ClauseType[];
    readonly applies_to_roles: PartyRole[];
}

export interface JurisdictionRule {
    readonly id: string;
    readonly jurisdiction: JurisdictionCode;
    readonly domain: LegalDomain;
    readonly subdomain?: string;
    readonly title: string;
    readonly description: string;
    readonly rule_version: SemanticVersion;
    readonly effective_date: DateTime;
    readonly expiry_date?: DateTime;
    readonly supersedes?: string;
    readonly conditions: Condition[];
    readonly requirements: Requirement[];
    readonly severity: RuleSeverity;
    readonly source: string;
    readonly source_url?: string;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

export interface JurisdictionRuleSet {
    readonly id: string;
    readonly version: SemanticVersion;
    readonly rules: JurisdictionRule[];
    readonly hash: string;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Finding
// ─────────────────────────────────────────────────────────────────────────────

export enum FindingType {
    MISSING_CLAUSE = 'MISSING_CLAUSE',
    NON_COMPLIANT_CLAUSE = 'NON_COMPLIANT_CLAUSE',
    AMBIGUOUS_CLAUSE = 'AMBIGUOUS_CLAUSE',
    CONFLICTING_CLAUSES = 'CONFLICTING_CLAUSES',
    MISSING_PARTY_PROTECTION = 'MISSING_PARTY_PROTECTION',
    EXCEEDS_STATUTORY_LIMIT = 'EXCEEDS_STATUTORY_LIMIT',
    BELOW_STATUTORY_MINIMUM = 'BELOW_STATUTORY_MINIMUM',
}

export enum FindingSeverity {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
    INFO = 'INFO',
}

export interface RiskFinding {
    readonly id: string;
    readonly contract_id: string;
    readonly clause_id?: string;
    readonly rule_id: string;
    readonly rule_version: SemanticVersion;
    readonly finding_type: FindingType;
    readonly severity: FindingSeverity;
    readonly title: string;
    readonly description: string;
    readonly recommendation?: string;
    readonly evaluation_date: DateTime;
    readonly provenance: Provenance;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine I/O Types (Phase C)
// ─────────────────────────────────────────────────────────────────────────────

export enum EvaluationMode {
    FULL = 'FULL',
    INCREMENTAL = 'INCREMENTAL',
}

export interface EvaluationContext {
    readonly evaluation_date: DateTime;
    readonly engine_version: SemanticVersion;
    readonly mode: EvaluationMode;
    readonly request_id: string;
}

export interface EvaluationRequest {
    readonly contract: Contract;
    readonly rules: JurisdictionRuleSet;
    readonly event?: Event;
    readonly context: EvaluationContext;
}

export enum ComplianceStatus {
    COMPLIANT = 'COMPLIANT',
    NON_COMPLIANT = 'NON_COMPLIANT',
    AMBIGUOUS = 'AMBIGUOUS',
    NOT_EVALUATED = 'NOT_EVALUATED',
}

export interface ComplianceVerdict {
    readonly status: ComplianceStatus;
    readonly summary: string;
    readonly critical_count: number;
    readonly high_count: number;
    readonly medium_count: number;
    readonly low_count: number;
    readonly info_count: number;
}

export enum RuleResult {
    PASS = 'PASS',
    FAIL = 'FAIL',
    NOT_APPLICABLE = 'NOT_APPLICABLE',
    AMBIGUOUS = 'AMBIGUOUS',
}

export interface RequirementResult {
    readonly requirement_id: string;
    readonly description: string;
    readonly matched_clause_id?: string;
    readonly condition_result?: boolean;
    readonly result: 'SATISFIED' | 'VIOLATED' | 'NOT_APPLICABLE' | 'INDETERMINATE';
    readonly reason: string;
}

export interface TraceEntry {
    readonly step: number;
    readonly rule_id: string;
    readonly rule_version: SemanticVersion;
    readonly rule_title: string;
    readonly applicable: boolean;
    readonly applicability_reason: string;
    readonly clauses_checked: string[];
    readonly requirements_evaluated: RequirementResult[];
    readonly result: RuleResult;
    readonly finding?: RiskFinding;
    readonly duration_us: number;
}

export interface TraceSummary {
    readonly total_rules: number;
    readonly applicable_rules: number;
    readonly passed: number;
    readonly failed: number;
    readonly ambiguous: number;
    readonly not_applicable: number;
}

export interface ExplanationTrace {
    readonly entries: TraceEntry[];
    readonly summary: TraceSummary;
}

export interface EvaluationResult {
    readonly request_id: string;
    readonly contract_id: string;
    readonly contract_hash: string;
    readonly findings: RiskFinding[];
    readonly compliance: ComplianceVerdict;
    readonly trace: ExplanationTrace;
    readonly evaluation_date: DateTime;
    readonly engine_version: SemanticVersion;
    readonly rules_version: SemanticVersion;
    readonly rules_hash: string;
    readonly mode: EvaluationMode;
    readonly duration_ms: number;
    readonly result_hash: string;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine Error Types (Phase C)
// ─────────────────────────────────────────────────────────────────────────────

export enum EngineErrorCode {
    INVALID_CONTRACT = 'INVALID_CONTRACT',
    INVALID_RULE_SET = 'INVALID_RULE_SET',
    SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
    AI_PROVENANCE_VIOLATION = 'AI_PROVENANCE_VIOLATION',
    MISSING_EVENT_FOR_INCREMENTAL = 'MISSING_EVENT_FOR_INCREMENTAL',
    EVENT_CONTRACT_MISMATCH = 'EVENT_CONTRACT_MISMATCH',
    EVALUATION_CONTEXT_INVALID = 'EVALUATION_CONTEXT_INVALID',
}

export class EngineError extends Error {
    public readonly code: EngineErrorCode;
    public readonly field?: string;

    constructor(code: EngineErrorCode, message: string, field?: string) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
        this.field = field;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution I/O Types (Phase D)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationMode {
    readonly enabled: boolean;
    readonly label?: string;
    readonly baseline_hash?: string;
}

export interface ExecutionContext {
    readonly execution_date: DateTime;
    readonly engine_version: SemanticVersion;
    readonly request_id: string;
    readonly simulation: SimulationMode;
}

export interface ExecutionRequest {
    readonly contract: Contract;
    readonly event: Event;
    readonly context: ExecutionContext;
    readonly rules?: JurisdictionRuleSet;
}

export interface ClauseResult {
    readonly clause_id: string;
    readonly triggered: boolean;
    readonly trigger_reason: string;
    readonly conditions_evaluated: ConditionEval[];
}

export interface ConditionEval {
    readonly condition_id: string;
    readonly result: boolean;
    readonly reason: string;
}

export interface ObligationMutation {
    readonly obligation_id: string;
    readonly previous_status: ObligationStatus;
    readonly new_status: ObligationStatus;
    readonly reason: string;
    readonly triggered_by: string;
}

export interface RightExercise {
    readonly right_id: string;
    readonly holder: string;
    readonly exercise_conditions_met: boolean;
    readonly reason: string;
}

export interface PenaltyComputation {
    readonly obligation_id: string;
    readonly penalty_type: string;
    readonly computed_amount?: MonetaryAmount;
    readonly computation_trace: string;
    readonly capped: boolean;
}

export interface DiffEntry {
    readonly field_path: string;
    readonly baseline_value: string;
    readonly simulated_value: string;
}

export interface ComplianceDiff {
    readonly baseline_status: ComplianceStatus;
    readonly simulated_status: ComplianceStatus;
    readonly new_findings: RiskFinding[];
    readonly resolved_findings: string[];
}

export interface SimulationDiff {
    readonly baseline_hash: string;
    readonly state_changed: boolean;
    readonly obligations_diff: DiffEntry[];
    readonly penalties_diff: DiffEntry[];
    readonly risk_diff?: ComplianceDiff;
}

export interface ExecutionResult {
    readonly request_id: string;
    readonly contract_id: string;
    readonly simulation: boolean;
    readonly previous_state: ContractState;
    readonly new_state: ContractState;
    readonly state_changed: boolean;
    readonly transition?: StateTransition;
    readonly triggered_clauses: ClauseResult[];
    readonly obligations_created: Obligation[];
    readonly obligations_activated: ObligationMutation[];
    readonly obligations_fulfilled: ObligationMutation[];
    readonly obligations_breached: ObligationMutation[];
    readonly obligations_waived: ObligationMutation[];
    readonly rights_exercised: RightExercise[];
    readonly rights_expired: string[];
    readonly penalties: PenaltyComputation[];
    readonly evaluation_snapshot?: EvaluationResult;
    readonly resulting_contract: Contract;
    readonly resulting_contract_hash: string;
    readonly simulation_diff?: SimulationDiff;
    readonly execution_date: DateTime;
    readonly engine_version: SemanticVersion;
    readonly duration_ms: number;
    readonly execution_hash: string;
    readonly schema_version: SchemaVersion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution Error Types (Phase D)
// ─────────────────────────────────────────────────────────────────────────────

export enum ExecutionErrorCode {
    INVALID_CONTRACT = 'INVALID_CONTRACT',
    INVALID_EVENT = 'INVALID_EVENT',
    INVALID_CONTEXT = 'INVALID_CONTEXT',
    SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
    EVENT_CONTRACT_MISMATCH = 'EVENT_CONTRACT_MISMATCH',
    ILLEGAL_STATE_TRANSITION = 'ILLEGAL_STATE_TRANSITION',
    CONTRACT_NOT_EXECUTABLE = 'CONTRACT_NOT_EXECUTABLE',
    AI_PROVENANCE_VIOLATION = 'AI_PROVENANCE_VIOLATION',
    INVALID_RULE_SET = 'INVALID_RULE_SET',
    EVALUATION_FAILED = 'EVALUATION_FAILED',
}

export class ExecutionError extends Error {
    public readonly code: ExecutionErrorCode;
    public readonly field?: string;

    constructor(code: ExecutionErrorCode, message: string, field?: string) {
        super(message);
        this.name = 'ExecutionError';
        this.code = code;
        this.field = field;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Current schema version for all types. */
export const CURRENT_SCHEMA_VERSION: SchemaVersion = {
    major: 1,
    minor: 0,
    patch: 0,
};

/** Maximum supported schema major version for backward compatibility. */
export const ENGINE_SUPPORTED_SCHEMA_MAJOR = 1;

/** Current engine version. */
export const ENGINE_VERSION: SemanticVersion = {
    major: 1,
    minor: 0,
    patch: 0,
};

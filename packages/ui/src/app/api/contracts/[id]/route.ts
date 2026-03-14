import { NextRequest, NextResponse } from 'next/server';

const DEMO_CONTRACTS: Record<string, any> = {
    'jg-001': {
        id: 'jg-001',
        title: 'SaaS License Agreement',
        parties: 'TechStart Inc. ↔ Acme Corporation',
        partyA: 'TechStart Inc.',
        partyB: 'Acme Corporation',
        status: 'ACTIVE',
        state: 'EXECUTED',
        hash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        updatedAt: '2025-06-01',
        content: 'This Software Licensing Agreement is entered into by Acme Corporation ("Licensor") and TechStart Inc. ("Licensee"). The Licensor grants the Licensee a non-exclusive, non-transferable license to use the Software. Payment shall be due within 30 calendar days of invoice receipt. Either party may terminate this agreement with 90 days written notice. Liability shall not exceed the total fees paid in the preceding 12 months. The agreement shall be governed by the laws of the State of Delaware.',
        pages: 12,
        clauses: [
            { id: 'c1', type: 'payment', text: 'Payment shall be due within 30 calendar days of invoice receipt.' },
            { id: 'c2', type: 'termination', text: 'Either party may terminate this agreement with 90 days written notice.' },
            { id: 'c3', type: 'liability', text: 'Liability shall not exceed the total fees paid in the preceding 12 months.' },
            { id: 'c4', type: 'governing-law', text: 'This agreement shall be governed by the laws of the State of Delaware.' },
        ],
    },
    'jg-002': {
        id: 'jg-002',
        title: 'Data Processing Agreement',
        parties: 'CloudVault Ltd. ↔ DataFlow GmbH',
        partyA: 'CloudVault Ltd.',
        partyB: 'DataFlow GmbH',
        status: 'DRAFT',
        state: 'DRAFTED',
        hash: '0xc4d2b8e1f09a3b7c5d6e8f1a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9',
        updatedAt: '2025-05-28',
        content: 'This Data Processing Agreement governs the processing of personal data by the Processor on behalf of the Controller pursuant to GDPR Article 28. The Processor shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.',
        pages: 8,
        clauses: [
            { id: 'c1', type: 'data-protection', text: 'The Processor shall implement appropriate technical and organizational measures.' },
            { id: 'c2', type: 'compliance', text: 'Processing shall comply with GDPR Article 28 requirements.' },
        ],
    },
    'jg-003': {
        id: 'jg-003',
        title: 'Commercial Supply Contract',
        parties: 'ACME Corporation ↔ Globex Industries',
        partyA: 'ACME Corporation',
        partyB: 'Globex Industries',
        status: 'ACTIVE',
        state: 'EXECUTED',
        hash: '0xf1e9d7c5a3b1e8d6c4b2a0f9e7d5c3b1a9f8e6d4c2b0a8f7e5d3c1b9a8f6e4d2',
        updatedAt: '2025-06-02',
        content: 'This Commercial Supply Agreement is made between ACME Corporation ("Buyer") and Globex Industries ("Seller"). Payment within 30 days of delivery. Force Majeure clause applies to natural disasters and government actions.',
        pages: 15,
        clauses: [
            { id: 'c1', type: 'payment', text: 'Payment within 30 days of delivery.' },
            { id: 'c2', type: 'force-majeure', text: 'Force Majeure clause applies to natural disasters and government actions.' },
        ],
    },
};

// Generate demo data for any unknown contract ID (from demo uploads)
function getDemoContract(id: string) {
    return {
        id,
        title: 'Uploaded Contract',
        parties: 'Party A ↔ Party B',
        partyA: 'Party A',
        partyB: 'Party B',
        status: 'ACTIVE',
        state: 'DRAFTED',
        hash: '0x' + id.replace(/[^a-f0-9]/gi, '').padEnd(64, 'a'),
        updatedAt: new Date().toISOString().split('T')[0],
        content: 'This is a demo contract created from an uploaded document. In a production environment with the backend service running, the full extracted text from your PDF would appear here along with AI-powered clause analysis, risk scoring, and entity extraction.\n\nThe JurisGenie pipeline processes documents through: PDF Extraction → OCR & Vision → Clause Parsing → Hash Generation → AI Annotation → Compliance Evaluation → State Machine Execution → Blockchain Anchoring.',
        pages: 10,
        clauses: [
            { id: 'c1', type: 'payment', text: 'Payment terms are extracted from the uploaded document.' },
            { id: 'c2', type: 'termination', text: 'Termination clauses are identified via AI annotation.' },
            { id: 'c3', type: 'liability', text: 'Liability provisions are flagged for compliance review.' },
        ],
    };
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const contract = DEMO_CONTRACTS[params.id] || getDemoContract(params.id);
    return NextResponse.json(contract);
}

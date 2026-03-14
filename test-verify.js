
async function test() {
    const contract = {
        id: "contract-supply-2025-001",
        name: "acme-globex-supply-q1",
        parties: [
            {
                id: "party-acme",
                role: "BUYER",
                name: "ACME Corporation",
                identifier: { type: "TAX_ID", value: "US-EIN-12-3456789" },
                jurisdiction: { country: "US", subdivision: "CA" },
                provenance: "HUMAN_AUTHORED",
                schema_version: { major: 1, minor: 0, patch: 0 }
            }
        ],
        clauses: [],
        governing_law: { country: "US", subdivision: "CA" },
        effective_date: "2025-01-01T00:00:00.000Z",
        expiry_date: "2025-12-31T23:59:59.999Z",
        state: "ACTIVE",
        state_history: [],
        provenance: "HUMAN_AUTHORED",
        schema_version: { major: 1, minor: 0, patch: 0 },
        engine_version: "1.0.0"
    };

    try {
        const res = await fetch('http://localhost:3001/contracts/test-001/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contract, events: [] })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) { console.error(e); }
}
test();

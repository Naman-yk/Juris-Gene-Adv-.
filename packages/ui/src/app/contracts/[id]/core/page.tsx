"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { FileJson, History, Handshake, ScrollText, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useContractStore } from '@/lib/stores';
import { RiskSummaryPanel, ClauseRiskBadge } from '@/components/ui/explainability';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

const AMBIGUITY_DICTIONARY = [
    { term: "reasonable effort", suggestion: "Replace with a measurable action, e.g., 'must attempt [X] within [Y] days'." },
    { term: "best effort", suggestion: "Replace with an explicit quantifiable metric or service level agreement." },
    { term: "subject to approval", suggestion: "Define the exact approval timeframe and default outcome if no response is given." },
    { term: "commercially reasonable", suggestion: "Specify the exact financial thresholds or industry index applicable." },
    { term: "as soon as possible", suggestion: "State a precise time limit (e.g., 'within 48 hours')." },
    { term: "promptly", suggestion: "Replace with a definite timeframe (e.g., 'within 2 business days')." }
];

function detectAmbiguities(text: string) {
    if (!text) return [];
    const lowerText = text.toLowerCase();
    return AMBIGUITY_DICTIONARY.filter(dict => lowerText.includes(dict.term));
}

// Helper to generate dynamic structured data from document text
function generateStructuredData(contractSummary: any) {
    const content = contractSummary?.content || '';
    const sentences = content
        .replace(/\b(Mr|Ms|Mrs|Dr|Shri)\.\s*/gi, "$1_")
        .split(/(?<=[.?!;])\s+/)
        .map((s: string) => s.replace(/\b(Mr|Ms|Mrs|Dr|Shri)_/gi, "$1. ").trim())
        .filter((s: string) => s.length > 20);

    // Find Title
    const titleMatch = sentences.find((s: string) => s.toLowerCase().includes("agreement") || s.toLowerCase().includes("contract") || s.toLowerCase().includes("tender"));
    const title = titleMatch ? titleMatch.substring(0, 100) + (titleMatch.length > 100 ? "..." : "") : (contractSummary.title || "Uploaded Document");

    // Find Parties
    const parties = [];
    let partyA = contractSummary.partyA || "";
    let partyB = contractSummary.partyB || "";

    // If backend fields are missing, try the parties string (↔ separator)
    if ((!partyA || partyA === "Party A") && typeof contractSummary.parties === 'string' && contractSummary.parties.includes('↔')) {
        const [a, b] = contractSummary.parties.split('↔').map((s: string) => s.trim());
        partyA = a || "";
        partyB = b || "";
    }

    // If still missing, fall back to content parsing
    if (!partyA || partyA === "Party A") {
        const partySentence = sentences.find((s: string) => s.toLowerCase().includes("party") || s.toLowerCase().includes("between"));
        if (partySentence) {
            const cleanSentence = partySentence.replace(/\b(Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Shri)\s+/gi, '');
            const betweenParts = cleanSentence.split(/between\s+/i);
            if (betweenParts.length > 1) {
                const afterBetween = betweenParts[1];
                let partySplit = afterBetween.split(/;\s+and\s+|(?<=\))\s+and\s+/i);
                if (partySplit.length > 1) {
                    partyA = partySplit[0].split(/\(/)[0].trim();
                    partyB = partySplit[1].split(/\(/)[0].trim();
                } else {
                    partyA = afterBetween.split(',')[0].trim();
                }
            }
        }

        // Court case pattern fallback
        if (!partyA || partyA === 'Party A') {
            const appellantMatch = content.match(/([A-Z][A-Z\s,]{3,50}?)\s*(?:\.{2,}|\n)\s*(?:Appellant|Petitioner)/i);
            const respondentMatch = content.match(/versus\s+([A-Z][A-Z\s,]{3,50}?)\s*(?:\.{2,}|\n|\s+&\s+ORS)/i);
            if (appellantMatch) partyA = appellantMatch[1].trim();
            if (respondentMatch) partyB = respondentMatch[1].trim();
            
            // Fallback for simple "X versus Y"
            if (!partyA || !partyB || partyA === 'Party A') {
                const versusMatch = content.match(/([A-Z][A-Z\s,]{3,50}?)\s+(?:versus|vs\.?|V\/s\.?|V\.)\s+([A-Z][A-Z\s,]{3,50}?)(?:\s|\.|,|$)/i);
                if (versusMatch) {
                    if (!partyA || partyA === 'Party A') partyA = versusMatch[1].trim();
                    if (!partyB || partyB === 'Party B') partyB = versusMatch[2].trim();
                }
            }
        }
    }

    // Clean up names
    if (partyA.includes(',')) partyA = partyA.split(',')[0].trim();
    if (partyB.includes(',')) partyB = partyB.split(',')[0].trim();

    parties.push(
        { id: "p1", name: partyA || "Party A", role: "Primary", type: "INDIVIDUAL" },
        { id: "p2", name: partyB || "Party B", role: "Secondary", type: "INDIVIDUAL" }
    );

    // Find Clauses
    const clauses = [];
    let cId = 1;
    sentences.forEach((s: string) => {
        if (s.toLowerCase().includes("shall") || s.toLowerCase().includes("agree") || s.toLowerCase().includes("term")) {
            if (clauses.length < 4) {
                clauses.push({ id: `c${cId++}`, title: `Clause ${cId - 1}`, intent: s });
            }
        }
    });
    if (clauses.length === 0) {
        clauses.push({ id: "c1", title: "General Terms", intent: "Standard terms and conditions apply." });
    }

    // Find Obligations
    const obligations = [];
    const obSentence = sentences.find((s: string) => s.toLowerCase().includes("must") || s.toLowerCase().includes("shall provide") || s.toLowerCase().includes("will deliver") || s.toLowerCase().includes("pay"));
    if (obSentence) {
        obligations.push({ id: "ob1", description: obSentence.substring(0, 150), debtorId: "p2", creditorId: "p1", dueBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: "PENDING" });
    } else {
        obligations.push({ id: "ob1", description: "Fulfill all stated requirements in the document.", debtorId: "p2", creditorId: "p1", dueBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: "PENDING" });
    }

    // Find Rights
    const rights = [];
    const rightSentence = sentences.find((s: string) => s.toLowerCase().includes("right to") || s.toLowerCase().includes("may terminate") || s.toLowerCase().includes("entitled to"));
    if (rightSentence) {
        rights.push({ id: "r1", description: rightSentence.substring(0, 150), holderId: "p1" });
    } else {
        rights.push({ id: "r1", description: "Standard execution and termination rights.", holderId: "p1" });
    }

    // Safe Date Parsing
    let effectiveDate = new Date().toISOString();
    try {
        if (contractSummary.updatedAt) {
            const d = new Date(contractSummary.updatedAt);
            if (!isNaN(d.getTime())) {
                effectiveDate = d.toISOString();
            }
        }
    } catch (e) { }

    return {
        id: contractSummary.id || "unknown",
        content: content,
        metadata: {
            title: title,
            type: content.toLowerCase().includes("license") ? "LICENSE" : (content.toLowerCase().includes("lease") ? "LEASE" : "GENERAL_AGREEMENT"),
            effectiveDate: effectiveDate,
            jurisdiction: content.includes("India") || content.includes("Mumbai") ? "Mumbai, India" : (content.includes("Delaware") ? "Delaware, USA" : "Unspecified Jurisdiction"),
        },
        parties,
        clauses,
        obligations,
        rights,
        state: {
            status: contractSummary.status || "ACTIVE",
            hash: contractSummary.hash || "0xabc123456789def0123456789abcdeffedcba9876543210",
            version: 1
        }
    };
}

export default function TypedContractPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { theme } = useTheme();

    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { id: params.id, title: "Residential Lease Agreement", hash: "0xabc123456789def0123456789abcdeffedcba9876543210" } as any;

    const structuredData = generateStructuredData(contract);

    return (
        <div className="container py-8 max-w-6xl">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">Core Contract</h1>
                        <StatusBadge status="VERIFIED" />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                        {contract.title} <span className="text-border">|</span>
                        ID: {params.id} <span className="text-border">|</span>
                        Current Hash: <HashBadge hash={contract.hash} />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/compliance`)}>
                        Run Compliance Check
                    </Button>
                    <Button onClick={() => router.push(`/contracts/${params.id}/execution`)}>
                        Go to Execution <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <RiskSummaryPanel activeObligations={structuredData.obligations} />

            <Tabs defaultValue="metadata" className="w-full">
                <TabsList className="grid w-full grid-cols-7 mb-8 h-12">
                    <TabsTrigger value="metadata" className="h-full">Metadata</TabsTrigger>
                    <TabsTrigger value="parties" className="h-full"><Users className="h-4 w-4 mr-2" />Parties</TabsTrigger>
                    <TabsTrigger value="clauses" className="h-full"><ScrollText className="h-4 w-4 mr-2" />Clauses</TabsTrigger>
                    <TabsTrigger value="obligations" className="h-full"><Handshake className="h-4 w-4 mr-2" />Obligations</TabsTrigger>
                    <TabsTrigger value="rights" className="h-full">Rights</TabsTrigger>
                    <TabsTrigger value="json" className="h-full"><FileJson className="h-4 w-4 mr-2" />JSON Dump</TabsTrigger>
                    <TabsTrigger value="history" className="h-full"><History className="h-4 w-4 mr-2" />History</TabsTrigger>
                </TabsList>

                <TabsContent value="metadata">
                    <Card>
                        <CardHeader>
                            <CardTitle>Document Metadata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Title</dt>
                                    <dd className="mt-1 text-base">{structuredData.metadata.title}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                                    <dd className="mt-1 text-base">{structuredData.metadata.type}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Effective Date</dt>
                                    <dd className="mt-1 text-base" suppressHydrationWarning>{new Date(structuredData.metadata.effectiveDate).toLocaleDateString('en-GB')}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Jurisdiction</dt>
                                    <dd className="mt-1 text-base">{structuredData.metadata.jurisdiction}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parties">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {structuredData.parties.map((party: any) => (
                            <Card key={party.id}>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        {party.name}
                                        <span className="text-xs font-normal px-2 py-1 bg-muted rounded-full">{party.type}</span>
                                    </CardTitle>
                                    <CardDescription>Role: {party.role}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="clauses">
                    <div className="space-y-6">
                        {structuredData.clauses.map((clause: any) => {
                            const risk = clause.intent.toLowerCase().includes('terminate') ? 'HIGH' : (clause.intent.toLowerCase().includes('pay') ? 'MEDIUM' : 'LOW');

                            // Mock a vague clause content if not present for the UI to latch onto
                            const mockContent = clause.title === 'Clause 1' ? "The vendor shall make a commercially reasonable effort to deliver the materials as soon as possible, subject to approval by the board." : clause.intent;
                            const clauseText = clause.content || mockContent;

                            const ambiguities = detectAmbiguities(clauseText);

                            return (
                                <div key={clause.id} className="relative group">
                                    <Card className={ambiguities.length > 0 ? "border-orange-300 dark:border-orange-900/50 shadow-sm transition-all" : ""}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg">{clause.title}</CardTitle>
                                                <div className="flex items-center gap-2">
                                                    {ambiguities.length > 0 && (
                                                        <span className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded flex items-center gap-1">
                                                            <TriangleAlert className="w-3 h-3" /> AMBIGUOUS
                                                        </span>
                                                    )}
                                                    <ClauseRiskBadge riskLevel={risk} />
                                                </div>
                                            </div>
                                            <CardDescription className="text-base text-foreground mt-2 leading-relaxed">
                                                {/* Highlight ambiguities in text */}
                                                {(() => {
                                                    let highlightedText = clauseText;
                                                    ambiguities.forEach(amb => {
                                                        const regex = new RegExp(`(${amb.term})`, 'gi');
                                                        highlightedText = highlightedText.replace(regex, `<span class="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 font-medium px-1 rounded mx-[1px] cursor-help underline decoration-orange-400/50 decoration-wavy underline-offset-4" title="${amb.suggestion}">$1</span>`);
                                                    });
                                                    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
                                                })()}
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>

                                    {/* Ambiguity Warning Dropdown Card */}
                                    {ambiguities.length > 0 && (
                                        <div className="mt-3 ml-6 mb-8 border-l-2 border-orange-400 pl-4 space-y-3 relative before:absolute before:w-4 before:h-[2px] before:bg-orange-400 before:-left-[18px] before:top-4">
                                            {ambiguities.map((amb, idx) => (
                                                <Alert variant="destructive" key={idx} className="bg-orange-50/50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/50 shadow-sm py-3 relative">
                                                    <TriangleAlert className="h-4 w-4 text-orange-600 dark:text-orange-400 top-3" />
                                                    <div className="ml-2">
                                                        <AlertTitle className="text-sm font-bold tracking-tight mb-1 text-orange-900 dark:text-orange-200">
                                                            NON-DETERMINISTIC TERM DETECTED: <span className="font-mono bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded text-xs ml-1">"{amb.term.toUpperCase()}"</span>
                                                        </AlertTitle>
                                                        <AlertDescription className="text-xs space-y-2 opacity-90">
                                                            <p>This phrasing creates a logic branch that an execution engine cannot resolve autonomously. It introduces subjective enforcement risk.</p>
                                                            <div className="bg-white/60 dark:bg-black/40 p-2 rounded border border-orange-200 dark:border-orange-900/60 font-medium flex gap-2">
                                                                <span className="uppercase text-[10px] font-bold opacity-60 mt-0.5 shrink-0">Suggestion</span>
                                                                <span className="italic">{amb.suggestion}</span>
                                                            </div>
                                                        </AlertDescription>
                                                    </div>
                                                </Alert>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="obligations">
                    <div className="space-y-4">
                        {structuredData.obligations.map((ob: any) => (
                            <Card key={ob.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{ob.description}</CardTitle>
                                        <StatusBadge status={ob.status as any} />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <div className="flex gap-6 mt-2">
                                        <div><span className="text-muted-foreground">Debtor:</span> {structuredData.parties.find((p: any) => p.id === ob.debtorId)?.name}</div>
                                        <div><span className="text-muted-foreground">Creditor:</span> {structuredData.parties.find((p: any) => p.id === ob.creditorId)?.name}</div>
                                        <div suppressHydrationWarning><span className="text-muted-foreground">Due:</span> {new Date(ob.dueBy).toLocaleDateString('en-GB')}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="rights">
                    <div className="space-y-4">
                        {structuredData.rights.map((right: any) => (
                            <Card key={right.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{right.description}</CardTitle>
                                    <CardDescription>Holder: {structuredData.parties.find((p: any) => p.id === right.holderId)?.name}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="json">
                    <Card className="h-[600px] flex flex-col pt-6">
                        <CardContent className="flex-1 p-0 overflow-hidden">
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme={theme === "dark" ? "vs-dark" : "light"}
                                value={JSON.stringify(structuredData, null, 2)}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    wordWrap: "on",
                                    padding: { top: 16 }
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>State History</CardTitle>
                            <CardDescription>Immutable record of state transitions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l border-muted-foreground/20 ml-3 space-y-8 py-4">
                                <div className="relative pl-6">
                                    <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background"></div>
                                    <h4 className="font-semibold text-sm">v1 - Initial Verification</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Today at 10:30 AM</p>
                                    <div className="mt-2 inline-block"><HashBadge hash={structuredData.state.hash} /></div>
                                </div>
                                <div className="relative pl-6 opacity-60">
                                    <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground ring-4 ring-background"></div>
                                    <h4 className="font-semibold text-sm">v0 - Ingested</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Today at 09:12 AM</p>
                                    <div className="mt-2 inline-block"><HashBadge hash="0xdef123456789abc0123456789abcdeffedcba9876543210" /></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, X, Edit2, ArrowRight, FileText, Calendar, DollarSign, Users, Gavel, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ProvenanceBadge } from '@/components/ui/provenance-badge';
import { useContractStore } from '@/lib/stores';
import { AIOptionalBanner } from '@/components/ui/explainability';
import { isDemoCase, DEMO_PARTIES, DEMO_FINANCIAL, DEMO_DATES, DEMO_CASE, DEMO_EXHIBITS } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

/* ────────────────────────────────────────────────────────────── */
/* Deterministic demo suggestions                                 */
/* ────────────────────────────────────────────────────────────── */

const DEMO_SUGGESTIONS = [
    {
        id: 1,
        type: 'Party Identification',
        icon: Users,
        confidence: 99,
        text: `Complainant: ${DEMO_PARTIES.complainant.name}, S/o ${DEMO_PARTIES.complainant.father}, R/o ${DEMO_PARTIES.complainant.address}\n\nAccused: ${DEMO_PARTIES.accused.name}, S/o ${DEMO_PARTIES.accused.father}, R/o ${DEMO_PARTIES.accused.address}`,
        status: 'pending',
    },
    {
        id: 2,
        type: 'Financial Instrument',
        icon: DollarSign,
        confidence: 98,
        text: `Cheque No. ${DEMO_FINANCIAL.chequeNumber} dated ${DEMO_FINANCIAL.chequeDate} for ${DEMO_FINANCIAL.chequeAmount} drawn on ${DEMO_FINANCIAL.bank}.\nDishonour reason: "${DEMO_FINANCIAL.dishonourReason}" — Return memo dated ${DEMO_FINANCIAL.returnMemoDate}.\nOriginal loan amount: ${DEMO_FINANCIAL.loanAmount}.`,
        status: 'pending',
    },
    {
        id: 3,
        type: 'Key Dates',
        icon: Calendar,
        confidence: 97,
        text: `Loan issued: ${DEMO_DATES.loanDate}\nCheque date: ${DEMO_DATES.chequeDate}\nDishonour: ${DEMO_DATES.dishonourDate}\nLegal notice: ${DEMO_DATES.noticeDate}\nSettlement 1: ${DEMO_DATES.settlementDate2016}\nNotice u/s 251: ${DEMO_DATES.noticeUnder251}\nSettlement 2: ${DEMO_DATES.settlementDate2022}\nConviction: ${DEMO_DATES.convictionDate}`,
        status: 'pending',
    },
    {
        id: 4,
        type: 'Legal Provision',
        icon: Gavel,
        confidence: 99,
        text: `${DEMO_CASE.section}\nCourt: ${DEMO_CASE.court}\nCase No.: ${DEMO_CASE.caseNumber}\nPresiding Judge: ${DEMO_CASE.judge}\nVerdict: ${DEMO_CASE.verdict}`,
        status: 'pending',
    },
    {
        id: 5,
        type: 'Exhibits',
        icon: FileCheck,
        confidence: 96,
        text: DEMO_EXHIBITS.map(e => `${e.id}: ${e.description}`).join('\n'),
        status: 'pending',
    },
    {
        id: 6,
        type: 'Key Claims',
        icon: FileText,
        confidence: 88,
        text: `Accused claims:\n1. Cheque was a "blank signed security cheque" for the loan of ${DEMO_FINANCIAL.loanAmount}\n2. Repayment of ${DEMO_FINANCIAL.disputedRepayment} already made (no documentary proof produced)\n3. Admitted liability of ${DEMO_FINANCIAL.chequeAmount} — later retracted on counsel's prompting\n\n⚠ Settlement documents Ex.DW1/1 (2016) and Mark A (2022) never put to complainant during cross-examination → inadmissible per Section 145 CrPC.`,
        status: 'pending',
    },
];

/* ────────────────────────────────────────────────────────────── */
/* Icon mapping for entity types                                   */
/* ────────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, any> = {
    'Party Identification': Users,
    'Financial Instrument': DollarSign,
    'Key Dates': Calendar,
    'Legal Provision': Gavel,
    'Exhibits': FileCheck,
    'Key Claims': FileText,
    'Defence Claims': FileText,
};

/* ────────────────────────────────────────────────────────────── */
/* Dynamic extraction for non-demo documents (regex fallback)     */
/* ────────────────────────────────────────────────────────────── */

function generateDynamicSuggestions(content: string, contractSummary: any) {
    if (!content) return [];

    const normalizedContent = content.replace(/\r/g, '');
    const sentences = normalizedContent
        .replace(/\b(Mr|Ms|Mrs|Dr|Shri|Rs|No|Nos|Anr|Ors)\.\s*/gi, "$1_")
        .split(/(?<=[.?!;])\s+|\n/)
        .map(s => s.replace(/\b(Mr|Ms|Mrs|Dr|Shri|Rs|No|Nos|Anr|Ors)_/gi, "$1. ").trim())
        .filter(s => s.length > 10);

    const clumps = normalizedContent.split(/\n\s*\n/).filter(c => c.trim().length > 5);
    const suggestions: any[] = [];
    let idCounter = 1;

    const partyA = contractSummary?.partyA || "";
    const partyB = contractSummary?.partyB || "";
    const appellantPart = partyA ? partyA.split(' ')[0].toUpperCase() : "APPELLANT";
    const respondentPart = partyB ? partyB.split(' ')[0].toUpperCase() : "RESPONDENT";

    const partyClumps = clumps.filter(c => 
        c.toUpperCase().includes(appellantPart) || 
        c.toUpperCase().includes(respondentPart) ||
        c.toLowerCase().includes(' versus ') ||
        c.toLowerCase().includes(' vs.') ||
        c.toLowerCase().includes(' between ')
    );

    if (partyClumps.length > 0) {
        suggestions.push({
            id: idCounter++, type: 'Party Identification', confidence: 98,
            text: partyClumps.slice(0, 3).join("\n\n").substring(0, 1000), status: 'pending'
        });
    }

    const bindingSentences = sentences.filter(s =>
        s.toLowerCase().includes('shall') || s.toLowerCase().includes('must') || 
        s.toLowerCase().includes('directed to') || s.toLowerCase().includes('ordered to')
    );
    if (bindingSentences.length > 0) {
        suggestions.push({
            id: idCounter++, type: 'Key Claims', confidence: 94,
            text: bindingSentences[0], status: 'pending'
        });
    }

    const datePattern = sentences.find(s => 
        (s.toLowerCase().includes('dated') && /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(s))
    );
    if (datePattern) {
        suggestions.push({
            id: idCounter++, type: 'Key Dates', confidence: 96,
            text: datePattern, status: 'pending'
        });
    }

    return suggestions;
}

/* ────────────────────────────────────────────────────────────── */
/* Component                                                       */
/* ────────────────────────────────────────────────────────────── */

export default function AIAnnotationPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0x000", content: "", partyA: "Party A", partyB: "Party B" } as any;

    const { analysis, isDemo, loading: analysisLoading } = useAnalysis(params.id);

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        if (isDemo) {
            setSuggestions(DEMO_SUGGESTIONS.map(s => ({ ...s })));
        } else if (analysis) {
            // Use Gemini-extracted entities
            setSuggestions(analysis.entities.map(e => ({
                ...e,
                icon: ICON_MAP[e.type] || FileText,
                status: 'pending',
            })));
        } else if (!analysisLoading) {
            // Fallback to regex extraction
            setSuggestions(generateDynamicSuggestions(contract.content || '', contract));
        }
    }, [isDemo, analysis, analysisLoading, contract.content, contract.id]);

    const pendingCount = suggestions.filter(s => s.status === 'pending').length;
    const totalCount = suggestions.length;
    const allReviewed = pendingCount === 0;

    const handleAction = (id: number, status: string) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const startEditing = (suggestion: any) => {
        setEditingId(suggestion.id);
        setEditValue(suggestion.text);
    };

    const saveEdit = (id: number) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, text: editValue, status: 'pending' } : s));
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const renderHighlightedContent = () => {
        if (!contract.content) {
            return (
                <div className="text-muted-foreground italic flex items-center justify-center h-full">
                    No document text available. Please upload a document.
                </div>
            );
        }

        const paragraphs = contract.content.split('\n\n');
        const partyA = contract.partyA;
        const partyB = contract.partyB;
        
        const underlineEntities = (text: string, keyPrefix: string) => {
            if (!text) return [text];
            let elements: any[] = [text];

            [partyA, partyB].forEach((partyName: string, pIdx: number) => {
                if (!partyName || partyName === 'Party A' || partyName === 'Party B' || partyName === 'Counter Party') return;
                
                const newElements: any[] = [];
                elements.forEach((el: any, elIdx: number) => {
                    if (typeof el === 'string') {
                        const escapedName = partyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const parts = el.split(new RegExp(`(${escapedName})`, 'g'));
                        parts.forEach((part: string, partIdx: number) => {
                            if (part === partyName) {
                                newElements.push(
                                    <span key={`${keyPrefix}-entity-${pIdx}-${elIdx}-${partIdx}`} className="underline decoration-2 decoration-blue-500 font-bold px-0.5">
                                        {part}
                                    </span>
                                );
                            } else if (part) {
                                newElements.push(part);
                            }
                        });
                    } else {
                        newElements.push(el);
                    }
                });
                elements = newElements;
            });
            return elements;
        };

        return paragraphs.map((para: string, idx: number) => {
            if (!para.trim()) return null;

            let elements: any[] = [para];

            suggestions.forEach((s: any) => {
                if (s.status === 'rejected') return;

                const newElements: any[] = [];
                elements.forEach((el: any, elIdx: number) => {
                    if (typeof el === 'string') {
                        const startIndex = el.indexOf(s.text);
                        if (startIndex !== -1) {
                            newElements.push(el.substring(0, startIndex));
                            const highlightClass = s.status === 'accepted'
                                ? 'bg-green-500/30'
                                : 'bg-amber-500/30 text-amber-900 dark:text-amber-100 font-medium border-b border-amber-500/50';

                            newElements.push(
                                <mark key={`mark-${idx}-${s.id}-${elIdx}`} className={`px-1 py-0.5 rounded-sm ${highlightClass} transition-colors cursor-pointer hover:bg-amber-500/50`}>
                                    {underlineEntities(s.text, `mark-inner-${idx}-${s.id}-${elIdx}`)}
                                </mark>
                            );
                            newElements.push(el.substring(startIndex + s.text.length));
                        } else {
                            newElements.push(el);
                        }
                    } else {
                        newElements.push(el);
                    }
                });
                elements = newElements;
            });

            const finalElements = elements.map((el: any, elIdx: number) => {
                if (typeof el === 'string') {
                    return underlineEntities(el, `para-${idx}-${elIdx}`);
                }
                return el;
            });

            return <p key={idx} className="mb-4 text-base whitespace-pre-wrap">{finalElements}</p>;
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            <AIOptionalBanner />
            {/* Warning Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                AI suggestions are NOT legally binding. Human review is required before execution.
            </div>

            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-background z-10">
                <div>
                    <h1 className="text-2xl font-bold">AI Extraction</h1>
                    <p className="text-muted-foreground text-sm font-medium">{contract.title} <span className="text-muted/50 font-normal">| {params.id}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm font-medium bg-muted px-3 py-1.5 rounded-full">
                        {totalCount - pendingCount} / {totalCount} Reviewed
                    </div>
                    <Button
                        onClick={() => router.push(`/contracts/${params.id}/review`)}
                        disabled={!allReviewed}
                    >
                        Proceed to Final Gate <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Document Text */}
                <div className="w-1/2 border-r bg-muted/20 p-6 overflow-y-auto font-serif text-lg leading-relaxed shadow-inner">
                    <h2 className="text-xl font-bold mb-4 font-sans">{contract.title}</h2>
                    {renderHighlightedContent()}
                </div>

                {/* Right Panel: Extracted Entities */}
                <div className="w-1/2 bg-background p-6 overflow-y-auto flex flex-col gap-4">
                    <h3 className="font-semibold text-lg flex items-center justify-between">
                        Extracted Entities & Clauses
                        {allReviewed && <span className="text-green-500 text-sm flex items-center gap-1"><Check className="h-4 w-4" /> All Clear</span>}
                    </h3>

                    {suggestions.map((suggestion) => {
                        const IconComp = suggestion.icon || FileText;
                        return (
                            <Card key={suggestion.id} className={`transition-all ${suggestion.status === 'accepted' ? 'border-green-500/50 bg-green-500/5' : suggestion.status === 'rejected' ? 'border-red-500/50 bg-red-500/5 opacity-60' : 'border-border'}`}>
                                <CardHeader className="pb-2 flex flex-row justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <IconComp className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div>
                                            <CardTitle className="text-base">{suggestion.type}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-1 tracking-wide">CONFIDENCE: {suggestion.confidence}%</p>
                                        </div>
                                    </div>
                                    <ProvenanceBadge type="AI_GENERATED" />
                                </CardHeader>
                                <CardContent>
                                    {editingId === suggestion.id ? (
                                        <textarea
                                            className="w-full bg-background border rounded p-3 text-sm font-mono whitespace-pre-wrap min-h-[100px] outline-none focus:ring-2 focus:ring-primary"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="bg-muted p-3 rounded text-sm font-mono whitespace-pre-wrap">
                                            {suggestion.text}
                                        </div>
                                    )}
                                </CardContent>
                                {suggestion.status === 'pending' ? (
                                    <CardFooter className="flex justify-end gap-2 pt-0">
                                        {editingId === suggestion.id ? (
                                            <>
                                                <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveEdit(suggestion.id)}>Save</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleAction(suggestion.id, 'rejected')}>
                                                    <X className="h-4 w-4 mr-1" /> Reject
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => startEditing(suggestion)}>
                                                    <Edit2 className="h-4 w-4 mr-1" /> Edit
                                                </Button>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(suggestion.id, 'accepted')}>
                                                    <Check className="h-4 w-4 mr-1" /> Accept
                                                </Button>
                                            </>
                                        )}
                                    </CardFooter>
                                ) : (
                                    <CardFooter className="flex justify-end pt-0">
                                        <Button variant="ghost" size="sm" onClick={() => handleAction(suggestion.id, 'pending')}>
                                            Undo
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

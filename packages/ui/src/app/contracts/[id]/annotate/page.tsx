"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, X, Edit2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ProvenanceBadge } from '@/components/ui/provenance-badge';
import { useContractStore } from '@/lib/stores';
import { AIOptionalBanner } from '@/components/ui/explainability';

// Helper to extract dynamic suggestions from the actual text
function generateMockSuggestions(content: string, contractSummary: any) {
    if (!content) return [];

    const normalizedContent = content.replace(/\r/g, '');
    
    // Split into clumps (paragraphs or sections) - more flexible split
    const clumps = normalizedContent.split(/\n\s*\n/).filter(c => c.trim().length > 5);
    
    // Split into sentences for fine-grained search
    // Improved regex to avoid splitting on common honorifics AND currency abbreviations (Rs.)
    const sentences = normalizedContent
        .replace(/\b(Mr|Ms|Mrs|Dr|Shri|Rs|No|Nos|Anr|Ors)\.\s*/gi, "$1_") // Temporarily replace period
        .split(/(?<=[.?!;])\s+|\n/)
        .map(s => s.replace(/\b(Mr|Ms|Mrs|Dr|Shri|Rs|No|Nos|Anr|Ors)_/gi, "$1. ").trim()) // Restore period
        .filter(s => s.length > 10);

    const suggestions: any[] = [];
    let idCounter = 1;

    const partyA = contractSummary?.partyA || "";
    const partyB = contractSummary?.partyB || "";

    // 1. Party Identification
    // Strategy: Look for the segment containing appellant/respondent OR the names identified in the store
    let partyContent = "";
    
    // Look for a clump that mentions the appellant name
    const appellantPart = partyA ? partyA.split(' ')[0].toUpperCase() : "APPELLANT";
    const respondentPart = partyB ? partyB.split(' ')[0].toUpperCase() : "RESPONDENT";

    const partyClumps = clumps.filter(c => 
        c.toUpperCase().includes(appellantPart) || 
        c.toUpperCase().includes(respondentPart) ||
        c.toLowerCase().includes(' versus ') ||
        c.toLowerCase().includes(' vs.') ||
        c.toLowerCase().includes(' v/s ') ||
        c.toLowerCase().includes(' between ')
    );

    if (partyClumps.length > 0) {
        // Take the first few clumps that seem relevant to party intro
        partyContent = partyClumps.slice(0, 3).join("\n\n");
    } else {
        // Absolute fallback for party ID
        partyContent = sentences.slice(0, 5).join("\n");
    }

    if (partyContent) {
        suggestions.push({
            id: idCounter++, type: 'Party Identification', confidence: 98,
            text: partyContent.substring(0, 1000), status: 'pending'
        });
    }

    // 2. Obligation
    // Strategy: Find binding sentences, prioritizing core outcomes (compensation, award, etc.)
    const bindingSentences = sentences.filter(s =>
        (s.toLowerCase().includes('shall') ||
         s.toLowerCase().includes('undertakes') ||
         s.toLowerCase().includes('covenants') ||
         s.toLowerCase().includes('must') || 
         s.toLowerCase().includes('directed to') ||
         s.toLowerCase().includes('ordered to'))
    );
    
    // Core outcomes for court cases
    const coreOutcome = sentences.find(s => 
        (s.toLowerCase().includes('compensation') || s.toLowerCase().includes('award')) && 
        (s.toLowerCase().includes('rs.') || s.toLowerCase().includes('rupees') || s.toLowerCase().includes('paid') || s.toLowerCase().includes('deposit'))
    ) || sentences.find(s => s.toLowerCase().includes(' remand ') || s.toLowerCase().includes(' set aside '));

    const finalObligation = coreOutcome || bindingSentences.find(s => !s.toLowerCase().includes('procedural') && !s.toLowerCase().includes('witness'));

    if (finalObligation) {
        suggestions.push({
            id: idCounter++, type: 'Obligation', confidence: 94,
            text: finalObligation, status: 'pending'
        });
    }

    // 3. Effective Date / Decision Date
    const datePattern = sentences.find(s => 
        s.toLowerCase().includes('date of decision') || 
        (s.toLowerCase().includes('dated') && /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(s))
    );
    
    if (datePattern) {
        suggestions.push({
            id: idCounter++, type: 'Effective Date', confidence: 96,
            text: datePattern, status: 'pending'
        });
    }

    // 4. Procedural Requirements
    const procedural = sentences.find(s => s.toLowerCase().includes('witness') && s.toLowerCase().includes('shall') && s !== finalObligation);
    if (procedural) {
        suggestions.push({
            id: idCounter++, type: 'Procedural Requirement', confidence: 85,
            text: procedural, status: 'pending'
        });
    }

    return suggestions;
}

export default function AIAnnotationPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0x000", content: "", partyA: "Party A", partyB: "Party B" } as any;

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        if (contract.content) {
            setSuggestions(generateMockSuggestions(contract.content, contract));
        }
    }, [contract.content, contract.id]);

    const pendingCount = suggestions.filter(s => s.status === 'pending').length;
    const totalCount = suggestions.length;

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

    const allReviewed = pendingCount === 0;

    const renderHighlightedContent = () => {
        if (!contract.content) {
            return (
                <div className="text-muted-foreground italic flex items-center justify-center h-full">
                    No document text available. Please re-ingest the document.
                </div>
            );
        }

        const paragraphs = contract.content.split('\n\n');
        const partyA = contract.partyA;
        const partyB = contract.partyB;
        
        // Helper to underline entities within an element (string or mark)
        const underlineEntities = (text: string, keyPrefix: string) => {
            if (!text) return [text];
            let elements: any[] = [text];

            [partyA, partyB].forEach((partyName, pIdx) => {
                if (!partyName || partyName === 'Party A' || partyName === 'Party B' || partyName === 'Counter Party') return;
                
                const newElements: any[] = [];
                elements.forEach((el, elIdx) => {
                    if (typeof el === 'string') {
                        const parts = el.split(new RegExp(`(${partyName})`, 'g'));
                        parts.forEach((part, partIdx) => {
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
                elements.forEach((el, elIdx) => {
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

            // After applying markings, we need to apply underlining to the remaining string parts
            const finalElements = elements.map((el, elIdx) => {
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
            {/* Global Warning Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                AI suggestions are NOT legally binding. Human review is required before execution.
            </div>

            {/* Header bar */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-background z-10">
                <div>
                    <h1 className="text-2xl font-bold">AI Annotation Review</h1>
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

                {/* Right Panel: Suggestions */}
                <div className="w-1/2 bg-background p-6 overflow-y-auto flex flex-col gap-4">
                    <h3 className="font-semibold text-lg flex items-center justify-between">
                        Extracted Entities & Clauses
                        {allReviewed && <span className="text-green-500 text-sm flex items-center gap-1"><Check className="h-4 w-4" /> All Clear</span>}
                    </h3>

                    {suggestions.map((suggestion) => (
                        <Card key={suggestion.id} className={`transition-all ${suggestion.status === 'accepted' ? 'border-green-500/50 bg-green-500/5' : suggestion.status === 'rejected' ? 'border-red-500/50 bg-red-500/5 opacity-60' : 'border-border'}`}>
                            <CardHeader className="pb-2 flex flex-row justify-between items-start">
                                <div>
                                    <CardTitle className="text-base">{suggestion.type}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1 tracking-wide">CONFIDENCE: {suggestion.confidence}%</p>
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
                                            <Button variant="outline" size="sm" onClick={cancelEdit}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveEdit(suggestion.id)}>
                                                Save
                                            </Button>
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
                    ))}
                </div>
            </div>
        </div>
    );
}

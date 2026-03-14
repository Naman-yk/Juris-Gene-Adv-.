"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProvenanceBadge } from '@/components/ui/provenance-badge';
import { AIOptionalBanner } from '@/components/ui/explainability';

export default function HumanReviewGatePage({ params }: { params: { id: string } }) {
    const router = useRouter();

    const [checklist, setChecklist] = useState({
        parties: false,
        clauses: false,
        obligations: false,
        rights: false,
    });

    const toggleCheck = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const allChecked = Object.values(checklist).every(Boolean);

    // Simulated state: assumes the LLM suggestions have all been accepted and converted to HUMAN_CONFIRMED
    const hasAIGenerated = false;

    return (
        <>
            <AIOptionalBanner />
            <div className="container max-w-3xl py-10">
                <div className="mb-8 flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Human Review Gate</h1>
                        <p className="text-muted-foreground mt-1">
                            Contract ID: {params.id}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Provenance Check</CardTitle>
                            <CardDescription>
                                Ensures no unverified AI data persists into the execution state.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasAIGenerated ? (
                                <div className="bg-destructive/10 text-destructive p-4 rounded-md flex gap-3 items-start border border-destructive/20">
                                    <ShieldAlert className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-sm">Action Required</h4>
                                        <p className="text-sm mt-1">There are still unreviewed AI suggestions. You must review all identified elements before finalizing.</p>
                                        <Button variant="outline" size="sm" className="mt-3 bg-background" onClick={() => router.push(`/contracts/${params.id}/annotate`)}>
                                            Return to Annotation
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center justify-between border border-green-500/20">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">Zero AI_GENERATED elements detected.</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <ProvenanceBadge type="HUMAN_CONFIRMED" />
                                        <ProvenanceBadge type="RULE_DERIVED" />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Final Confirmation Checklist</CardTitle>
                            <CardDescription>
                                Please verify that the logical structure accurately reflects the legal intent.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <label className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 accent-primary"
                                    checked={checklist.parties}
                                    onChange={() => toggleCheck('parties')}
                                />
                                <div>
                                    <h4 className="font-medium text-sm">Parties Confirmed</h4>
                                    <p className="text-muted-foreground text-sm mt-0.5">Verification of all contracting entities, including legal names, corporate status, and signing authority representations.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 accent-primary"
                                    checked={checklist.clauses}
                                    onChange={() => toggleCheck('clauses')}
                                />
                                <div>
                                    <h4 className="font-medium text-sm">Clauses Confirmed</h4>
                                    <p className="text-muted-foreground text-sm mt-0.5">Validation of operative provisions, ensuring that covenants, representations, and warranties are accurately captured.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 accent-primary"
                                    checked={checklist.obligations}
                                    onChange={() => toggleCheck('obligations')}
                                />
                                <div>
                                    <h4 className="font-medium text-sm">Obligations Confirmed</h4>
                                    <p className="text-muted-foreground text-sm mt-0.5">Comprehensive audit of performance requirements, payment milestones, and operational duties to ensure enforceability.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 accent-primary"
                                    checked={checklist.rights}
                                    onChange={() => toggleCheck('rights')}
                                />
                                <div>
                                    <h4 className="font-medium text-sm">Rights Confirmed</h4>
                                    <p className="text-muted-foreground text-sm mt-0.5">Confirmation of discretionary permissions, termination rights, and structural entitlements for interest protection.</p>
                                </div>
                            </label>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-4 gap-4">
                        <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/annotate`)}>
                            Back to Review
                        </Button>
                        <Button
                            disabled={!allChecked || hasAIGenerated}
                            size="lg"
                            onClick={() => router.push(`/contracts/${params.id}/core`)}
                        >
                            Finalize Contract Structure <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShieldCheck, Database, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';

export default function VerifySearchPage() {
    const router = useRouter();
    const [hash, setHash] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hash.trim() || hash.length < 10) return;

        setIsSearching(true);
        // Simulate network delay for block explorer
        setTimeout(() => {
            router.push(`/verify/${hash.trim()}`);
        }, 600);
    };

    return (
        <div className="container py-12 max-w-4xl min-h-[80vh] flex flex-col justify-center">
            <div className="text-center mb-10">
                <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
                <h1 className="text-4xl font-extrabold tracking-tight mb-3">Public Execution Explorer</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Cryptographically verify any state transition on the Jurisdiction Node network. Enter an Execution Hash to inspect the exact input event, the underlying contract architecture, and the Layer 1 settlement anchor.
                </p>
            </div>

            <Card className="border-primary/20 shadow-lg shadow-primary/5">
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Enter Execution Hash (e.g., 0x4abc123...)"
                                className="w-full pl-10 pr-4 py-4 text-lg font-mono rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                value={hash}
                                onChange={(e) => setHash(e.target.value)}
                                disabled={isSearching}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="py-4 h-auto text-lg w-full md:w-auto px-8"
                            disabled={isSearching || hash.length < 10}
                        >
                            {isSearching ? 'Searching Ledger...' : 'Verify Hash'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                    <Database className="w-6 h-6 text-blue-500 mx-auto" />
                    <h3 className="font-semibold">Immutable Record</h3>
                    <p className="text-sm text-muted-foreground">Every state change is cryptographically bound to its triggering event.</p>
                </div>
                <div className="space-y-2">
                    <ShieldCheck className="w-6 h-6 text-green-500 mx-auto" />
                    <h3 className="font-semibold">Zero-Knowledge</h3>
                    <p className="text-sm text-muted-foreground">Verify execution paths without exposing private contract variables.</p>
                </div>
                <div className="space-y-2">
                    <LayoutDashboard className="w-6 h-6 text-purple-500 mx-auto" />
                    <h3 className="font-semibold">Deterministic</h3>
                    <p className="text-sm text-muted-foreground">Replay the exact same inputs to mathematically prove the output state.</p>
                </div>
            </div>
        </div>
    );
}

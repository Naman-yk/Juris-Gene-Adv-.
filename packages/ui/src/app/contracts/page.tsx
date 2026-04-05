"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Search, UploadCloud, Plus, Loader2, RefreshCw, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HashBadge } from '@/components/ui/hash-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useContractStore } from '@/lib/stores';
import { uploadContract } from '@/lib/api';

export default function ContractsPage() {
    const router = useRouter();
    const { contracts, loadDemoContracts } = useContractStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDemoContracts().finally(() => {
            setIsInitialLoad(false);
        });
    }, [loadDemoContracts]);

    const filteredContracts = contracts.filter((c) =>
        (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.parties || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.hash || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            await uploadContract(file);
            // Refresh contract list after successful upload
            await loadDemoContracts();
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Failed to upload contract');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (isInitialLoad) {
        return (
            <div className="container py-8 max-w-5xl flex items-center justify-center h-[60vh]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" /> Semantic Contracts
                    </h1>
                    <p className="text-muted-foreground">Manage, analyze, and execute smart legal contracts deterministically.</p>
                </div>

                <div className="flex gap-3 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.txt,.json,.docx"
                    />
                    <Button
                        onClick={() => router.push('/contracts/jg-demo-138/core')}
                        className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg shadow-emerald-600/20"
                    >
                        <Play className="mr-2 h-5 w-5" />
                        Run Demo
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
                        {isUploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                        {isUploading ? 'Uploading...' : 'Upload File'}
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/contracts/new')}>
                        <Plus className="mr-2 h-4 w-4" /> New Blank
                    </Button>
                </div>
            </div>

            {uploadError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive text-destructive text-sm flex items-center gap-2">
                    ⚠ {uploadError}
                </div>
            )}

            <Card className="glass-panel border-slate-800/60 bg-slate-950/20">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">Contract Registry</CardTitle>
                            <CardDescription>All ingested and extracted semantic contracts</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search title, party, or hash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredContracts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg border-slate-800 bg-slate-900/30">
                            {searchQuery ? 'No contracts found matching your search.' : 'No contracts in the registry.'}
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {filteredContracts.map((contract) => (
                                <div
                                    key={contract.id}
                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-cyan-800/50 transition-all cursor-pointer shadow-sm hover:shadow-cyan-900/10"
                                    onClick={() => router.push(`/contracts/${contract.id}/core`)}
                                >
                                    <div className="flex-1 min-w-0 mb-3 md:mb-0">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <h4 className="font-semibold text-base truncate">{contract.title}</h4>
                                            <StatusBadge status={contract.status as any} />
                                        </div>
                                        <div className="text-sm tracking-wide text-slate-400 mb-2 truncate">
                                            {contract.parties}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs text-slate-500">
                                            <HashBadge hash={contract.hash} truncateLength={10} className="py-0.5 px-1.5" />
                                            <span className="font-mono">ID: {contract.id}</span>
                                            <span>Updated: <span className="font-mono text-slate-400">{contract.updatedAt || 'Unknown'}</span></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center self-end md:self-auto pl-4">
                                        <div className="flex items-center gap-2 text-sm text-cyan-500 font-medium group-hover:text-cyan-400 transition-colors">
                                            Inspect <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

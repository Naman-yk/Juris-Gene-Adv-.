"use client";

import React, { useState, useCallback } from 'react';
import { UploadCloud, File, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PipelineIndicator } from '@/components/ui/pipeline-indicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';
import { useContractStore } from '@/lib/stores';
import { uploadContract } from '@/lib/api';

const INGESTION_STEPS = [
    { id: 'extract', label: 'Extract PDF' },
    { id: 'ocr', label: 'OCR & Vision' },
    { id: 'parse', label: 'Parse Clauses' },
    { id: 'hash', label: 'Generate Hash' },
];

export default function NewContractPage() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [result, setResult] = useState<any>(null);
    const addContract = useContractStore((state) => state.setContracts);
    const contracts = useContractStore((state) => state.contracts);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const simulateProcessing = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Upload to backend to trigger accurate parsing Pipeline
            const response = await uploadContract(file);
            const { contract } = response;
            
            // Re-sync store to ensure the new contract is available in the UI list
            await useContractStore.getState().loadDemoContracts();

            let step = 0;
            const interval = setInterval(() => {
                step++;
                setCurrentStep(step);
                if (step >= INGESTION_STEPS.length) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsProcessing(false);
                        const newResult = {
                            id: contract.id,
                            pages: contract.pages || Math.max(1, Math.ceil((contract.content?.length || 0) / 3000)),
                            sections: contract.clauses?.length || 1,
                            confidence: (80 + Math.random() * 19).toFixed(1),
                            hash: contract.hash,
                        };
                        setResult(newResult);
                    }, 800);
                }
            }, 800); // Faster fake animation time since backend already did the work
        } catch (e) {
            console.error("Failed to upload document", e);
            setIsProcessing(false);
            alert("Upload failed. Please check the backend connection.");
        }
    };

    return (
        <div className="container max-w-4xl py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Ingest Contract</h1>
                <p className="text-muted-foreground mt-2">
                    Upload a physical or digital contract PDF to begin the JurisGenie pipeline.
                </p>
            </div>

            {!isProcessing && !result && (
                <Card>
                    <CardContent className="pt-6">
                        <div
                            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-primary/10 p-4 mb-4">
                                    <UploadCloud className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">Upload your contract</h3>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                    Drag and drop your PDF file here, or click to browse from your computer.
                                </p>
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                />
                                <Button asChild variant="outline">
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        Browse Files
                                    </label>
                                </Button>
                            </div>

                            {file && (
                                <div className="mt-8 flex items-center gap-3 bg-background border rounded-md p-3 w-full max-w-md">
                                    <File className="h-8 w-8 text-blue-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <Button onClick={simulateProcessing} size="sm">
                                        Ingest
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4" />
                            <span>Mock Mode: For development, processing is simulated and no data leaves your browser.</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isProcessing && (
                <Card>
                    <CardHeader className="text-center pb-2">
                        <CardTitle>Processing Pipeline</CardTitle>
                        <CardDescription>JurisGenie is analyzing your document...</CardDescription>
                    </CardHeader>
                    <CardContent className="py-12 flex justify-center">
                        <div className="w-full max-w-2xl px-8">
                            <PipelineIndicator steps={INGESTION_STEPS} currentStepIndex={currentStep} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {result && (
                <Card className="border-green-500/30 overflow-hidden">
                    <div className="bg-green-500/10 px-6 py-4 flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                        <h2 className="text-lg font-semibold text-green-800 dark:text-green-400">Ingestion Complete</h2>
                    </div>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Pages Analyzed</span>
                                <span className="text-2xl font-bold">{result.pages}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Extracted Sections</span>
                                <span className="text-2xl font-bold">{result.sections}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">AI Confidence</span>
                                <span className="text-2xl font-bold text-primary">{result.confidence}%</span>
                            </div>
                            <div className="flex flex-col gap-1 items-start">
                                <span className="text-sm text-muted-foreground mb-1">Source Hash</span>
                                <HashBadge hash={result.hash} />
                            </div>
                        </div>

                        <div className="flex gap-4 justify-end border-t pt-6">
                            <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>
                                Upload Another
                            </Button>
                            <Button onClick={() => router.push(`/contracts/${result.id}/annotate`)}>
                                Proceed to AI Annotation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

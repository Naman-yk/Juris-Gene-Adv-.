"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Sparkles, Brain, Cpu, ArrowLeft, FlaskConical, Layers, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ClassicModelPage() {
    const router = useRouter();

    const futureFeatures = [
        {
            icon: Brain,
            title: 'Custom Model Training',
            description: 'Feed your own contract corpus to train specialized clause extraction and risk assessment models.',
            status: 'Planned',
        },
        {
            icon: FlaskConical,
            title: 'Model A/B Testing',
            description: 'Compare model outputs side-by-side to evaluate accuracy, recall, and precision on your contract data.',
            status: 'Planned',
        },
        {
            icon: Layers,
            title: 'Fine-Tuning Pipeline',
            description: 'Upload annotated contract datasets to fine-tune base models for domain-specific legal language.',
            status: 'Research',
        },
        {
            icon: Cpu,
            title: 'Inference Dashboard',
            description: 'Monitor model inference latency, token usage, and cost metrics across your contract processing pipeline.',
            status: 'Research',
        },
        {
            icon: Zap,
            title: 'Real-Time Predictions',
            description: 'Stream clause classifications and risk scores in real-time as contracts are being drafted or edited.',
            status: 'Concept',
        },
    ];

    return (
        <div className="container py-8 max-w-4xl h-full flex flex-col space-y-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="h-7 w-7 text-primary" /> Classic Model Hub
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Future state for feeding and managing custom AI models
                    </p>
                </div>
                <Button variant="outline" onClick={() => router.push('/')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
            </div>

            {/* Coming Soon Banner */}
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Coming Soon</h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        The Classic Model Hub will allow you to train, fine-tune, and deploy custom AI models
                        tailored to your specific contract language and compliance requirements.
                    </p>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-4 py-1">
                        Under Development
                    </Badge>
                </CardContent>
            </Card>

            {/* Feature Roadmap */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" /> Planned Features
                </h2>
                <div className="grid gap-4">
                    {futureFeatures.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-sm">{feature.title}</h3>
                                            <Badge variant="outline" className={
                                                feature.status === 'Planned' ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]' :
                                                feature.status === 'Research' ? 'bg-purple-50 text-purple-700 border-purple-200 text-[10px]' :
                                                'bg-slate-50 text-slate-700 border-slate-200 text-[10px]'
                                            }>
                                                {feature.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

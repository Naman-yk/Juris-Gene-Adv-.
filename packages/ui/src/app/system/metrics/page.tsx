"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Clock, Cpu, Link2, Server, TrendingUp, Zap, ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { fetchSystemMetrics, type MetricsData } from '@/lib/api';

export default function SystemMetricsPage() {
    const [data, setData] = useState<any[]>([]);
    const [counters, setCounters] = useState({ requestCount: 0, contractsProcessed: 0, evaluationsRun: 0, executionsRun: 0, anchorsCreated: 0 });
    const [uptime, setUptime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const loadMetrics = useCallback(async () => {
        try {
            const metrics = await fetchSystemMetrics();
            setCounters(metrics.counters);
            setUptime(metrics.uptime);

            // Transform latency history to chart-friendly format
            const chartData = metrics.latencyHistory.map((point) => ({
                time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                annotationDelay: point.annotationDelay,
                engineExecution: point.engineExecution,
                blockAnchor: point.blockAnchor,
                replayVerification: point.replayVerification,
            }));
            setData(chartData);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load metrics');
        }
    }, []);

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 5000);
        return () => clearInterval(interval);
    }, [loadMetrics]);

    const formatUptime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Helper for Custom Tooltips
    const CustomTooltip = ({ active, payload, label, unit }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-border p-3 rounded-lg shadow-xl backdrop-blur-sm">
                    <p className="text-sm font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-mono font-medium">{entry.value} {unit}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Find latest values for summary cards
    const latest = data.length > 0 ? data[data.length - 1] : null;

    return (
        <div className="container py-8 max-w-7xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                    <Activity className="h-8 w-8 text-primary" /> System Observability
                </h1>
                <p className="text-muted-foreground max-w-3xl">Live telemetry and operational health metrics across the Jurisdiction Node architecture. Polling every 5 seconds.</p>
                {error && <p className="text-destructive text-sm mt-2">⚠ {error}</p>}
            </div>

            {/* Top Level Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">AI Pipeline Latency</CardTitle>
                        <Cpu className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{latest?.annotationDelay || '—'}<span className="text-sm text-muted-foreground font-normal ml-1">ms</span></div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> <span className="text-green-500">Fast</span> (Live)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Engine Execution</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{latest?.engineExecution || '—'}<span className="text-sm text-muted-foreground font-normal ml-1">ms</span></div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> <span className="text-green-500">Nominal</span> (Deterministic)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Block Anchor Time</CardTitle>
                        <Link2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{latest ? (latest.blockAnchor / 1000).toFixed(1) : '—'}<span className="text-sm text-muted-foreground font-normal ml-1">s</span></div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1 text-amber-500" /> <span className="text-amber-500">L1 Settlement</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Server Uptime</CardTitle>
                        <Server className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatUptime(uptime)}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <ShieldCheck className="h-3 w-3 mr-1 text-green-500" /> {counters.requestCount} requests served
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* AI Annotation Latency */}
                <Card className="col-span-1 border-purple-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Cpu className="w-5 h-5 text-purple-500" /> AI Ingestion Pipeline</CardTitle>
                        <CardDescription>Time required to translate raw unstructured contract text into strict, engine-readable JSON topologies.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorAnnotation" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} minTickGap={30} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                                    <Tooltip content={<CustomTooltip unit="ms" />} />
                                    <Area type="monotone" dataKey="annotationDelay" name="Annotation Latency" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorAnnotation)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Execution Engine Latency */}
                <Card className="col-span-1 border-yellow-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Zap className="w-5 h-5 text-yellow-500" /> Deterministic Engine Velocity</CardTitle>
                        <CardDescription>Latency of the state machine executing payload transitions against protocol rules.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} minTickGap={30} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                                    <Tooltip content={<CustomTooltip unit="ms" />} />
                                    <Line type="stepAfter" dataKey="engineExecution" name="Execution Time" stroke="#eab308" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Blockchain Anchoring */}
                <Card className="col-span-1 border-blue-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Link2 className="w-5 h-5 text-blue-500" /> Global Ledger Settlement</CardTitle>
                        <CardDescription>Time required to cryptographically anchor deterministic state hashes to the underlying Layer 1 blockchain.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} barSize={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} minTickGap={30} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(1)}s`} />
                                    <Tooltip content={<CustomTooltip unit="ms" />} />
                                    <Bar dataKey="blockAnchor" name="Anchor Delay" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Replay Verification Latency */}
                <Card className="col-span-1 border-green-900/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-green-500" /> Trustless Replay Verification</CardTitle>
                        <CardDescription>Speed at which an external verifier can reconstruct and verify the active contract state.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} minTickGap={30} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(val) => `${val}ms`} />
                                    <Tooltip content={<CustomTooltip unit="ms" />} />
                                    <Line type="monotone" dataKey="replayVerification" name="Verification Speed" stroke="#22c55e" strokeWidth={3} dot={{ r: 2, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

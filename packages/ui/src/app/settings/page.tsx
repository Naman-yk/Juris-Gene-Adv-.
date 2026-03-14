"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { fetchSettings, updateSettings, type SettingsData } from '@/lib/api';

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [aiModel, setAiModel] = useState('');
    const [complianceRuleset, setComplianceRuleset] = useState('');
    const [blockchainNetwork, setBlockchainNetwork] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [autoAnchor, setAutoAnchor] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        fetchSettings()
            .then((data) => {
                setSettings(data);
                setAiModel(data.aiModel);
                setComplianceRuleset(data.complianceRuleset);
                setBlockchainNetwork(data.blockchainNetwork);
                setWebhookUrl(data.webhookUrl);
                setAutoAnchor(data.autoAnchor);
                setNotificationsEnabled(data.notificationsEnabled);
                setLoading(false);
            })
            .catch((e) => {
                setError(e.message);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const result = await updateSettings({
                aiModel,
                complianceRuleset,
                blockchainNetwork,
                webhookUrl,
                autoAnchor,
                notificationsEnabled,
            });
            setSettings(result.settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container py-8 max-w-3xl flex items-center justify-center h-[60vh]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-3xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                    <Settings className="h-8 w-8 text-primary" /> Platform Settings
                </h1>
                <p className="text-muted-foreground">Configure AI model, compliance rules, blockchain network, and webhook integrations.</p>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive text-destructive text-sm">
                    ⚠ {error}
                </div>
            )}

            {saved && (
                <div className="p-3 rounded-lg bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Settings saved successfully.
                </div>
            )}

            <div className="space-y-6">
                {/* AI Model */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">AI Model</CardTitle>
                        <CardDescription>Select the AI model used for contract annotation and analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                        >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                        </select>
                    </CardContent>
                </Card>

                {/* Compliance Ruleset */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Compliance Ruleset</CardTitle>
                        <CardDescription>Jurisdiction-specific rule set for contract evaluation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <select
                            value={complianceRuleset}
                            onChange={(e) => setComplianceRuleset(e.target.value)}
                            className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                        >
                            <option value="US-CA-v1">US – California (v1)</option>
                            <option value="US-NY-v1">US – New York (v1)</option>
                            <option value="US-DE-v1">US – Delaware (v1)</option>
                            <option value="EU-GDPR-v1">EU – GDPR (v1)</option>
                            <option value="IN-CONTRACT-v1">Global – Standard Contract Act (v1)</option>
                        </select>
                    </CardContent>
                </Card>

                {/* Blockchain Network */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Blockchain Network</CardTitle>
                        <CardDescription>Target EVM network for state hash anchoring.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <select
                            value={blockchainNetwork}
                            onChange={(e) => setBlockchainNetwork(e.target.value)}
                            className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                        >
                            <option value="sepolia">Ethereum Sepolia (Testnet)</option>
                            <option value="goerli">Ethereum Goerli (Testnet)</option>
                            <option value="mainnet">Ethereum Mainnet</option>
                            <option value="polygon">Polygon PoS</option>
                            <option value="arbitrum">Arbitrum One</option>
                        </select>
                    </CardContent>
                </Card>

                {/* Webhook URL */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Webhook URL</CardTitle>
                        <CardDescription>Receive POST notifications when contract state changes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-server.com/webhook"
                            className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none placeholder:text-muted-foreground"
                        />
                    </CardContent>
                </Card>

                {/* Toggles */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <div className="font-medium">Auto-Anchor</div>
                                <div className="text-sm text-muted-foreground">Automatically anchor state hashes after execution</div>
                            </div>
                            <button
                                onClick={() => setAutoAnchor(!autoAnchor)}
                                className={`relative w-12 h-7 rounded-full transition-colors ${autoAnchor ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoAnchor ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <div className="font-medium">Notifications</div>
                                <div className="text-sm text-muted-foreground">Enable in-app and webhook notifications</div>
                            </div>
                            <button
                                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                                className={`relative w-12 h-7 rounded-full transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <Button
                    className="w-full h-12 text-lg font-medium"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="mr-2 h-5 w-5" /> Save Settings</>
                    )}
                </Button>
            </div>
        </div>
    );
}

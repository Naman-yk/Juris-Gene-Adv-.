"use client";

import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LifecycleGateProps {
    /** The icon to display */
    icon?: React.ComponentType<{ className?: string }>;
    /** Title text for the gate */
    title: string;
    /** Description explaining the prerequisite */
    message: string;
    /** Label for the CTA button */
    ctaLabel: string;
    /** Route to navigate to */
    ctaHref: string;
    /** Additional className for outer container */
    className?: string;
}

export function LifecycleGate({
    icon: Icon = Shield,
    title,
    message,
    ctaLabel,
    ctaHref,
    className = "",
}: LifecycleGateProps) {
    const router = useRouter();

    return (
        <div className={`flex-1 p-8 flex items-center justify-center h-[70vh] ${className}`}>
            <div className="text-center p-12 border border-dashed border-amber-800/50 rounded-xl bg-amber-950/10 max-w-lg mx-auto">
                <Icon className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-3 text-amber-400">{title}</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">{message}</p>
                <Button
                    onClick={() => router.push(ctaHref)}
                    className="bg-amber-600 hover:bg-amber-700 w-full py-6 text-lg"
                >
                    {ctaLabel}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

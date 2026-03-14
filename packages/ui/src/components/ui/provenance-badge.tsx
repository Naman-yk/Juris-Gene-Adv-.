import React from 'react';
import { Bot, UserCheck, ShieldCheck } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const provenanceBadgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
    {
        variants: {
            type: {
                AI_GENERATED: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                HUMAN_CONFIRMED: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
                RULE_DERIVED: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
            },
        },
        defaultVariants: {
            type: "AI_GENERATED",
        },
    }
);

export interface ProvenanceBadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof provenanceBadgeVariants> {
    label?: string;
}

export function ProvenanceBadge({ className, type = "AI_GENERATED", label, ...props }: ProvenanceBadgeProps) {
    const Icon = {
        AI_GENERATED: Bot,
        HUMAN_CONFIRMED: UserCheck,
        RULE_DERIVED: ShieldCheck,
    }[type || "AI_GENERATED"];

    const defaultLabel = {
        AI_GENERATED: "AI Generated",
        HUMAN_CONFIRMED: "Human Confirmed",
        RULE_DERIVED: "Rule Derived",
    }[type || "AI_GENERATED"];

    return (
        <div className={cn(provenanceBadgeVariants({ type }), className)} {...props}>
            <Icon className="h-3.5 w-3.5" />
            {label || defaultLabel}
        </div>
    );
}

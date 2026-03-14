import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            status: {
                VERIFIED: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
                REPLAY_SAFE: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                HASH_MATCH: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-400",
                PENDING: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                ERROR: "border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive-foreground",
                default: "border-transparent bg-secondary text-secondary-foreground",
            },
        },
        defaultVariants: {
            status: "default",
        },
    }
);

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
    label?: string;
}

export function StatusBadge({ className, status, label, ...props }: StatusBadgeProps) {
    return (
        <div className={cn(statusBadgeVariants({ status }), className)} {...props}>
            {label || status}
        </div>
    );
}

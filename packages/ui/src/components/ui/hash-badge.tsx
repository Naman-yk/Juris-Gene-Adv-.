import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface HashBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    hash: string;
    truncateLength?: number;
}

export function HashBadge({ hash, truncateLength = 8, className, ...props }: HashBadgeProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const truncated = hash.length > truncateLength * 2
        ? `${hash.substring(0, truncateLength)}...${hash.substring(hash.length - truncateLength)}`
        : hash;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-0.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:bg-muted cursor-pointer",
                            className
                        )}
                        onClick={handleCopy}
                        {...props}
                    >
                        {truncated}
                        {copied ? (
                            <Check className="h-3 w-3 text-green-500" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-mono text-xs">
                    <p>{hash}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

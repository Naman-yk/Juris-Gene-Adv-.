"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
    id: string;
    label: string;
}

interface PipelineIndicatorProps {
    steps: Step[];
    currentStepIndex: number;
    className?: string;
}

export function PipelineIndicator({ steps, currentStepIndex, className }: PipelineIndicatorProps) {
    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-muted -translate-y-1/2 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{
                            width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`,
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>

                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isPending = index > currentStepIndex;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <motion.div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors duration-300",
                                    isCompleted
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : isCurrent
                                            ? "border-primary bg-background text-primary"
                                            : "border-muted bg-background text-muted-foreground"
                                )}
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.1 : 1,
                                    boxShadow: isCurrent ? "0 0 0 4px rgba(59, 130, 246, 0.15)" : "none",
                                }}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </motion.div>
                            <div className="absolute top-10 w-24 text-center">
                                <p
                                    className={cn(
                                        "text-xs font-medium transition-colors duration-300",
                                        isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {step.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

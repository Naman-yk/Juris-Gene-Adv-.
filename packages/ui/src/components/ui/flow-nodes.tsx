import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, AlertTriangle, PlayCircle, StopCircle, PauseCircle, HelpCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CustomStateNode = memo(({ data, isConnectable }: any) => {
    const isActive = data.isActive;
    const stateLabels: Record<string, string> = {
        DRAFT: 'Draft',
        ACTIVE: 'Active',
        BREACHED: 'Breached',
        SUSPENDED: 'Suspended',
        DISPUTED: 'Disputed',
        TERMINATED: 'Terminated',
        EXPIRED: 'Expired',
    };

    const getStateIcon = (state: string) => {
        switch (state) {
            case 'DRAFT': return <FileText className="w-4 h-4" />;
            case 'ACTIVE': return <PlayCircle className="w-4 h-4 text-green-500" />;
            case 'BREACHED': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'SUSPENDED': return <PauseCircle className="w-4 h-4 text-yellow-500" />;
            case 'DISPUTED': return <HelpCircle className="w-4 h-4 text-purple-500" />;
            case 'TERMINATED': return <StopCircle className="w-4 h-4 text-red-500" />;
            case 'EXPIRED': return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
            default: return null;
        }
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'DRAFT': return 'border-gray-300 bg-gray-50 text-gray-700';
            case 'ACTIVE': return 'border-green-300 bg-green-50 text-green-700';
            case 'BREACHED': return 'border-orange-300 bg-orange-50 text-orange-700';
            case 'SUSPENDED': return 'border-yellow-300 bg-yellow-50 text-yellow-700';
            case 'DISPUTED': return 'border-purple-300 bg-purple-50 text-purple-700';
            case 'TERMINATED': return 'border-red-300 bg-red-50 text-red-700';
            case 'EXPIRED': return 'border-gray-300 bg-gray-50 text-gray-700';
            default: return 'border-gray-300 bg-white text-gray-700';
        }
    };

    return (
        <div className={cn(
            "px-4 py-3 shadow-md rounded-xl border-2 min-w-[150px] transition-all duration-300",
            getStateColor(data.state),
            isActive ? "ring-4 ring-primary/30 ring-offset-2 scale-105 shadow-lg relative z-10" : "opacity-80 hover:opacity-100"
        )}>
            {isActive && (
                <span className="absolute -top-3 -right-3 flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-6 w-6 bg-primary items-center justify-center text-[10px] text-white font-bold">✓</span>
                </span>
            )}

            {/* Inputs (Top, Left, Bottom, Right) depending on graph layout needs */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" isConnectable={isConnectable} />
            <Handle type="target" position={Position.Left} id="left-in" className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full opacity-0" isConnectable={isConnectable} />

            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/60 shadow-sm">
                    {getStateIcon(data.state)}
                </div>
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">STATE</div>
                    <div className="font-semibold text-sm">{stateLabels[data.state] || data.state}</div>
                </div>
            </div>

            {/* Outputs (Bottom, Right, Top, Left) */}
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary border-2 border-white rounded-full" isConnectable={isConnectable} />
            <Handle type="source" position={Position.Right} id="right-out" className="w-3 h-3 bg-primary border-2 border-white rounded-full opacity-0" isConnectable={isConnectable} />
            <Handle type="source" position={Position.Bottom} id="bottom-out" className="w-3 h-3 bg-primary border-2 border-white rounded-full opacity-0" isConnectable={isConnectable} />
            <Handle type="source" position={Position.Top} id="top-out" className="w-3 h-3 bg-primary border-2 border-white rounded-full opacity-0" isConnectable={isConnectable} />
        </div>
    );
});

import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AnimatedEdge = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style = {},
    markerEnd,
}: any) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isAnimated = data?.isAnimated;
    const isBackwards = sourceX > targetX; // Simple heuristic to show a 'return' edge

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: isAnimated ? 3 : 2,
                    stroke: isAnimated ? '#3b82f6' : '#cbd5e1', // primary blue vs muted gray
                    ...(isAnimated ? { strokeDasharray: '5', animation: 'dashdraw 1s linear infinite' } : {})
                }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className={cn(
                        "nodrag nopan bg-white border shadow-sm rounded-full px-2 py-1 text-[10px] font-bold tracking-wider cursor-pointer transition-all hover:scale-110 hover:shadow-md flex items-center gap-1 z-20",
                        isAnimated ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-border hover:text-foreground"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (data?.onClick) data.onClick(data);
                    }}
                >
                    {isBackwards ? <RotateCcw className="w-2.5 h-2.5" /> : null}
                    {data?.label || id}
                </div>
            </EdgeLabelRenderer>
        </>
    );
});

// We need an accompanying CSS class for the animation
export const flowStyles = `
  .animated-svg-path {
    stroke-dasharray: 5;
    animation: dashdraw 1s linear infinite;
  }
  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
  }
`;

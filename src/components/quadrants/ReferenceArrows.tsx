import React, { useEffect, useState } from 'react';
import { useJvmStore } from '../../store/useJvmStore';

interface ArrowConnection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  id: string;
}

const ReferenceArrows: React.FC = () => {
  const [connections, setConnections] = useState<ArrowConnection[]>([]);
  const { stack, heap, currentStepIndex } = useJvmStore();

  useEffect(() => {
    const updateArrows = () => {
      const vars = document.querySelectorAll('[data-var-ref]');
      const newConnections: ArrowConnection[] = [];

      vars.forEach((varEl) => {
        const refId = varEl.getAttribute('data-var-ref');
        if (!refId) return;

        const heapEl = document.querySelector(`[data-heap-id="${refId}"]`);
        if (!heapEl) return;

        const varRect = varEl.getBoundingClientRect();
        const heapRect = heapEl.getBoundingClientRect();

        // Calculate positions relative to viewport
        const startX = varRect.right;
        const startY = varRect.top + varRect.height / 2;
        const endX = heapRect.left - 5;
        const endY = heapRect.top + 20;

        newConnections.push({
          id: `arrow-${refId}-${varRect.top}-${heapRect.top}`,
          startX,
          startY,
          endX,
          endY,
        });
      });

      setConnections(newConnections);
    };

    updateArrows();
    
    window.addEventListener('resize', updateArrows);
    
    // Poll to keep arrows attached during framer-motion layout animations
    const interval = setInterval(updateArrows, 30);

    return () => {
      window.removeEventListener('resize', updateArrows);
      clearInterval(interval);
    };
  }, [stack, heap, currentStepIndex]);

  return (
    <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-[100]">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(251, 191, 36, 0.8)" />
        </marker>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(251, 191, 36, 0.8)" />
          <stop offset="100%" stopColor="rgba(251, 191, 36, 0.3)" />
        </linearGradient>
      </defs>
      {connections.map((c) => {
        // Curve control points for a smooth flowing cubic bezier
        const ctrl1X = c.startX + (c.endX - c.startX) * 0.4;
        const ctrl1Y = c.startY;
        const ctrl2X = c.startX + (c.endX - c.startX) * 0.6;
        const ctrl2Y = c.endY;

        const pathData = `M ${c.startX} ${c.startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${c.endX} ${c.endY}`;

        return (
          <g key={c.id}>
            <path
              d={pathData}
              fill="none"
              stroke="url(#beamGrad)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead)"
              style={{ filter: 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.6))' }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ReferenceArrows;

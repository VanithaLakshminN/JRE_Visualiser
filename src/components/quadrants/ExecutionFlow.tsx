import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useJvmStore } from '../../store/useJvmStore';

const ExecutionFlow: React.FC = () => {
  const { dynamicSteps, currentStepIndex } = useJvmStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  const visibleSteps = dynamicSteps.slice(0, currentStepIndex);

  return (
    <div className="w-full h-full flex flex-col items-center relative py-4 px-2 overflow-y-auto" ref={scrollRef}>
      {visibleSteps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 italic">
          Waiting for execution...
        </div>
      )}

      {visibleSteps.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center w-full max-w-[200px]">
          {/* Connector Line */}
          {idx > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 24, opacity: 1 }}
              className="w-0.5 bg-emerald-500/50 my-1 relative"
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-emerald-500/80 rotate-45"></div>
            </motion.div>
          )}

          {/* Event Node */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`w-full text-center px-3 py-2 rounded-md border text-xs font-semibold tracking-wide shadow-sm ${
              idx === visibleSteps.length - 1
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#1f2937] border-gray-700 text-gray-300'
            }`}
          >
            {step.explanation || step.action}
          </motion.div>
        </div>
      ))}
    </div>
  );
};

export default ExecutionFlow;

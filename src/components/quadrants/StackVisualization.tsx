import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJvmStore } from '../../store/useJvmStore';

const StackVisualization: React.FC = () => {
  const { stack } = useJvmStore();

  return (
    <div className="flex flex-col justify-end min-h-full gap-3 py-2 px-1 relative z-10">
      <AnimatePresence>
        {stack.map((frame) => (
          <motion.div
            key={frame.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`relative z-10 rounded-lg border bg-[#161b22]/80 backdrop-blur-sm transition-all duration-300 ${
              frame.isActive 
                ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/30' 
                : 'border-gray-700/50 opacity-60 grayscale-[0.3]'
            }`}
          >
            {/* Frame Header */}
            <div className={`px-3 py-1.5 flex items-center justify-between border-b ${
              frame.isActive 
                ? 'border-blue-500/30 bg-blue-500/20' 
                : 'border-gray-800 bg-[#0d1117]'
            }`}>
              <span className={`text-xs font-bold font-mono ${
                frame.isActive ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'text-gray-400'
              }`}>
                {frame.methodName}()
              </span>
              {frame.isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse"></div>
              )}
            </div>

            {/* Local Variables */}
            <div className="p-2 flex flex-col gap-1.5">
              {Object.values(frame.variables).length === 0 && (
                <div className="text-[10px] text-gray-500 italic text-center py-1">No locals</div>
              )}
              {Object.values(frame.variables).map(vari => (
                <div key={vari.name} className="flex items-center justify-between bg-black/40 border border-white/5 rounded px-2 py-1 text-xs font-mono shadow-inner">
                  <div className="flex gap-2">
                    <span className="text-purple-400/80">{vari.type}</span>
                    <span className="text-gray-300">{vari.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">=</span>
                    <span 
                      data-var-ref={vari.referenceId || ''} 
                      data-frame-id={frame.id}
                      className={`font-bold ${vari.referenceId ? 'text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.5)]' : 'text-emerald-400'}`}>
                      {vari.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {stack.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
           <div className="w-12 h-12 rounded-full border border-blue-500/20 bg-blue-500/5 flex items-center justify-center mb-3">
             <div className="w-3 h-3 rounded-full bg-blue-500/40 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
           </div>
           <p className="text-sm font-medium text-blue-400/70 mb-1">No active stack frames</p>
           <p className="text-xs text-gray-500">Waiting for method invocation...</p>
        </div>
      )}
    </div>
  );
};

export default StackVisualization;

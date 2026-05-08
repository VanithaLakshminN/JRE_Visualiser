import React from 'react';
import { useJvmStore } from '../../store/useJvmStore';
import { motion, AnimatePresence } from 'framer-motion';

const MetaspaceVisualization: React.FC = () => {
  const { metaspace } = useJvmStore();
  const classes = Object.values(metaspace);

  return (
    <div className="flex flex-col gap-3 h-full">
      {classes.length === 0 && (
        <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
          No classes loaded
        </div>
      )}

      <AnimatePresence>
        {classes.map((cls) => (
          <motion.div 
            key={cls.name} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#161b22]/90 backdrop-blur-md border border-purple-500/30 rounded-lg overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:border-purple-500/60 transition-colors"
          >
            {/* Header */}
            <div className="bg-purple-500/10 px-3 py-2 border-b border-purple-500/20 flex items-center gap-2">
              <div className="w-5 h-5 rounded border border-purple-500/50 bg-purple-900/50 flex items-center justify-center text-[10px] text-purple-300 font-bold">
                C
              </div>
              <span className="font-semibold text-purple-300 text-xs tracking-wide">{cls.name}</span>
            </div>
            
            <div className="p-3 flex flex-col gap-3">
              {/* Methods */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Method Area</div>
                <div className="flex flex-wrap gap-1.5">
                  {cls.methods.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-black/30 border border-white/5 rounded text-[10px] font-mono text-gray-300 hover:text-white transition-colors cursor-default">
                      {m}()
                    </span>
                  ))}
                  {cls.methods.length === 0 && <span className="text-[10px] text-gray-600 italic">No methods</span>}
                </div>
              </div>

              {/* Static Variables */}
              {Object.keys(cls.staticVariables).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Static Fields</div>
                  <div className="bg-black/20 rounded border border-white/5 p-1.5 flex flex-col gap-1">
                    {Object.entries(cls.staticVariables).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px] font-mono px-1">
                        <span className="text-purple-400">{k}</span>
                        <span className="text-gray-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MetaspaceVisualization;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJvmStore } from '../../store/useJvmStore';

const HeapMemory2D: React.FC = () => {
  const { heap } = useJvmStore();
  const heapObjects = Object.values(heap);

  return (
    <div className="w-full h-full flex flex-wrap gap-4 items-start p-2 relative z-10">
      {heapObjects.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
           <div className="w-12 h-12 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center mb-3">
             <div className="w-3 h-3 rounded-full bg-amber-500/40 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
           </div>
           <p className="text-sm font-medium text-amber-400/70 mb-1">Heap Memory is dormant</p>
           <p className="text-xs text-gray-500">Waiting for object instantiation or array allocation...</p>
        </div>
      )}

      <AnimatePresence>
        {heapObjects.map((obj) => (
          <motion.div
            key={obj.id}
            data-heap-id={obj.id}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-48 bg-[#1f2937]/80 backdrop-blur-sm rounded-lg overflow-hidden border transition-all duration-300 relative z-10 ${
              obj.isMarkedForGC 
                ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-gc-ripple' 
                : 'border-amber-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-amber-500/60'
            }`}
          >
            {/* Header */}
            <div className={`px-3 py-1.5 flex justify-between items-center border-b ${
              obj.isMarkedForGC ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <span className={`text-xs font-bold drop-shadow-[0_0_3px_rgba(251,191,36,0.3)] ${obj.isMarkedForGC ? 'text-red-400' : 'text-amber-400'}`}>
                {obj.type} Object
              </span>
              <span className="text-[10px] font-mono text-gray-500">@{obj.id}</span>
            </div>

            {/* Fields */}
            <div className="p-2 flex flex-col gap-1.5">
              {Object.keys(obj.fields).length === 0 && (
                <div className="text-[10px] text-gray-500 italic text-center py-1">No instance variables</div>
              )}
              {Object.entries(obj.fields).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-xs font-mono bg-black/40 rounded px-2 py-1 border border-white/5 shadow-inner">
                  <span className="text-gray-300">{key}</span>
                  <span className="text-amber-200">{String(value)}</span>
                </div>
              ))}
            </div>

            {/* GC Overlay */}
            {obj.isMarkedForGC && (
              <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
                <span className="text-red-500 font-bold tracking-widest opacity-30 -rotate-12 text-xl drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">GARBAGE</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default HeapMemory2D;

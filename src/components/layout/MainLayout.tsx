import React, { useEffect } from 'react';
import { useJvmStore } from '../../store/useJvmStore';
import CodeSegment from '../quadrants/CodeSegment';
import StackVisualization from '../quadrants/StackVisualization';
import HeapMemory2D from '../quadrants/HeapMemory2D';
import MetaspaceVisualization from '../quadrants/MetaspaceVisualization';
import ExecutionFlow from '../quadrants/ExecutionFlow';
import ReferenceArrows from '../quadrants/ReferenceArrows';
import BottomToolbar from './BottomToolbar';
import { Terminal, Keyboard } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isRunning, speed, step, compileError, output, standardInput, setStandardInput } = useJvmStore();

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        step();
      }, speed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, speed, step]);  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-gray-100 overflow-hidden font-sans">
      
      {/* Top Toolbar */}
      <BottomToolbar />

      {/* Main Split Pane Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Pane (Code Editor & Console) 55% */}
        <div className="w-[55%] flex flex-col border-r border-gray-800 bg-[#161b22]">
          
          <div className="flex-1 overflow-hidden relative border-b border-gray-800">
            <div className="h-10 px-4 flex items-center bg-[#0d1117] border-b border-gray-800 shrink-0">
              <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
                <span className="text-indigo-400">{'</>'}</span> Code Editor
              </h2>
            </div>
            <div className="absolute inset-0 top-10">
              <CodeSegment />
            </div>
          </div>

          {/* Standard Input Panel */}
          <div className="h-24 bg-[#0d1117] flex flex-col shrink-0 border-b border-gray-800">
            <div className="h-8 px-4 flex items-center bg-[#161b22] border-b border-gray-800">
              <h2 className="font-semibold text-xs text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                <Keyboard size={14} /> Standard Input (For Scanner)
              </h2>
            </div>
            <textarea 
              className="w-full flex-1 bg-[#0a0d14] text-gray-300 font-mono text-sm p-3 resize-none outline-none"
              placeholder="Enter input here (e.g. Chair\nWood,500,Recliner)"
              value={standardInput}
              onChange={(e) => setStandardInput(e.target.value)}
            />
          </div>

          {/* Console / Output Panel */}
          <div className="h-48 bg-[#0d1117] flex flex-col shrink-0">
            <div className="h-8 px-4 flex items-center bg-[#161b22] border-b border-gray-800">
              <h2 className="font-semibold text-xs text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                <Terminal size={14} /> Console Output
              </h2>
            </div>
            <div className="p-3 overflow-y-auto font-mono text-sm text-gray-300">
              {compileError ? (
                <div className="text-red-400">{compileError}</div>
              ) : (
                output.map((line, i) => (
                  <div key={i} className="mb-1">{line}</div>
                ))
              )}
              {output.length === 0 && !compileError && (
                <div className="text-gray-600 italic">No output yet...</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane (JVM Visualizations) 45% */}
        <div className="w-[45%] flex flex-col bg-[#0d1117] overflow-hidden p-2 gap-2 relative">
          <ReferenceArrows />
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
            {/* Stack Memory */}
            <div className="glass-panel flex flex-col overflow-hidden bg-[#161b22]/50 border-gray-800/80 rounded-xl relative bg-topology-grid">
              <div className="h-9 px-3 flex items-center border-b border-gray-800/80 bg-[#161b22]">
                <h2 className="font-semibold text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span> Stack Memory
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 relative">
                <StackVisualization />
              </div>
            </div>

            {/* Heap Memory 2D */}
            <div className="glass-panel flex flex-col overflow-hidden bg-[#161b22]/50 border-gray-800/80 rounded-xl relative bg-topology-grid">
              <div className="h-9 px-3 flex items-center border-b border-gray-800/80 bg-[#161b22]">
                <h2 className="font-semibold text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span> Heap Memory
                </h2>
              </div>
              <div className="flex-1 overflow-auto relative p-2">
                <HeapMemory2D />
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
            {/* Execution Flow (Replaces Thread State) */}
            <div className="glass-panel flex flex-col overflow-hidden bg-[#161b22]/50 border-gray-800/80 rounded-xl">
              <div className="h-9 px-3 flex items-center border-b border-gray-800/80 bg-[#161b22]">
                <h2 className="font-semibold text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Execution Flow
                </h2>
              </div>
              <div className="flex-1 overflow-auto relative bg-[#0a0d14]/50">
                <ExecutionFlow />
              </div>
            </div>

            {/* Metaspace (Class Definitions) */}
            <div className="glass-panel flex flex-col overflow-hidden bg-[#161b22]/50 border-gray-800/80 rounded-xl relative bg-topology-grid">
              <div className="h-9 px-3 flex items-center border-b border-gray-800/80 bg-[#161b22]">
                <h2 className="font-semibold text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span> Metaspace
                </h2>
              </div>
              <div className="flex-1 overflow-auto relative p-2">
                <MetaspaceVisualization />
              </div>
            </div>
          </div>
          
        </div>
      </main>

    </div>
  );
};

export default MainLayout;

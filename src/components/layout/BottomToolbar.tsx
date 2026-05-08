import React from 'react';
import { useJvmStore } from '../../store/useJvmStore';
import { Play, Pause, SkipForward, RotateCcw, MonitorPlay, Trash2 } from 'lucide-react';

const exampleCode = `public class Demo {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        System.out.println(a + b);
        
        Point p = new Point();
        p.x = 100;
        
        for (int i = 0; i < 3; i = i + 1) {
            System.out.println(i);
        }
        
        System.gc();
    }
}
class Point { int x; }`;

const BottomToolbar: React.FC = () => {
  const { 
    isRunning, speed, pcRegister, setEditorCode,
    play, pause, step, reset, setSpeed, compileAndRun, triggerGC 
  } = useJvmStore();

  return (
    <div className="h-14 shrink-0 bg-[#0d1117] border-b border-gray-800 flex items-center px-4 gap-6 relative z-10 justify-between">
      
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          J
        </div>
        <h1 className="text-sm font-bold text-gray-200">
          JRE Visualizer IDE
        </h1>
      </div>

      {/* Main Controls */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            setEditorCode(exampleCode);
          }}
          className="text-xs px-3 py-1.5 rounded-md bg-[#161b22] border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Load Example
        </button>

        <div className="h-4 w-px bg-gray-800 mx-2"></div>

        <button 
          onClick={compileAndRun}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-[0_0_10px_rgba(79,70,229,0.3)]"
        >
          <MonitorPlay size={16} /> Compile & Run
        </button>
        
        <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-md border border-gray-800">
          <button 
            onClick={reset}
            className="p-1.5 rounded bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Reset (R)"
          >
            <RotateCcw size={14} />
          </button>
          
          {isRunning ? (
            <button 
              onClick={pause}
              className="p-1.5 rounded bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900 transition-colors"
            >
              <Pause size={14} />
            </button>
          ) : (
            <button 
              onClick={play}
              className="p-1.5 rounded bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors"
            >
              <Play size={14} />
            </button>
          )}
          
          <button 
            onClick={step}
            className="p-1.5 rounded bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Step (Space)"
          >
            <SkipForward size={14} />
          </button>
        </div>
        
        <button 
          onClick={triggerGC}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-900/40 hover:bg-red-800/60 border border-red-800/50 text-red-300 text-xs font-medium transition-colors ml-2"
          title="Force Garbage Collection"
        >
          <Trash2 size={14} /> GC
        </button>
      </div>

      {/* Speed & Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Speed:</span>
          <input 
            type="range" 
            min="50" 
            max="1000" 
            step="50"
            value={1050 - speed} 
            onChange={(e) => setSpeed(1050 - parseInt(e.target.value))}
            className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">PC:</span>
            <span className="text-indigo-400 min-w-[3ch]">{pcRegister.toString().padStart(3, '0')}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default BottomToolbar;

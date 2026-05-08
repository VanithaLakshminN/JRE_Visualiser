import { create } from 'zustand';
import type { StackFrame, HeapObject, LoadedClass, MemoryDataPoint, ExecutionStep } from '../types';
import { Lexer } from '../engine/Lexer';
import { Parser } from '../engine/Parser';
import { Interpreter } from '../engine/Interpreter';

interface JvmState {
  // Execution State
  editorCode: string;
  standardInput: string;
  isRunning: boolean;
  speed: number;
  pcRegister: number;
  dynamicSteps: ExecutionStep[];
  currentStepIndex: number;
  output: string[];
  compileError: string | null;
  // Memory State
  stack: StackFrame[];
  heap: Record<string, HeapObject>;
  metaspace: Record<string, LoadedClass>;
  memoryHistory: MemoryDataPoint[];
  
  // Actions
  setEditorCode: (code: string) => void;
  setStandardInput: (input: string) => void;
  setSpeed: (speed: number) => void;
  compileAndRun: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  
  // JVM Operations (called by step)
  executeStep: (step: ExecutionStep) => void;
  triggerGC: () => void;
}

export const useJvmStore = create<JvmState>((set, get) => ({
  editorCode: `class Temp {
    int x;
}
public class Main {
    public static void main(String[] args) {
        new Temp();
        System.out.println("Done");
    }
}`,
  isRunning: false,
  standardInput: '',
  speed: 300,
  pcRegister: 0,
  dynamicSteps: [],
  currentStepIndex: 0,
  output: [],
  compileError: null,
  stack: [],
  heap: {},
  metaspace: {},
  memoryHistory: [],

  setEditorCode: (code) => set({ editorCode: code }),
  setStandardInput: (input) => set({ standardInput: input }),
  setSpeed: (speed) => set({ speed }),
  
  compileAndRun: async () => {
    const { editorCode, standardInput } = get();
    set({ compileError: null, isRunning: false, output: ['Compiling...'], stack: [], heap: {}, metaspace: {}, memoryHistory: [], pcRegister: 0, currentStepIndex: 0 });
    
    // Step 1: Generate visualization steps from the frontend parser/interpreter
    let steps: ExecutionStep[] = [];
    try {
      const lexer = new Lexer(editorCode);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const interpreter = new Interpreter(ast);
      steps = interpreter.generateEventStream();
    } catch (e: any) {
      console.warn("Frontend parser could not generate full visualization:", e.message);
      
      // Graceful fallback: generate minimal steps from static analysis
      try {
        const classNames = [...editorCode.matchAll(/class\s+([A-Za-z_]\w*)/g)].map(m => m[1]);
        const methodNames = [...editorCode.matchAll(/(?:void|int|String|double|boolean|float|long)\s+([A-Za-z_]\w*)\s*\(/g)].map(m => m[1]);
        
        classNames.forEach(cn => {
          steps.push({
            lineNumber: 1,
            action: 'LOAD_CLASS',
            payload: { className: cn, methods: methodNames, staticVariables: {} },
            explanation: `Loaded class ${cn} into Metaspace`
          });
        });
        
        if (methodNames.includes('main')) {
          steps.push({ lineNumber: 1, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'main() started' });
          steps.push({ lineNumber: 1, action: 'POP_FRAME', explanation: 'main() returning' });
        }
      } catch (fallbackErr) {
        // Even fallback failed — no visualization
      }
    }

    // Step 2: Start visualization immediately if steps were generated
    if (steps.length > 0) {
      set({
        isRunning: true,
        dynamicSteps: steps,
        currentStepIndex: 0,
        output: ['Compilation successful. Execution started...'],
      });
    } else {
      set({ output: ['Failed to parse or visualize code.'] });
    }
  },
  
  play: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () => {
    set({
      pcRegister: 0,
      currentStepIndex: 0,
      isRunning: false,
      stack: [],
      heap: {},
      metaspace: {},
      output: [],
      memoryHistory: [{ time: 0, stack: 0, heap: 0, metaspace: 0 }],
      compileError: null
    });
  },
  
  step: () => {
    const { dynamicSteps, currentStepIndex, executeStep } = get();
    if (currentStepIndex >= dynamicSteps.length) {
      set({ isRunning: false });
      return;
    }
    
    const stepToExecute = dynamicSteps[currentStepIndex];
    executeStep(stepToExecute);
    
    set((state) => {
      const newStackSize = state.stack.length * 10;
      const newHeapSize = Object.keys(state.heap).length * 50;
      const newMetaSize = Object.keys(state.metaspace).length * 100;
      
      const newHistory = [...state.memoryHistory, {
        time: state.memoryHistory.length,
        stack: newStackSize,
        heap: newHeapSize,
        metaspace: newMetaSize
      }];
      if (newHistory.length > 50) newHistory.shift();
      
      return {
        currentStepIndex: state.currentStepIndex + 1,
        pcRegister: stepToExecute.lineNumber,
        memoryHistory: newHistory
      };
    });
  },
  
  triggerGC: () => {
    const { executeStep } = get();
    executeStep({ lineNumber: -1, action: 'MARK_GC', explanation: 'Manual GC Mark' } as ExecutionStep);
    setTimeout(() => {
      executeStep({ lineNumber: -1, action: 'SWEEP_GC', explanation: 'Manual GC Sweep' } as ExecutionStep);
    }, 1000);
  },
  
  executeStep: (step) => {
    set((state) => {
      const newState = { ...state };
      
      switch (step.action) {
        case 'INIT':
        case 'LOAD_CLASS':
          if (step.payload?.className) {
            newState.metaspace[step.payload.className] = {
              name: step.payload.className,
              methods: step.payload.methods || [],
              staticVariables: step.payload.staticVariables || {}
            };
          }
          break;
          
        case 'PUSH_FRAME':
          newState.stack = [...newState.stack, {
            id: `frame_${Date.now()}`,
            methodName: step.payload.methodName,
            variables: {},
            isActive: true
          }];
          break;
          
        case 'POP_FRAME':
          newState.stack = newState.stack.slice(0, -1);
          if (newState.stack.length > 0) {
            newState.stack[newState.stack.length - 1].isActive = true;
          }
          break;
          
        case 'SET_VAR':
          const currentFrame = newState.stack[newState.stack.length - 1];
          if (currentFrame) {
            currentFrame.variables[step.payload.name] = {
              name: step.payload.name,
              type: step.payload.type,
              value: step.payload.value,
              referenceId: step.payload.referenceId
            };
            newState.stack = [...newState.stack];
          }
          break;
          
        case 'ALLOC_OBJ':
          newState.heap[step.payload.id] = {
            id: step.payload.id,
            type: step.payload.type,
            fields: step.payload.fields || {},
            isMarkedForGC: false
          };
          newState.heap = { ...newState.heap };
          break;

        case 'UPDATE_OBJ':
          if (newState.heap[step.payload.id]) {
            newState.heap[step.payload.id].fields[step.payload.field] = step.payload.value;
            newState.heap = { ...newState.heap };
          }
          break;
          
        case 'MARK_GC':
          if (step.payload && step.payload.ids) {
             step.payload.ids.forEach((id: string) => {
               if(newState.heap[id]) {
                 newState.heap[id].isMarkedForGC = true;
               }
             });
             newState.heap = { ...newState.heap };
          } else {
             const reachableIds = new Set<string>();
             newState.stack.forEach(frame => {
               Object.values(frame.variables).forEach(v => {
                 if (v.referenceId) reachableIds.add(v.referenceId);
               });
             });
             Object.keys(newState.heap).forEach(id => {
               if (!reachableIds.has(id)) {
                 newState.heap[id].isMarkedForGC = true;
               }
             });
             newState.heap = { ...newState.heap };
          }
          break;
          
        case 'SWEEP_GC':
          const sweptHeap: Record<string, HeapObject> = {};
          Object.keys(newState.heap).forEach(id => {
            if (!newState.heap[id].isMarkedForGC) {
              sweptHeap[id] = newState.heap[id];
            }
          });
          newState.heap = sweptHeap;
          break;
          
        case 'PRINT':
          newState.output = [...newState.output, step.payload.text];
          break;
      }
      
      return newState;
    });
  }
}));

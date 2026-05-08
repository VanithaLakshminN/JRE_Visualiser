// JVM Data Types

export type VariableType = 'int' | 'double' | 'boolean' | 'char' | 'String' | 'Object' | 'Array';

export interface LocalVariable {
  name: string;
  type: VariableType;
  value: string;
  referenceId?: string; // If it's an object reference
}

export interface StackFrame {
  id: string;
  methodName: string;
  variables: Record<string, LocalVariable>;
  isActive: boolean;
}

export interface HeapObject {
  id: string;
  type: string;
  fields: Record<string, string>;
  isMarkedForGC: boolean;
}

export interface LoadedClass {
  name: string;
  methods: string[];
  staticVariables: Record<string, string>;
}

export interface MemoryDataPoint {
  time: number;
  stack: number;
  heap: number;
  metaspace: number;
}

export interface DemoProgram {
  id: string;
  title: string;
  code: string;
  steps: ExecutionStep[];
}

// Action types for the simulator
export type ActionType = 
  | 'INIT'
  | 'LOAD_CLASS'
  | 'PUSH_FRAME'
  | 'POP_FRAME'
  | 'SET_VAR'
  | 'ALLOC_OBJ'
  | 'UPDATE_OBJ'
  | 'MARK_GC'
  | 'SWEEP_GC'
  | 'PRINT'
  | 'METHOD_CALL';

export interface ExecutionStep {
  lineNumber: number;
  action: ActionType;
  payload?: any;
  explanation: string;
}

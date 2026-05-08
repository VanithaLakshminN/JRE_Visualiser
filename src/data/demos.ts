import type { DemoProgram } from '../types';

export const demos: DemoProgram[] = [
  {
    id: 'basic-vars',
    title: '1. Basic Variables',
    code: `public class VisualizerDemo {
    public static void main(String[] args) {
        int x = 42;
        double y = 3.14;
        boolean flag = true;
        
        y = x + y;
        System.out.println("Result: " + y);
    }
}`,
    steps: [
      { lineNumber: 1, action: 'LOAD_CLASS', payload: { className: 'VisualizerDemo', methods: ['main'] }, explanation: 'Load VisualizerDemo into Metaspace' },
      { lineNumber: 2, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'Push main method frame onto Stack' },
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'x', type: 'int', value: '42' }, explanation: 'Declare and initialize int x' },
      { lineNumber: 4, action: 'SET_VAR', payload: { name: 'y', type: 'double', value: '3.14' }, explanation: 'Declare and initialize double y' },
      { lineNumber: 5, action: 'SET_VAR', payload: { name: 'flag', type: 'boolean', value: 'true' }, explanation: 'Declare and initialize boolean flag' },
      { lineNumber: 7, action: 'SET_VAR', payload: { name: 'y', type: 'double', value: '45.14' }, explanation: 'Update value of y' },
      { lineNumber: 8, action: 'PRINT', payload: { text: 'Result: 45.14' }, explanation: 'Print result to console' },
      { lineNumber: 9, action: 'POP_FRAME', explanation: 'Pop main frame, program ends' }
    ]
  },
  {
    id: 'object-creation',
    title: '2. Objects & References',
    code: `public class ObjectDemo {
    public static void main(String[] args) {
        Point p1 = new Point(10, 20);
        Point p2 = p1;
        p2.x = 100;
        System.out.println(p1.x); // Prints 100
    }
}
class Point { int x; int y; }`,
    steps: [
      { lineNumber: 1, action: 'LOAD_CLASS', payload: { className: 'ObjectDemo', methods: ['main'] }, explanation: 'Load ObjectDemo class' },
      { lineNumber: 9, action: 'LOAD_CLASS', payload: { className: 'Point', methods: ['<init>'] }, explanation: 'Load Point class' },
      { lineNumber: 2, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'Start main method' },
      { lineNumber: 3, action: 'ALLOC_OBJ', payload: { id: 'obj1', type: 'Point', fields: { x: '10', y: '20' } }, explanation: 'Allocate Point object on Heap' },
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'p1', type: 'Object', value: 'ref(obj1)', referenceId: 'obj1' }, explanation: 'Create reference p1 pointing to object' },
      { lineNumber: 4, action: 'SET_VAR', payload: { name: 'p2', type: 'Object', value: 'ref(obj1)', referenceId: 'obj1' }, explanation: 'Copy reference from p1 to p2' },
      { lineNumber: 5, action: 'UPDATE_OBJ', payload: { id: 'obj1', field: 'x', value: '100' }, explanation: 'Update field x via reference p2' },
      { lineNumber: 6, action: 'PRINT', payload: { text: '100' }, explanation: 'Print p1.x' },
      { lineNumber: 7, action: 'POP_FRAME', explanation: 'End of main' }
    ]
  },
  {
    id: 'array-demo',
    title: '3. Arrays',
    code: `public class ArrayDemo {
    public static void main(String[] args) {
        int[] numbers = new int[3];
        numbers[0] = 10;
        numbers[1] = 20;
        numbers[2] = 30;
    }
}`,
    steps: [
      { lineNumber: 1, action: 'LOAD_CLASS', payload: { className: 'ArrayDemo', methods: ['main'] }, explanation: 'Load ArrayDemo' },
      { lineNumber: 2, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'Start main method' },
      { lineNumber: 3, action: 'ALLOC_OBJ', payload: { id: 'arr1', type: 'int[]', fields: { length: '3', '0': '0', '1': '0', '2': '0' } }, explanation: 'Allocate array of size 3 on Heap' },
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'numbers', type: 'Array', value: 'ref(arr1)', referenceId: 'arr1' }, explanation: 'Set reference' },
      { lineNumber: 4, action: 'UPDATE_OBJ', payload: { id: 'arr1', field: '0', value: '10' }, explanation: 'Update index 0' },
      { lineNumber: 5, action: 'UPDATE_OBJ', payload: { id: 'arr1', field: '1', value: '20' }, explanation: 'Update index 1' },
      { lineNumber: 6, action: 'UPDATE_OBJ', payload: { id: 'arr1', field: '2', value: '30' }, explanation: 'Update index 2' },
      { lineNumber: 7, action: 'POP_FRAME', explanation: 'End' }
    ]
  },
  {
    id: 'recursion',
    title: '4. Recursion',
    code: `public class RecursionDemo {
    public static void main(String[] args) {
        factorial(3);
    }
    
    static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`,
    steps: [
      { lineNumber: 1, action: 'LOAD_CLASS', payload: { className: 'RecursionDemo', methods: ['main', 'factorial'] }, explanation: 'Load Class' },
      { lineNumber: 2, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'Start main' },
      
      // factorial(3)
      { lineNumber: 3, action: 'PUSH_FRAME', payload: { methodName: 'factorial' }, explanation: 'Call factorial(3)' },
      { lineNumber: 6, action: 'SET_VAR', payload: { name: 'n', type: 'int', value: '3' }, explanation: 'Set n=3' },
      { lineNumber: 7, action: 'INIT', explanation: 'Check n <= 1 (false)' },
      
      // factorial(2)
      { lineNumber: 8, action: 'PUSH_FRAME', payload: { methodName: 'factorial' }, explanation: 'Call factorial(2)' },
      { lineNumber: 6, action: 'SET_VAR', payload: { name: 'n', type: 'int', value: '2' }, explanation: 'Set n=2' },
      { lineNumber: 7, action: 'INIT', explanation: 'Check n <= 1 (false)' },
      
      // factorial(1)
      { lineNumber: 8, action: 'PUSH_FRAME', payload: { methodName: 'factorial' }, explanation: 'Call factorial(1)' },
      { lineNumber: 6, action: 'SET_VAR', payload: { name: 'n', type: 'int', value: '1' }, explanation: 'Set n=1' },
      { lineNumber: 7, action: 'POP_FRAME', explanation: 'Return 1' },
      
      { lineNumber: 8, action: 'POP_FRAME', explanation: 'Return 2 * 1 = 2' },
      { lineNumber: 8, action: 'POP_FRAME', explanation: 'Return 3 * 2 = 6' },
      { lineNumber: 4, action: 'POP_FRAME', explanation: 'End main' },
    ]
  },
  {
    id: 'garbage-collection',
    title: '5. Garbage Collection',
    code: `public class GCDemo {
    public static void main(String[] args) {
        for(int i = 0; i < 3; i++) {
            createGarbage();
        }
        System.gc(); // Trigger GC
    }
    
    static void createGarbage() {
        Point temp = new Point(1, 1);
        // temp goes out of scope
    }
}`,
    steps: [
      { lineNumber: 1, action: 'LOAD_CLASS', payload: { className: 'GCDemo' }, explanation: 'Load Class' },
      { lineNumber: 2, action: 'PUSH_FRAME', payload: { methodName: 'main' }, explanation: 'Start main' },
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'i', type: 'int', value: '0' }, explanation: 'i = 0' },
      
      // i=0
      { lineNumber: 4, action: 'PUSH_FRAME', payload: { methodName: 'createGarbage' }, explanation: 'Call createGarbage' },
      { lineNumber: 10, action: 'ALLOC_OBJ', payload: { id: 'obj1', type: 'Point' }, explanation: 'Allocate object 1' },
      { lineNumber: 10, action: 'SET_VAR', payload: { name: 'temp', type: 'Object', value: 'ref(obj1)', referenceId: 'obj1' }, explanation: 'Set ref' },
      { lineNumber: 12, action: 'POP_FRAME', explanation: 'Return, temp out of scope' },
      
      // i=1
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'i', type: 'int', value: '1' }, explanation: 'i = 1' },
      { lineNumber: 4, action: 'PUSH_FRAME', payload: { methodName: 'createGarbage' }, explanation: 'Call createGarbage' },
      { lineNumber: 10, action: 'ALLOC_OBJ', payload: { id: 'obj2', type: 'Point' }, explanation: 'Allocate object 2' },
      { lineNumber: 10, action: 'SET_VAR', payload: { name: 'temp', type: 'Object', value: 'ref(obj2)', referenceId: 'obj2' }, explanation: 'Set ref' },
      { lineNumber: 12, action: 'POP_FRAME', explanation: 'Return' },
      
      // i=2
      { lineNumber: 3, action: 'SET_VAR', payload: { name: 'i', type: 'int', value: '2' }, explanation: 'i = 2' },
      { lineNumber: 4, action: 'PUSH_FRAME', payload: { methodName: 'createGarbage' }, explanation: 'Call createGarbage' },
      { lineNumber: 10, action: 'ALLOC_OBJ', payload: { id: 'obj3', type: 'Point' }, explanation: 'Allocate object 3' },
      { lineNumber: 10, action: 'SET_VAR', payload: { name: 'temp', type: 'Object', value: 'ref(obj3)', referenceId: 'obj3' }, explanation: 'Set ref' },
      { lineNumber: 12, action: 'POP_FRAME', explanation: 'Return' },
      
      { lineNumber: 6, action: 'MARK_GC', explanation: 'System.gc(): Mark unreachable objects' },
      { lineNumber: 6, action: 'SWEEP_GC', explanation: 'System.gc(): Sweep marked objects' },
      { lineNumber: 7, action: 'POP_FRAME', explanation: 'End main' },
    ]
  }
];

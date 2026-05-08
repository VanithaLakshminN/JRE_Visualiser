import { Lexer } from '../src/engine/Lexer.ts';
import { Parser } from '../src/engine/Parser.ts';
import { Interpreter } from '../src/engine/Interpreter.ts';

function test(name, code) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
  try {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new Interpreter(ast);
    const steps = interpreter.generateEventStream();
    
    const allocs = steps.filter(s => s.action === 'ALLOC_OBJ');
    const updates = steps.filter(s => s.action === 'UPDATE_OBJ');
    const prints = steps.filter(s => s.action === 'PRINT');
    const vars = steps.filter(s => s.action === 'SET_VAR');
    
    console.log(`  Steps: ${steps.length} | Allocs: ${allocs.length} | Updates: ${updates.length} | Prints: ${prints.length}`);
    prints.forEach(p => console.log(`  OUTPUT: ${p.payload.text}`));
    allocs.forEach(a => console.log(`  HEAP: ${a.payload.type} @${a.payload.id}`));
    updates.forEach(u => console.log(`  UPDATE: ${u.payload.id}.${u.payload.field} = ${u.payload.value}`));
    console.log(`  ✅ PASS`);
  } catch (e) {
    console.log(`  ❌ FAIL: ${e.message}`);
  }
}

// Test 1: For loop with i++
test("For loop with i++", `
public class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
    }
}`);

// Test 2: Array operations
test("Array creation and access", `
public class Main {
    public static void main(String[] args) {
        int[] arr = new int[3];
        arr[0] = 10;
        arr[1] = 20;
        arr[2] = 30;
        System.out.println(arr[0] + arr[1] + arr[2]);
    }
}`);

// Test 3: Field access and mutation
test("Field access p.x = 100", `
class Point {
    int x;
    int y;
}
public class Main {
    public static void main(String[] args) {
        Point p = new Point();
        p.x = 100;
        p.y = 200;
        System.out.println(p.x + p.y);
    }
}`);

// Test 4: If/else
test("If/else branching", `
public class Main {
    public static void main(String[] args) {
        int x = 10;
        if (x > 5) {
            System.out.println("big");
        } else {
            System.out.println("small");
        }
    }
}`);

// Test 5: While loop
test("While loop", `
public class Main {
    public static void main(String[] args) {
        int i = 0;
        while (i < 3) {
            System.out.println(i);
            i++;
        }
    }
}`);

// Test 6: Multiple classes with method calls
test("Multiple classes - Student", `
class Student {
    String name;
    int grade;
    
    Student(String name, int grade) {
        this.name = name;
        this.grade = grade;
    }
    
    void info() {
        System.out.println(name + " grade " + grade);
    }
}
public class Main {
    public static void main(String[] args) {
        Student s1 = new Student("John", 90);
        Student s2 = new Student("Jane", 95);
        s1.info();
        s2.info();
    }
}`);

// Test 7: Return values
test("Method with return value", `
class Calculator {
    int add(int a, int b) {
        return a + b;
    }
}
public class Main {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        int result = calc.add(5, 3);
        System.out.println(result);
    }
}`);

// Test 8: String concatenation
test("String concatenation", `
public class Main {
    public static void main(String[] args) {
        String name = "World";
        System.out.println("Hello " + name + "!");
    }
}`);

import { Lexer } from '../src/engine/Lexer.ts';
import { Parser } from '../src/engine/Parser.ts';
import { Interpreter } from '../src/engine/Interpreter.ts';

const code = `class Person {
    String name;
    int age;

    Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    void display() {
        System.out.println(name + " " + age);
    }
}

public class Main {
    public static void main(String[] args) {
        Person p1 = new Person("Alice", 22);
        Person p2 = new Person("Bob", 25);

        p1.display();
        p2.display();

        p1 = p2;

        p1.display();
    }
}`;

try {
  console.log("=== LEXER ===");
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  console.log(`Tokenized: ${tokens.length} tokens`);
  // Print last 10 tokens to check end
  tokens.slice(-10).forEach(t => console.log(`  [${t.type}] "${t.text}" (line ${t.line})`));
  
  console.log("\n=== PARSER ===");
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log(`Classes: ${ast.classes.map(c => c.name).join(', ')}`);
  ast.classes.forEach(cls => {
    console.log(`  ${cls.name}: ${cls.fields.length} fields, ${cls.constructors.length} constructors, ${cls.methods.length} methods`);
    cls.constructors.forEach(c => console.log(`    constructor(${c.params.map(p => p.type + ' ' + p.name).join(', ')})`));
    cls.methods.forEach(m => console.log(`    ${m.returnType} ${m.name}(${m.params.map(p => p.type + ' ' + p.name).join(', ')})`));
  });

  console.log("\n=== INTERPRETER ===");
  const interpreter = new Interpreter(ast);
  const steps = interpreter.generateEventStream();
  console.log(`Generated ${steps.length} steps:`);
  steps.forEach((s, i) => {
    const payloadStr = s.payload ? ` | ${JSON.stringify(s.payload)}` : '';
    console.log(`  ${i+1}. [${s.action}] L${s.lineNumber}: ${s.explanation}${payloadStr}`);
  });

  // Check heap allocations
  const allocSteps = steps.filter(s => s.action === 'ALLOC_OBJ');
  const updateSteps = steps.filter(s => s.action === 'UPDATE_OBJ');
  console.log(`\n=== HEAP ANALYSIS ===`);
  console.log(`ALLOC_OBJ steps: ${allocSteps.length}`);
  allocSteps.forEach(s => console.log(`  Created ${s.payload.type} @ ${s.payload.id}, fields: ${JSON.stringify(s.payload.fields)}`));
  console.log(`UPDATE_OBJ steps: ${updateSteps.length}`);
  updateSteps.forEach(s => console.log(`  Updated ${s.payload.id}.${s.payload.field} = ${s.payload.value}`));

} catch (e) {
  console.error("ERROR:", e.message);
  console.error(e.stack);
}

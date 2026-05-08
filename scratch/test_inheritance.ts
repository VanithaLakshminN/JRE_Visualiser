import { Lexer } from '../src/engine/Lexer.js';
import { Parser } from '../src/engine/Parser.js';
import { Interpreter } from '../src/engine/Interpreter.js';

const code = `
abstract class Employee {
    String name;
    Employee(String name) {
        this.name = name;
    }
    abstract double calculateSalary();
    void display() {
        System.out.println(name + " earns " + calculateSalary());
    }
}

class Developer extends Employee {
    int projects;
    Developer(String name, int projects) {
        super(name);
        this.projects = projects;
    }
    double calculateSalary() {
        return 50000 + projects * 5000;
    }
}

class Manager extends Employee {
    int teams;
    Manager(String name, int teams) {
        super(name);
        this.teams = teams;
    }
    double calculateSalary() {
        return 70000 + teams * 10000;
    }
}

public class Main {
    public static void main(String[] args) {
        Employee e1 = new Developer("Alice", 4);
        Employee e2 = new Manager("Bob", 2);
        e1.display();
        e2.display();
    }
}
`;

console.log("Tokenizing...");
const lexer = new Lexer(code);
const tokens = lexer.tokenize();

console.log("Parsing...");
const parser = new Parser(tokens);
const ast = parser.parse();

console.log("Interpreting...");
const interpreter = new Interpreter(ast);
const steps = interpreter.generateEventStream();

console.log("Steps Generated:", steps.length);

for (const step of steps) {
    if (step.action === 'PRINT' || step.action === 'ALLOC_OBJ' || step.action === 'UPDATE_OBJ') {
        console.log(`Action: ${step.action}, Payload:`, JSON.stringify(step.payload));
    }
}

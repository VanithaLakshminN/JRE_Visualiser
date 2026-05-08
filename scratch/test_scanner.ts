import { Lexer } from '../src/engine/Lexer.js';
import { Parser } from '../src/engine/Parser.js';
import { Interpreter } from '../src/engine/Interpreter.js';

const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        String b = sc.nextLine();
        System.out.println(a);
        System.out.println(b);
    }
}
`;

const input = "100 Hello World";

console.log("Tokenizing...");
const lexer = new Lexer(code);
const tokens = lexer.tokenize();

console.log("Parsing...");
const parser = new Parser(tokens);
const ast = parser.parse();

console.log("Interpreting...");
const interpreter = new Interpreter(ast);
const steps = interpreter.generateEventStream(input);

console.log("Steps Generated:", steps.length);

// Only print PRINT and SET_VAR steps
for (const step of steps) {
    if (step.action === 'PRINT' || step.action === 'SET_VAR') {
        console.log(`Action: ${step.action}, Payload:`, step.payload);
    }
}

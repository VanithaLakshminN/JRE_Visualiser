import { Lexer } from '../src/engine/Lexer.js';
import { Parser } from '../src/engine/Parser.js';
import { Interpreter } from '../src/engine/Interpreter.js';

const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int[] numbers = new int[3];
        for (int i = 0; i < numbers.length; i++) {
            System.out.println("Enter number:");
            numbers[i] = sc.nextInt();
        }
        System.out.println("Array Elements:");
        for (int n : numbers) {
            System.out.println(n);
        }
        sc.close();
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
const steps = interpreter.generateEventStream("10\n20\n30\n");

console.log("Steps Generated:", steps.length);

for (const step of steps) {
    if (step.action === 'PRINT' || step.action === 'ALLOC_OBJ' || step.action === 'UPDATE_OBJ') {
        console.log(`Action: ${step.action}, Payload:`, JSON.stringify(step.payload));
    }
}

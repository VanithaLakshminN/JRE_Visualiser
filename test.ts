import { Lexer } from './src/engine/Lexer.js';
import { Parser } from './src/engine/Parser.js';
import { Interpreter } from './src/engine/Interpreter.js';

const code = `class Temp {
    int x;
}
public class Main {
    public static void main(String[] args) {
        new Temp();
        System.out.println("Done");
    }
}`;

try {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  console.log("Tokens:", tokens.length);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log("AST Classes:", ast.classes.length);
  const interpreter = new Interpreter(ast);
  const steps = interpreter.generateEventStream();
  console.log("Steps Generated:", steps.length);
} catch (e) {
  console.error(e);
}

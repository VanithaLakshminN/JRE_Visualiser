import { Lexer } from './src/engine/Lexer';
import { Parser } from './src/engine/Parser';
import { Interpreter } from './src/engine/Interpreter';

const code = `import java.util.Scanner;

public class Addition {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        System.out.print("Enter first number: ");
        double num1 = scanner.nextDouble();
        
        System.out.print("Enter second number: ");
        double num2 = scanner.nextDouble();
        
        double sum = num1 + num2;
        
        System.out.println("Sum: " + sum);
        
        scanner.close();
    }
}`;

try {
  console.log('Characters:');
  for(let i=20; i<30; i++) {
    console.log(i, JSON.stringify(code[i]), code.charCodeAt(i));
  }
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  console.log('Lexed', tokens.length, 'tokens:');
  tokens.forEach(t => console.log(`[${t.type}] ${t.text}`));

  console.log('Parsing...');
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log('Parsed successfully. Classes:', ast.classes.length);

  console.log('Interpreting...');
  const interpreter = new Interpreter(ast);
  const steps = interpreter.generateEventStream();
  console.log('Generated', steps.length, 'steps.');
  console.log('First step:', steps[0]);
} catch (err: any) {
  console.error('Error:', err.message);
}

import { Parser, Language } from 'web-tree-sitter';

export class JavaParser {
  private parser: Parser | null = null;
  private javaLanguage: Language | null = null;

  async initialize() {
    if (this.parser) return;
    
    await Parser.init();
    this.parser = new Parser();
    
    // Use the node_modules path for tests, or a public path for browser
    const isBrowser = typeof window !== 'undefined';
    const wasmUrl = isBrowser ? '/tree-sitter-java.wasm' : 'node_modules/tree-sitter-java/tree-sitter-java.wasm';
    
    this.javaLanguage = await Language.load(wasmUrl);
    this.parser.setLanguage(this.javaLanguage);
  }

  parse(code: string): Parser.Tree | null {
    if (!this.parser) {
      throw new Error("Parser not initialized. Call initialize() first.");
    }
    return this.parser.parse(code);
  }
}

export const javaParser = new JavaParser();

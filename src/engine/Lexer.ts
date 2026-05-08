// Mini-Java Lexer — Enhanced for full visualization support

export const TokenType = {
  // Keywords
  Class: 'Class', Public: 'Public', Private: 'Private', Protected: 'Protected',
  Static: 'Static', Void: 'Void', Int: 'Int', Boolean: 'Boolean', Double: 'Double',
  Char: 'Char', Float: 'Float', Long: 'Long',
  String: 'String', New: 'New', This: 'This', Null: 'Null',
  If: 'If', Else: 'Else', For: 'For', While: 'While', Return: 'Return',
  Import: 'Import',

  // Identifiers & Literals
  Identifier: 'Identifier', Number: 'Number', StringLiteral: 'StringLiteral',
  BooleanLiteral: 'BooleanLiteral', CharLiteral: 'CharLiteral',

  // Operators
  Assign: 'Assign', Equals: 'Equals', NotEquals: 'NotEquals',
  Less: 'Less', Greater: 'Greater', LessEqual: 'LessEqual', GreaterEqual: 'GreaterEqual',
  Plus: 'Plus', Minus: 'Minus', Multiply: 'Multiply', Divide: 'Divide', Modulo: 'Modulo',
  PlusPlus: 'PlusPlus', MinusMinus: 'MinusMinus',
  PlusAssign: 'PlusAssign', MinusAssign: 'MinusAssign',
  And: 'And', Or: 'Or', Not: 'Not',

  // Delimiters
  LBrace: 'LBrace', RBrace: 'RBrace', LParen: 'LParen', RParen: 'RParen',
  LBracket: 'LBracket', RBracket: 'RBracket',
  Semicolon: 'Semicolon', Comma: 'Comma', Dot: 'Dot',

  // Special
  SystemOutPrintln: 'SystemOutPrintln',
  EOF: 'EOF'
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];

export interface Token {
  type: TokenType;
  text: string;
  line: number;
}

const KEYWORDS: Record<string, TokenType> = {
  'class': TokenType.Class, 'public': TokenType.Public, 'private': TokenType.Private,
  'protected': TokenType.Protected, 'static': TokenType.Static, 'void': TokenType.Void,
  'int': TokenType.Int, 'boolean': TokenType.Boolean, 'double': TokenType.Double,
  'char': TokenType.Char, 'float': TokenType.Float, 'long': TokenType.Long,
  'String': TokenType.String, 'new': TokenType.New, 'this': TokenType.This,
  'null': TokenType.Null, 'if': TokenType.If, 'else': TokenType.Else,
  'for': TokenType.For, 'while': TokenType.While, 'return': TokenType.Return,
  'true': TokenType.BooleanLiteral, 'false': TokenType.BooleanLiteral,
  'import': TokenType.Import
};

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private advance(): string {
    const char = this.input[this.position];
    if (char === '\n') this.line++;
    this.position++;
    return char;
  }

  private peek(): string {
    return this.position < this.input.length ? this.input[this.position] : '\0';
  }

  private peekNext(): string {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : '\0';
  }

  private isAlpha(char: string): boolean {
    return /^[a-zA-Z_]$/.test(char);
  }

  private isDigit(char: string): boolean {
    return /^[0-9]$/.test(char);
  }

  private skipWhitespace() {
    while (true) {
      const c = this.peek();
      if (c === ' ' || c === '\r' || c === '\t' || c === '\n') {
        this.advance();
      } else if (c === '/' && this.peekNext() === '/') {
        while (this.peek() !== '\n' && this.peek() !== '\0') this.advance();
      } else if (c === '/' && this.peekNext() === '*') {
        this.advance(); this.advance();
        while (this.peek() !== '\0' && !(this.peek() === '*' && this.peekNext() === '/')) {
          this.advance();
        }
        if (this.peek() !== '\0') { this.advance(); this.advance(); }
      } else {
        break;
      }
    }
  }

  public nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return { type: TokenType.EOF, text: '', line: this.line };
    }

    // Special match for System.out.println / System.out.print
    const remaining = this.input.substring(this.position);
    if (remaining.startsWith('System.out.println') || remaining.startsWith('System.out.print')) {
      const match = remaining.match(/^System\.out\.print(ln)?/);
      if (match) {
        this.position += match[0].length;
        return { type: TokenType.SystemOutPrintln, text: match[0], line: this.line };
      }
    }
    // System.gc() — tokenize System as identifier, let parser handle the rest
    // System.exit() — same treatment

    const c = this.advance();

    // Identifiers and keywords
    if (this.isAlpha(c)) {
      let start = this.position - 1;
      while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) this.advance();
      const text = this.input.substring(start, this.position);
      return { type: KEYWORDS[text] || TokenType.Identifier, text, line: this.line };
    }

    // Numbers
    if (this.isDigit(c)) {
      let start = this.position - 1;
      while (this.isDigit(this.peek())) this.advance();
      if (this.peek() === '.' && this.isDigit(this.peekNext())) {
        this.advance();
        while (this.isDigit(this.peek())) this.advance();
      }
      // Skip float/long suffixes
      if (this.peek() === 'f' || this.peek() === 'F' || this.peek() === 'L' || this.peek() === 'l') {
        this.advance();
      }
      return { type: TokenType.Number, text: this.input.substring(start, this.position), line: this.line };
    }

    // String literals
    if (c === '"') {
      let start = this.position;
      while (this.peek() !== '"' && this.peek() !== '\0') {
        if (this.peek() === '\\') this.advance(); // skip escape
        this.advance();
      }
      const text = this.input.substring(start, this.position);
      if (this.peek() === '"') this.advance();
      return { type: TokenType.StringLiteral, text, line: this.line };
    }

    // Char literals
    if (c === "'") {
      let start = this.position;
      if (this.peek() === '\\') this.advance(); // escape
      this.advance(); // the char
      const text = this.input.substring(start, this.position);
      if (this.peek() === "'") this.advance();
      return { type: TokenType.CharLiteral, text, line: this.line };
    }

    // Operators and delimiters
    switch (c) {
      case '{': return { type: TokenType.LBrace, text: c, line: this.line };
      case '}': return { type: TokenType.RBrace, text: c, line: this.line };
      case '(': return { type: TokenType.LParen, text: c, line: this.line };
      case ')': return { type: TokenType.RParen, text: c, line: this.line };
      case '[': return { type: TokenType.LBracket, text: c, line: this.line };
      case ']': return { type: TokenType.RBracket, text: c, line: this.line };
      case ';': return { type: TokenType.Semicolon, text: c, line: this.line };
      case ',': return { type: TokenType.Comma, text: c, line: this.line };
      case '.': return { type: TokenType.Dot, text: c, line: this.line };
      case '%': return { type: TokenType.Modulo, text: c, line: this.line };
      case '+':
        if (this.peek() === '+') { this.advance(); return { type: TokenType.PlusPlus, text: '++', line: this.line }; }
        if (this.peek() === '=') { this.advance(); return { type: TokenType.PlusAssign, text: '+=', line: this.line }; }
        return { type: TokenType.Plus, text: c, line: this.line };
      case '-':
        if (this.peek() === '-') { this.advance(); return { type: TokenType.MinusMinus, text: '--', line: this.line }; }
        if (this.peek() === '=') { this.advance(); return { type: TokenType.MinusAssign, text: '-=', line: this.line }; }
        return { type: TokenType.Minus, text: c, line: this.line };
      case '*': return { type: TokenType.Multiply, text: c, line: this.line };
      case '/': return { type: TokenType.Divide, text: c, line: this.line };
      case '=':
        if (this.peek() === '=') { this.advance(); return { type: TokenType.Equals, text: '==', line: this.line }; }
        return { type: TokenType.Assign, text: c, line: this.line };
      case '!':
        if (this.peek() === '=') { this.advance(); return { type: TokenType.NotEquals, text: '!=', line: this.line }; }
        return { type: TokenType.Not, text: '!', line: this.line };
      case '<':
        if (this.peek() === '=') { this.advance(); return { type: TokenType.LessEqual, text: '<=', line: this.line }; }
        return { type: TokenType.Less, text: c, line: this.line };
      case '>':
        if (this.peek() === '=') { this.advance(); return { type: TokenType.GreaterEqual, text: '>=', line: this.line }; }
        return { type: TokenType.Greater, text: c, line: this.line };
      case '&':
        if (this.peek() === '&') { this.advance(); return { type: TokenType.And, text: '&&', line: this.line }; }
        break;
      case '|':
        if (this.peek() === '|') { this.advance(); return { type: TokenType.Or, text: '||', line: this.line }; }
        break;
    }

    // Fallback — skip unknown characters gracefully instead of dying
    console.log("Lexer: skipping unknown character:", JSON.stringify(c), "at line", this.line);
    return this.nextToken(); // skip and try next
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token); // EOF
    return tokens;
  }
}

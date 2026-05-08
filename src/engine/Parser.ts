import { TokenType } from './Lexer';
import type { Token } from './Lexer';

// ─── AST Node Types ──────────────────────────────────────────────────────────

export type ASTNode = 
  | ProgramNode | ClassNode | MethodNode | ConstructorNode
  | VarDeclNode | AssignNode | FieldAssignNode
  | PrintNode | IfNode | WhileNode | ForNode | ReturnNode
  | MethodCallNode | BinaryOpNode | UnaryOpNode
  | LiteralNode | IdentifierNode | ThisNode
  | ObjectCreationNode | FieldAccessNode
  | ArrayCreationNode | ArrayAccessNode | ArrayAssignNode
  | CompoundAssignNode;

export interface ProgramNode { type: 'Program'; classes: ClassNode[]; }
export interface ClassNode { type: 'Class'; name: string; constructors: ConstructorNode[]; methods: MethodNode[]; fields: VarDeclNode[]; }
export interface ConstructorNode { type: 'Constructor'; name: string; params: {name: string, type: string}[]; body: ASTNode[]; line: number; }
export interface MethodNode { type: 'Method'; name: string; returnType: string; params: {name: string, type: string}[]; body: ASTNode[]; isStatic: boolean; line: number; }
export interface VarDeclNode { type: 'VarDecl'; varType: string; name: string; isArray: boolean; init?: ASTNode; line: number; }
export interface AssignNode { type: 'Assign'; name: string; value: ASTNode; line: number; }
export interface FieldAssignNode { type: 'FieldAssign'; object: ASTNode; field: string; value: ASTNode; line: number; }
export interface CompoundAssignNode { type: 'CompoundAssign'; name: string; operator: string; value: ASTNode; line: number; }
export interface PrintNode { type: 'Print'; expression: ASTNode; line: number; }
export interface IfNode { type: 'If'; condition: ASTNode; thenBranch: ASTNode[]; elseBranch?: ASTNode[]; line: number; }
export interface WhileNode { type: 'While'; condition: ASTNode; body: ASTNode[]; line: number; }
export interface ForNode { type: 'For'; init?: ASTNode; condition?: ASTNode; update?: ASTNode; body: ASTNode[]; line: number; }
export interface ReturnNode { type: 'Return'; value?: ASTNode; line: number; }
export interface MethodCallNode { type: 'MethodCall'; name: string; args: ASTNode[]; object?: ASTNode; line: number; }
export interface BinaryOpNode { type: 'BinaryOp'; left: ASTNode; operator: string; right: ASTNode; line: number; }
export interface UnaryOpNode { type: 'UnaryOp'; operator: string; operand: ASTNode; prefix: boolean; line: number; }
export interface LiteralNode { type: 'Literal'; value: any; valueType: string; line: number; }
export interface IdentifierNode { type: 'Identifier'; name: string; line: number; }
export interface ThisNode { type: 'This'; line: number; }
export interface ObjectCreationNode { type: 'ObjectCreation'; className: string; args: ASTNode[]; line: number; }
export interface FieldAccessNode { type: 'FieldAccess'; object: ASTNode; field: string; line: number; }
export interface ArrayCreationNode { type: 'ArrayCreation'; elementType: string; size: ASTNode; line: number; }
export interface ArrayAccessNode { type: 'ArrayAccess'; array: ASTNode; index: ASTNode; line: number; }
export interface ArrayAssignNode { type: 'ArrayAssign'; array: ASTNode; index: ASTNode; value: ASTNode; line: number; }


// ─── Parser ──────────────────────────────────────────────────────────────────

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private currentClassName: string = ''; // Track which class we're parsing (for constructor detection)

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    return this.current + 1 < this.tokens.length ? this.tokens[this.current + 1] : this.tokens[this.tokens.length - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (!this.isAtEnd() && this.peek().type === type) {
        this.current++;
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (!this.isAtEnd() && this.peek().type === type) {
      return this.tokens[this.current++];
    }
    throw new Error(`Parse Error at line ${this.peek().line}: ${message} (got '${this.peek().text}' [${this.peek().type}])`);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  // ─── Entry Point ────────────────────────────────────────────────

  public parse(): ProgramNode {
    const classes: ClassNode[] = [];
    while (!this.isAtEnd()) {
      // Skip imports
      if (this.match(TokenType.Import)) {
        while (!this.isAtEnd() && this.peek().type !== TokenType.Semicolon) {
          this.advance();
        }
        this.match(TokenType.Semicolon);
        continue;
      }
      classes.push(this.parseClass());
    }
    return { type: 'Program', classes };
  }

  // ─── Class Parsing ──────────────────────────────────────────────

  private parseClass(): ClassNode {
    // Skip access modifiers
    while (this.match(TokenType.Public, TokenType.Private, TokenType.Protected)) {}
    this.consume(TokenType.Class, "Expected 'class'");
    const name = this.consume(TokenType.Identifier, "Expected class name").text;
    this.currentClassName = name;
    this.consume(TokenType.LBrace, "Expected '{' after class name");
    
    const constructors: ConstructorNode[] = [];
    const methods: MethodNode[] = [];
    const fields: VarDeclNode[] = [];
    
    while (!this.isAtEnd() && !this.check(TokenType.RBrace)) {
      this.parseClassMember(name, constructors, methods, fields);
    }
    this.consume(TokenType.RBrace, "Expected '}' after class body");
    this.currentClassName = '';
    return { type: 'Class', name, constructors, methods, fields };
  }

  private parseClassMember(
    className: string,
    constructors: ConstructorNode[],
    methods: MethodNode[],
    fields: VarDeclNode[]
  ) {
    const startPos = this.current;
    let isStatic = false;

    // Skip access modifiers, collect static
    while (this.match(TokenType.Public, TokenType.Private, TokenType.Protected, TokenType.Static)) {
      if (this.previous().type === TokenType.Static) {
        isStatic = true;
      }
    }

    // Constructor: ClassName(params) { ... }
    if (this.check(TokenType.Identifier) && this.peek().text === className && this.peekNext().type === TokenType.LParen) {
      const line = this.peek().line;
      this.advance(); // consume class name
      const params = this.parseParams();
      this.consume(TokenType.LBrace, "Expected '{' before constructor body");
      const body = this.parseBlock();
      constructors.push({ type: 'Constructor', name: className, params, body, line });
      return;
    }

    // Method or Field — need to determine type
    const typeStr = this.parseTypeString();
    if (typeStr === null) {
      // Skip unknown token
      this.advance();
      return;
    }

    const memberName = this.consume(TokenType.Identifier, "Expected member name").text;
    const memberLine = this.previous().line;

    if (this.match(TokenType.LParen)) {
      // Method
      // We already consumed '(', so parse params from here
      const params = this.parseParamsAfterLParen();
      this.consume(TokenType.LBrace, "Expected '{' before method body");
      const body = this.parseBlock();
      methods.push({ type: 'Method', name: memberName, returnType: typeStr, params, body, isStatic, line: memberLine });
    } else {
      // Field
      let isArray = typeStr.endsWith('[]');
      let init: ASTNode | undefined;
      if (this.match(TokenType.Assign)) {
        init = this.parseExpression();
      }
      this.consume(TokenType.Semicolon, "Expected ';' after field declaration");
      fields.push({ type: 'VarDecl', varType: typeStr, name: memberName, isArray, init, line: memberLine });
    }
  }

  /** Parse a type string like "int", "String", "int[]", "Person" */
  private parseTypeString(): string | null {
    const token = this.peek();
    let typeStr: string;

    if (this.match(TokenType.Void)) {
      typeStr = 'void';
    } else if (this.match(TokenType.Int, TokenType.Double, TokenType.Boolean, TokenType.String, TokenType.Char, TokenType.Float, TokenType.Long)) {
      typeStr = this.previous().text;
    } else if (this.check(TokenType.Identifier)) {
      typeStr = this.advance().text;
    } else {
      return null;
    }

    // Check for array type: int[] or String[]
    if (this.match(TokenType.LBracket)) {
      this.consume(TokenType.RBracket, "Expected ']' after '['");
      typeStr += '[]';
    }

    return typeStr;
  }

  private parseParams(): {name: string, type: string}[] {
    this.consume(TokenType.LParen, "Expected '('");
    return this.parseParamsAfterLParen();
  }

  private parseParamsAfterLParen(): {name: string, type: string}[] {
    const params: {name: string, type: string}[] = [];
    if (!this.check(TokenType.RParen)) {
      do {
        const paramType = this.parseTypeString() || 'any';
        const paramName = this.consume(TokenType.Identifier, "Expected parameter name").text;
        params.push({ name: paramName, type: paramType });
      } while (this.match(TokenType.Comma));
    }
    this.consume(TokenType.RParen, "Expected ')' after parameters");
    return params;
  }

  // ─── Block and Statement Parsing ────────────────────────────────

  private parseBlock(): ASTNode[] {
    const statements: ASTNode[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.RBrace)) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    this.consume(TokenType.RBrace, "Expected '}' after block");
    return statements;
  }

  private parseStatement(): ASTNode | null {
    const token = this.peek();

    // Variable declaration with primitive type
    if (this.check(TokenType.Int) || this.check(TokenType.Double) || this.check(TokenType.Boolean) || 
        this.check(TokenType.String) || this.check(TokenType.Char) || this.check(TokenType.Float) || this.check(TokenType.Long)) {
      return this.parseVarDecl();
    }

    // Variable declaration with class type: ClassName varName
    if (this.check(TokenType.Identifier) && this.peekNext().type === TokenType.Identifier) {
      return this.parseVarDecl();
    }

    // Variable declaration with array type: ClassName[] varName
    if (this.check(TokenType.Identifier) && this.peekNext().type === TokenType.LBracket) {
      // Could be array type declaration OR array access — look further ahead
      const saved = this.current;
      this.advance(); // type name
      if (this.match(TokenType.LBracket) && this.match(TokenType.RBracket) && this.check(TokenType.Identifier)) {
        this.current = saved; // restore
        return this.parseVarDecl();
      }
      this.current = saved; // restore — it's an expression
    }

    // System.out.println
    if (this.match(TokenType.SystemOutPrintln)) {
      this.consume(TokenType.LParen, "Expected '('");
      let expr: ASTNode;
      if (this.check(TokenType.RParen)) {
        expr = { type: 'Literal', value: '', valueType: 'string', line: token.line };
      } else {
        expr = this.parseExpression();
      }
      this.consume(TokenType.RParen, "Expected ')'");
      this.consume(TokenType.Semicolon, "Expected ';'");
      return { type: 'Print', expression: expr, line: token.line };
    }

    // If statement
    if (this.match(TokenType.If)) {
      this.consume(TokenType.LParen, "Expected '('");
      const condition = this.parseExpression();
      this.consume(TokenType.RParen, "Expected ')'");
      
      let thenBranch: ASTNode[];
      if (this.match(TokenType.LBrace)) {
        thenBranch = this.parseBlock();
      } else {
        const singleStmt = this.parseStatement();
        thenBranch = singleStmt ? [singleStmt] : [];
      }

      let elseBranch: ASTNode[] | undefined;
      if (this.match(TokenType.Else)) {
        if (this.match(TokenType.LBrace)) {
          elseBranch = this.parseBlock();
        } else {
          const singleStmt = this.parseStatement();
          elseBranch = singleStmt ? [singleStmt] : [];
        }
      }
      return { type: 'If', condition, thenBranch, elseBranch, line: token.line };
    }

    // While
    if (this.match(TokenType.While)) {
      this.consume(TokenType.LParen, "Expected '('");
      const condition = this.parseExpression();
      this.consume(TokenType.RParen, "Expected ')'");
      
      let body: ASTNode[];
      if (this.match(TokenType.LBrace)) {
        body = this.parseBlock();
      } else {
        const singleStmt = this.parseStatement();
        body = singleStmt ? [singleStmt] : [];
      }
      return { type: 'While', condition, body, line: token.line };
    }

    // For
    if (this.match(TokenType.For)) {
      return this.parseFor(token.line);
    }

    // Return
    if (this.match(TokenType.Return)) {
      const line = this.previous().line;
      let value: ASTNode | undefined;
      if (!this.check(TokenType.Semicolon)) {
        value = this.parseExpression();
      }
      this.consume(TokenType.Semicolon, "Expected ';'");
      return { type: 'Return', value, line };
    }

    // Expression statement (assignment, method call, increment, etc.)
    const expr = this.parseExpression();
    
    // Check if this is an assignment to a field or array after the expression
    // e.g. the expression parsed might be a FieldAccess or ArrayAccess
    // These are handled inside parseExpression via parseAssignment
    
    this.consume(TokenType.Semicolon, "Expected ';'");
    return expr;
  }

  private parseVarDecl(): VarDeclNode {
    const typeStr = this.parseTypeString()!;
    const isArray = typeStr.endsWith('[]');
    const nameTk = this.consume(TokenType.Identifier, "Expected variable name");
    let init: ASTNode | undefined;
    if (this.match(TokenType.Assign)) {
      init = this.parseExpression();
    }
    this.consume(TokenType.Semicolon, "Expected ';'");
    return { type: 'VarDecl', varType: typeStr, name: nameTk.text, isArray, init, line: nameTk.line };
  }

  private parseFor(line: number): ForNode {
    this.consume(TokenType.LParen, "Expected '('");
    
    // Init
    let init: ASTNode | undefined;
    if (!this.match(TokenType.Semicolon)) {
      // Check if it's a variable declaration
      if (this.check(TokenType.Int) || this.check(TokenType.Double) || this.check(TokenType.Boolean) || this.check(TokenType.String)) {
        const typeStr = this.parseTypeString()!;
        const nameTk = this.consume(TokenType.Identifier, "Expected variable name");
        let initExpr: ASTNode | undefined;
        if (this.match(TokenType.Assign)) {
          initExpr = this.parseExpression();
        }
        this.consume(TokenType.Semicolon, "Expected ';'");
        init = { type: 'VarDecl', varType: typeStr, name: nameTk.text, isArray: false, init: initExpr, line: nameTk.line } as VarDeclNode;
      } else {
        init = this.parseExpression();
        this.consume(TokenType.Semicolon, "Expected ';'");
      }
    }

    // Condition
    let condition: ASTNode | undefined;
    if (!this.check(TokenType.Semicolon)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.Semicolon, "Expected ';'");

    // Update
    let update: ASTNode | undefined;
    if (!this.check(TokenType.RParen)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.RParen, "Expected ')'");

    let body: ASTNode[];
    if (this.match(TokenType.LBrace)) {
      body = this.parseBlock();
    } else {
      const singleStmt = this.parseStatement();
      body = singleStmt ? [singleStmt] : [];
    }

    return { type: 'For', init, condition, update, body, line };
  }

  // ─── Expression Parsing ─────────────────────────────────────────

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const expr = this.parseOr();

    if (this.match(TokenType.Assign)) {
      const value = this.parseAssignment();
      if (expr.type === 'Identifier') {
        return { type: 'Assign', name: expr.name, value, line: expr.line };
      }
      if (expr.type === 'FieldAccess') {
        return { type: 'FieldAssign', object: expr.object, field: expr.field, value, line: expr.line };
      }
      if (expr.type === 'ArrayAccess') {
        return { type: 'ArrayAssign', array: expr.array, index: expr.index, value, line: expr.line };
      }
      throw new Error("Invalid assignment target");
    }

    if (this.match(TokenType.PlusAssign, TokenType.MinusAssign)) {
      const op = this.previous().text;
      const value = this.parseAssignment();
      if (expr.type === 'Identifier') {
        return { type: 'CompoundAssign', name: expr.name, operator: op, value, line: expr.line };
      }
      throw new Error("Invalid compound assignment target");
    }

    return expr;
  }

  private parseOr(): ASTNode {
    let expr = this.parseAnd();
    while (this.match(TokenType.Or)) {
      const right = this.parseAnd();
      expr = { type: 'BinaryOp', left: expr, operator: '||', right, line: (expr as any).line };
    }
    return expr;
  }

  private parseAnd(): ASTNode {
    let expr = this.parseEquality();
    while (this.match(TokenType.And)) {
      const right = this.parseEquality();
      expr = { type: 'BinaryOp', left: expr, operator: '&&', right, line: (expr as any).line };
    }
    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();
    while (this.match(TokenType.Equals, TokenType.NotEquals)) {
      const operator = this.previous().text;
      const right = this.parseComparison();
      expr = { type: 'BinaryOp', left: expr, operator, right, line: (expr as any).line };
    }
    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseTerm();
    while (this.match(TokenType.Less, TokenType.LessEqual, TokenType.Greater, TokenType.GreaterEqual)) {
      const operator = this.previous().text;
      const right = this.parseTerm();
      expr = { type: 'BinaryOp', left: expr, operator, right, line: (expr as any).line };
    }
    return expr;
  }

  private parseTerm(): ASTNode {
    let expr = this.parseFactor();
    while (this.match(TokenType.Plus, TokenType.Minus)) {
      const operator = this.previous().text;
      const right = this.parseFactor();
      expr = { type: 'BinaryOp', left: expr, operator, right, line: (expr as any).line };
    }
    return expr;
  }

  private parseFactor(): ASTNode {
    let expr = this.parseUnary();
    while (this.match(TokenType.Multiply, TokenType.Divide, TokenType.Modulo)) {
      const operator = this.previous().text;
      const right = this.parseUnary();
      expr = { type: 'BinaryOp', left: expr, operator, right, line: (expr as any).line };
    }
    return expr;
  }

  private parseUnary(): ASTNode {
    // Prefix: !expr, -expr, ++i, --i
    if (this.match(TokenType.Not)) {
      const operand = this.parseUnary();
      return { type: 'UnaryOp', operator: '!', operand, prefix: true, line: this.previous().line };
    }
    if (this.match(TokenType.Minus)) {
      const operand = this.parseUnary();
      return { type: 'UnaryOp', operator: '-', operand, prefix: true, line: this.previous().line };
    }
    if (this.match(TokenType.PlusPlus)) {
      const operand = this.parsePostfix();
      return { type: 'UnaryOp', operator: '++', operand, prefix: true, line: this.previous().line };
    }
    if (this.match(TokenType.MinusMinus)) {
      const operand = this.parsePostfix();
      return { type: 'UnaryOp', operator: '--', operand, prefix: true, line: this.previous().line };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    // Chain: dot access, method calls, array access, postfix ++/--
    while (true) {
      if (this.match(TokenType.Dot)) {
        const fieldName = this.consume(TokenType.Identifier, "Expected field/method name after '.'").text;
        if (this.match(TokenType.LParen)) {
          // Method call on object
          const args = this.parseArgList();
          expr = { type: 'MethodCall', name: fieldName, object: expr, args, line: (expr as any).line };
        } else {
          // Field access
          expr = { type: 'FieldAccess', object: expr, field: fieldName, line: (expr as any).line };
        }
      } else if (this.match(TokenType.LBracket)) {
        // Array access: expr[index]
        const index = this.parseExpression();
        this.consume(TokenType.RBracket, "Expected ']'");
        expr = { type: 'ArrayAccess', array: expr, index, line: (expr as any).line };
      } else if (this.match(TokenType.PlusPlus)) {
        expr = { type: 'UnaryOp', operator: '++', operand: expr, prefix: false, line: (expr as any).line };
      } else if (this.match(TokenType.MinusMinus)) {
        expr = { type: 'UnaryOp', operator: '--', operand: expr, prefix: false, line: (expr as any).line };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    const line = this.peek().line;

    // Number literal
    if (this.match(TokenType.Number)) {
      return { type: 'Literal', value: parseFloat(this.previous().text), valueType: 'number', line };
    }

    // String literal
    if (this.match(TokenType.StringLiteral)) {
      return { type: 'Literal', value: this.previous().text, valueType: 'string', line };
    }

    // Char literal
    if (this.match(TokenType.CharLiteral)) {
      return { type: 'Literal', value: this.previous().text, valueType: 'char', line };
    }

    // Boolean literal
    if (this.match(TokenType.BooleanLiteral)) {
      return { type: 'Literal', value: this.previous().text === 'true', valueType: 'boolean', line };
    }

    // Null literal
    if (this.match(TokenType.Null)) {
      return { type: 'Literal', value: null, valueType: 'null', line };
    }

    // this
    if (this.match(TokenType.This)) {
      return { type: 'This', line };
    }

    // new
    if (this.match(TokenType.New)) {
      const className = this.consume(TokenType.Identifier, "Expected class name after 'new'").text;
      
      // new ClassName[size] — array
      if (this.match(TokenType.LBracket)) {
        const size = this.parseExpression();
        this.consume(TokenType.RBracket, "Expected ']'");
        return { type: 'ArrayCreation', elementType: className, size, line };
      }

      // new ClassName(args) — object
      this.consume(TokenType.LParen, "Expected '('");
      const args = this.parseArgList();
      return { type: 'ObjectCreation', className, args, line };
    }

    // Identifier (variable, method call, etc.)
    if (this.match(TokenType.Identifier)) {
      const name = this.previous().text;
      
      // Standalone function call: funcName(args)
      if (this.match(TokenType.LParen)) {
        const args = this.parseArgList();
        return { type: 'MethodCall', name, args, line };
      }

      return { type: 'Identifier', name, line };
    }

    // Parenthesized expression
    if (this.match(TokenType.LParen)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RParen, "Expected ')'");
      return expr;
    }

    throw new Error(`Parse error at line ${this.peek().line}: Unexpected token '${this.peek().text}' [${this.peek().type}]`);
  }

  private parseArgList(): ASTNode[] {
    const args: ASTNode[] = [];
    if (!this.check(TokenType.RParen)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.Comma));
    }
    this.consume(TokenType.RParen, "Expected ')'");
    return args;
  }
}

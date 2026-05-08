import type { ExecutionStep } from '../types';
import type { ASTNode, ProgramNode, ClassNode, MethodNode, ConstructorNode } from './Parser';

interface HeapEntry {
  id: string;
  type: string;
  fields: Record<string, any>;
}

interface Scope {
  vars: Record<string, any>;
}

export class Interpreter {
  private steps: ExecutionStep[] = [];
  private ast: ProgramNode;
  private classRegistry: Record<string, ClassNode> = {};
  private heap: Record<string, HeapEntry> = {};
  private callStack: Scope[] = [];
  private objIdCounter = 0;
  private stepLimit = 500;
  private stepCount = 0;
  private scannerTokens: string[] = [];
  
  constructor(ast: ProgramNode) {
    this.ast = ast;
  }

  public generateEventStream(standardInput: string = ''): ExecutionStep[] {
    this.steps = [];
    this.classRegistry = {};
    this.heap = {};
    this.callStack = [];
    this.objIdCounter = 0;
    this.stepCount = 0;
    // Split input by whitespace for nextInt/next, or just keep lines. Let's tokenize by whitespace and newlines for robustness.
    this.scannerTokens = standardInput.trim() ? standardInput.trim().split(/\s+/) : [];
    
    // 1. Register all classes
    this.ast.classes.forEach(cls => {
      this.classRegistry[cls.name] = cls;
      this.steps.push({
        lineNumber: 1,
        action: 'LOAD_CLASS',
        payload: { 
          className: cls.name,
          methods: [...cls.methods.map(m => m.name), ...cls.constructors.map(() => '<init>')],
          staticVariables: {}
        },
        explanation: `Loaded class ${cls.name} into Metaspace`
      });
    });

    // 2. Find and execute main method
    for (const cls of this.ast.classes) {
      const mainMethod = cls.methods.find(m => m.name === 'main' && m.isStatic);
      if (mainMethod) {
        this.executeMethod(mainMethod, null);
        break;
      }
    }

    return this.steps;
  }

  // ─── Scope Management ───────────────────────────────────────────

  private pushScope(thisRef?: string | null): Scope {
    const scope: Scope = { vars: {} };
    if (thisRef) {
      // Ensure thisRef always has the @ prefix for heap reference resolution
      scope.vars['this'] = thisRef.startsWith('@') ? thisRef : `@${thisRef}`;
    }
    this.callStack.push(scope);
    return scope;
  }

  private popScope(): void {
    this.callStack.pop();
  }

  private currentScope(): Scope {
    return this.callStack[this.callStack.length - 1];
  }

  private setVar(name: string, value: any): void {
    // Set in current scope
    this.currentScope().vars[name] = value;
  }

  private getVar(name: string): any {
    // Search from top of call stack down
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (name in this.callStack[i].vars) {
        return this.callStack[i].vars[name];
      }
    }
    // Fallback: check if the variable is a field on 'this' (implicit this.field access)
    const thisRef = this.getThisRef();
    if (thisRef) {
      const objId = thisRef.substring(1);
      const heapObj = this.heap[objId];
      if (heapObj && name in heapObj.fields) {
        return heapObj.fields[name];
      }
    }
    return undefined;
  }

  /** Get the 'this' reference from the current call stack (if in an instance method/constructor) */
  private getThisRef(): string | null {
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if ('this' in this.callStack[i].vars) {
        return this.callStack[i].vars['this'];
      }
    }
    return null;
  }

  private generateObjId(type: string): string {
    return `obj_${type}_${this.objIdCounter++}`;
  }

  private guardStepLimit(): boolean {
    this.stepCount++;
    return this.stepCount < this.stepLimit;
  }

  // ─── Inheritance Helpers ─────────────────────────────────────────

  private findMethod(className: string, methodName: string): MethodNode | undefined {
    let currentClass = className;
    while (currentClass) {
      const cls = this.classRegistry[currentClass];
      if (!cls) break;
      const method = cls.methods.find(m => m.name === methodName);
      if (method) return method;
      currentClass = cls.superClass || '';
    }
    return undefined;
  }

  // ─── Method and Constructor Execution ───────────────────────────

  private executeMethod(method: MethodNode, thisRef: string | null, args?: any[]): any {
    if (!this.guardStepLimit()) return undefined;

    const firstLine = method.body.length > 0 ? (method.body[0] as any)?.line || method.line || 1 : method.line || 1;

    this.steps.push({
      lineNumber: firstLine,
      action: 'PUSH_FRAME',
      payload: { methodName: method.name },
      explanation: `${method.name}() started`
    });

    this.pushScope(thisRef);

    // Bind parameters
    if (args && method.params) {
      method.params.forEach((p, i) => {
        const val = i < args.length ? args[i] : null;
        this.setVar(p.name, val);
        this.steps.push({
          lineNumber: firstLine,
          action: 'SET_VAR',
          payload: { name: p.name, type: p.type, value: this.displayValue(val), referenceId: this.refId(val) },
          explanation: `Parameter ${p.name} = ${this.displayValue(val)}`
        });
      });
    }

    let returnValue: any = undefined;
    for (const stmt of method.body) {
      if (!this.guardStepLimit()) break;
      const result = this.executeStatement(stmt);
      if (result && result.__return) {
        returnValue = result.value;
        break;
      }
    }

    const lastLine = method.body.length > 0 ? (method.body[method.body.length - 1] as any)?.line || method.line || 1 : method.line || 1;
    this.popScope();

    this.steps.push({
      lineNumber: lastLine,
      action: 'POP_FRAME',
      explanation: `${method.name}() returning`
    });

    return returnValue;
  }

  private executeConstructor(ctor: ConstructorNode, objId: string, args: any[]): void {
    if (!this.guardStepLimit()) return;

    this.steps.push({
      lineNumber: ctor.line,
      action: 'PUSH_FRAME',
      payload: { methodName: `${ctor.name}.<init>` },
      explanation: `Constructor ${ctor.name}() started`
    });

    this.pushScope(objId);

    // Bind parameters
    if (ctor.params) {
      ctor.params.forEach((p, i) => {
        const val = i < args.length ? args[i] : null;
        this.setVar(p.name, val);
        this.steps.push({
          lineNumber: ctor.line,
          action: 'SET_VAR',
          payload: { name: p.name, type: p.type, value: this.displayValue(val), referenceId: this.refId(val) },
          explanation: `Parameter ${p.name} = ${this.displayValue(val)}`
        });
      });
    }

    for (const stmt of ctor.body) {
      if (!this.guardStepLimit()) break;
      this.executeStatement(stmt);
    }

    this.popScope();

    this.steps.push({
      lineNumber: ctor.line,
      action: 'POP_FRAME',
      explanation: `Constructor ${ctor.name}() finished`
    });
  }

  // ─── Statement Execution ────────────────────────────────────────

  private executeStatement(stmt: ASTNode): any {
    if (!this.guardStepLimit()) return undefined;

    switch (stmt.type) {
      case 'VarDecl': {
        const val = stmt.init ? this.evaluateExpression(stmt.init) : this.defaultValue(stmt.varType);
        this.setVar(stmt.name, val);
        this.steps.push({
          lineNumber: stmt.line,
          action: 'SET_VAR',
          payload: { 
            name: stmt.name, 
            type: stmt.varType, 
            value: this.displayValue(val),
            referenceId: this.refId(val)
          },
          explanation: `Declared ${stmt.varType} ${stmt.name} = ${this.displayValue(val)}`
        });
        break;
      }

      case 'Assign': {
        const val = this.evaluateExpression(stmt.value);
        this.setVar(stmt.name, val);
        this.steps.push({
          lineNumber: stmt.line,
          action: 'SET_VAR',
          payload: { 
            name: stmt.name, 
            type: 'any',
            value: this.displayValue(val),
            referenceId: this.refId(val)
          },
          explanation: `${stmt.name} = ${this.displayValue(val)}`
        });
        break;
      }

      case 'FieldAssign': {
        const objRef = this.evaluateExpression(stmt.object);
        const val = this.evaluateExpression(stmt.value);
        if (typeof objRef === 'string' && objRef.startsWith('@')) {
          const objId = objRef.substring(1);
          if (this.heap[objId]) {
            this.heap[objId].fields[stmt.field] = val;
            this.steps.push({
              lineNumber: stmt.line,
              action: 'UPDATE_OBJ',
              payload: { id: objId, field: stmt.field, value: this.displayValue(val) },
              explanation: `Set ${stmt.field} = ${this.displayValue(val)} on ${this.heap[objId].type} object`
            });
          }
        }
        break;
      }

      case 'ArrayAssign': {
        const arrRef = this.evaluateExpression(stmt.array);
        const idx = this.evaluateExpression(stmt.index);
        const val = this.evaluateExpression(stmt.value);
        if (typeof arrRef === 'string' && arrRef.startsWith('@')) {
          const objId = arrRef.substring(1);
          if (this.heap[objId]) {
            this.heap[objId].fields[`[${idx}]`] = val;
            this.steps.push({
              lineNumber: stmt.line,
              action: 'UPDATE_OBJ',
              payload: { id: objId, field: `[${idx}]`, value: this.displayValue(val) },
              explanation: `Set array[${idx}] = ${this.displayValue(val)}`
            });
          }
        }
        break;
      }

      case 'CompoundAssign': {
        const currentVal = this.getVar(stmt.name) ?? 0;
        const operand = this.evaluateExpression(stmt.value);
        let newVal: any;
        if (stmt.operator === '+=') newVal = currentVal + operand;
        else if (stmt.operator === '-=') newVal = currentVal - operand;
        else newVal = currentVal;
        this.setVar(stmt.name, newVal);
        this.steps.push({
          lineNumber: stmt.line,
          action: 'SET_VAR',
          payload: { name: stmt.name, type: 'any', value: this.displayValue(newVal) },
          explanation: `${stmt.name} ${stmt.operator} ${this.displayValue(operand)}`
        });
        break;
      }

      case 'Print': {
        const text = this.evaluateExpression(stmt.expression);
        this.steps.push({
          lineNumber: stmt.line,
          action: 'PRINT',
          payload: { text: String(text) },
          explanation: 'Output printed'
        });
        break;
      }

      case 'Return': {
        const val = stmt.value ? this.evaluateExpression(stmt.value) : undefined;
        return { __return: true, value: val };
      }

      case 'MethodCall': {
        this.evaluateMethodCall(stmt);
        break;
      }

      case 'UnaryOp': {
        this.evaluateExpression(stmt);
        break;
      }

      case 'If': {
        const cond = this.evaluateExpression(stmt.condition);
        if (cond) {
          for (const s of stmt.thenBranch) {
            if (!this.guardStepLimit()) break;
            const result = this.executeStatement(s);
            if (result && result.__return) return result;
          }
        } else if (stmt.elseBranch) {
          for (const s of stmt.elseBranch) {
            if (!this.guardStepLimit()) break;
            const result = this.executeStatement(s);
            if (result && result.__return) return result;
          }
        }
        break;
      }

      case 'While': {
        let iters = 0;
        while (this.evaluateExpression(stmt.condition) && iters < 100 && this.guardStepLimit()) {
          for (const s of stmt.body) {
            if (!this.guardStepLimit()) break;
            const result = this.executeStatement(s);
            if (result && result.__return) return result;
          }
          iters++;
        }
        break;
      }

      case 'For': {
        if (stmt.init) this.executeStatement(stmt.init);
        let iters = 0;
        while ((!stmt.condition || this.evaluateExpression(stmt.condition)) && iters < 100 && this.guardStepLimit()) {
          for (const s of stmt.body) {
            if (!this.guardStepLimit()) break;
            const result = this.executeStatement(s);
            if (result && result.__return) return result;
          }
          if (stmt.update) this.evaluateExpression(stmt.update);
          iters++;
        }
        break;
      }
    }

    return undefined;
  }

  // ─── Expression Evaluation ──────────────────────────────────────

  private evaluateExpression(expr: ASTNode): any {
    if (!this.guardStepLimit()) return undefined;

    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier':
        return this.getVar(expr.name);

      case 'This':
        return this.getVar('this');

      case 'FieldAccess': {
        const obj = this.evaluateExpression(expr.object);
        if (typeof obj === 'string' && obj.startsWith('@')) {
          const objId = obj.substring(1);
          const heapObj = this.heap[objId];
          if (heapObj) {
            // Check if it's a field like .length on an array
            if (expr.field === 'length' && heapObj.type.endsWith('[]')) {
              return Object.keys(heapObj.fields).length;
            }
            return heapObj.fields[expr.field];
          }
        }
        return undefined;
      }

      case 'ArrayAccess': {
        const arr = this.evaluateExpression(expr.array);
        const idx = this.evaluateExpression(expr.index);
        if (typeof arr === 'string' && arr.startsWith('@')) {
          const objId = arr.substring(1);
          const heapObj = this.heap[objId];
          if (heapObj) {
            return heapObj.fields[`[${idx}]`];
          }
        }
        return undefined;
      }

      case 'ObjectCreation': {
        return this.createObject(expr.className, expr.args.map(a => this.evaluateExpression(a)), (expr as any).line);
      }

      case 'ArrayCreation': {
        const size = this.evaluateExpression(expr.size);
        const arrId = this.generateObjId(expr.elementType + '[]');
        const fields: Record<string, any> = {};
        for (let i = 0; i < size; i++) {
          fields[`[${i}]`] = this.defaultValueForType(expr.elementType);
        }
        this.heap[arrId] = { id: arrId, type: expr.elementType + '[]', fields };
        this.steps.push({
          lineNumber: expr.line,
          action: 'ALLOC_OBJ',
          payload: { id: arrId, type: `${expr.elementType}[${size}]`, fields: { ...fields } },
          explanation: `Created ${expr.elementType}[${size}] array`
        });
        return `@${arrId}`;
      }

      case 'MethodCall':
        return this.evaluateMethodCall(expr);

      case 'BinaryOp': {
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);
        return this.evalBinaryOp(expr.operator, left, right);
      }

      case 'UnaryOp': {
        return this.evaluateUnary(expr);
      }

      case 'Assign': {
        const val = this.evaluateExpression(expr.value);
        this.setVar(expr.name, val);
        this.steps.push({
          lineNumber: expr.line,
          action: 'SET_VAR',
          payload: { name: expr.name, type: 'any', value: this.displayValue(val), referenceId: this.refId(val) },
          explanation: `${expr.name} = ${this.displayValue(val)}`
        });
        return val;
      }

      case 'CompoundAssign': {
        const currentVal = this.getVar(expr.name) ?? 0;
        const operand = this.evaluateExpression(expr.value);
        let newVal: any;
        if (expr.operator === '+=') newVal = currentVal + operand;
        else if (expr.operator === '-=') newVal = currentVal - operand;
        else newVal = currentVal;
        this.setVar(expr.name, newVal);
        return newVal;
      }

      case 'FieldAssign': {
        const objRef = this.evaluateExpression(expr.object);
        const val = this.evaluateExpression(expr.value);
        if (typeof objRef === 'string' && objRef.startsWith('@')) {
          const objId = objRef.substring(1);
          if (this.heap[objId]) {
            this.heap[objId].fields[expr.field] = val;
            this.steps.push({
              lineNumber: expr.line,
              action: 'UPDATE_OBJ',
              payload: { id: objId, field: expr.field, value: this.displayValue(val) },
              explanation: `Set ${expr.field} = ${this.displayValue(val)}`
            });
          }
        }
        return val;
      }

      case 'ArrayAssign': {
        const arrRef = this.evaluateExpression(expr.array);
        const idx = this.evaluateExpression(expr.index);
        const val = this.evaluateExpression(expr.value);
        if (typeof arrRef === 'string' && arrRef.startsWith('@')) {
          const objId = arrRef.substring(1);
          if (this.heap[objId]) {
            this.heap[objId].fields[`[${idx}]`] = val;
            this.steps.push({
              lineNumber: expr.line,
              action: 'UPDATE_OBJ',
              payload: { id: objId, field: `[${idx}]`, value: this.displayValue(val) },
              explanation: `array[${idx}] = ${this.displayValue(val)}`
            });
          }
        }
        return val;
      }
    }

    return undefined;
  }

  // ─── Object Creation ────────────────────────────────────────────

  private createObject(className: string, args: any[], line: number): string {
    const objId = this.generateObjId(className);
    
    // ----------------------------------------------------
    // Scanner Mocking
    // ----------------------------------------------------
    if (className === 'Scanner') {
      this.heap[objId] = { id: objId, type: className, fields: {} };
      this.steps.push({
        lineNumber: line,
        action: 'ALLOC_OBJ',
        payload: { id: objId, type: className, fields: {} },
        explanation: `Created new Scanner object reading from standard input`
      });
      return `@${objId}`;
    }

    const cls = this.classRegistry[className];
    
    // Initialize fields from class definition and all superclasses
    const fields: Record<string, any> = {};
    let currentCls: ClassNode | undefined = cls;
    while (currentCls) {
      currentCls.fields.forEach(f => {
        if (!(f.name in fields)) {
          fields[f.name] = f.init ? this.evaluateExpression(f.init) : this.defaultValue(f.varType);
        }
      });
      currentCls = currentCls.superClass ? this.classRegistry[currentCls.superClass] : undefined;
    }

    this.heap[objId] = { id: objId, type: className, fields };

    // Generate ALLOC_OBJ step with field display values
    const displayFields: Record<string, string> = {};
    Object.entries(fields).forEach(([k, v]) => {
      displayFields[k] = this.displayValue(v);
    });

    this.steps.push({
      lineNumber: line,
      action: 'ALLOC_OBJ',
      payload: { id: objId, type: className, fields: displayFields },
      explanation: `Created new ${className} object`
    });

    // Execute constructor if one exists
    if (cls && cls.constructors.length > 0) {
      // Find matching constructor (simple: match by arg count)
      const ctor = cls.constructors.find(c => c.params.length === args.length) || cls.constructors[0];
      this.executeConstructor(ctor, objId, args);
      
      // After constructor, update the heap visualization with final field values
      const finalFields: Record<string, string> = {};
      Object.entries(this.heap[objId].fields).forEach(([k, v]) => {
        finalFields[k] = this.displayValue(v);
      });
      // Emit an update for each field that was set by the constructor
      Object.entries(this.heap[objId].fields).forEach(([k, v]) => {
        if (fields[k] !== v) {
          this.steps.push({
            lineNumber: line,
            action: 'UPDATE_OBJ',
            payload: { id: objId, field: k, value: this.displayValue(v) },
            explanation: `Field ${k} initialized to ${this.displayValue(v)}`
          });
        }
      });
    }

    return `@${objId}`;
  }

  // ─── Method Call Resolution ─────────────────────────────────────

  private evaluateMethodCall(expr: any): any {
    const methodName = expr.name;
    const args = (expr.args || []).map((a: ASTNode) => this.evaluateExpression(a));

    // super(...) constructor call
    if (methodName === 'super') {
      const thisRef = this.getThisRef();
      if (thisRef && typeof thisRef === 'string') {
        const objId = thisRef.substring(1);
        const heapObj = this.heap[objId];
        if (heapObj) {
          const cls = this.classRegistry[heapObj.type];
          if (cls && cls.superClass) {
            const superCls = this.classRegistry[cls.superClass];
            if (superCls && superCls.constructors.length > 0) {
              const ctor = superCls.constructors.find(c => c.params.length === args.length) || superCls.constructors[0];
              this.executeConstructor(ctor, objId, args);
              return undefined;
            }
          }
        }
      }
      return undefined;
    }

    // System.gc()
    if (expr.object) {
      const objExpr = expr.object;
      if (objExpr.type === 'Identifier' && objExpr.name === 'System' && methodName === 'gc') {
        this.steps.push({ lineNumber: expr.line, action: 'MARK_GC', explanation: 'GC Mark Phase' });
        this.steps.push({ lineNumber: expr.line, action: 'SWEEP_GC', explanation: 'GC Sweep Phase' });
        return undefined;
      }
      if (objExpr.type === 'Identifier' && objExpr.name === 'System' && methodName === 'exit') {
        return undefined;
      }
      
      // ----------------------------------------------------
      // Scanner Mocking
      // ----------------------------------------------------
      const objRef = this.evaluateExpression(objExpr);
      if (typeof objRef === 'string' && objRef.startsWith('@')) {
        const objId = objRef.substring(1);
        const heapObj = this.heap[objId];
        
        if (heapObj && heapObj.type === 'Scanner') {
          let token = this.scannerTokens.length > 0 ? this.scannerTokens.shift() : "";
          let parsedValue: any = token;
          
          if (methodName === 'nextInt') {
            parsedValue = token ? parseInt(token, 10) : 0;
            if (isNaN(parsedValue)) parsedValue = 0;
            this.steps.push({
              lineNumber: expr.line,
              action: 'PRINT',
              payload: { text: `[Scanner input: ${parsedValue}]` },
              explanation: `Scanner read int: ${parsedValue}`
            });
            return parsedValue;
          } 
          
          if (methodName === 'nextLine' || methodName === 'next') {
            this.steps.push({
              lineNumber: expr.line,
              action: 'PRINT',
              payload: { text: `[Scanner input: "${parsedValue}"]` },
              explanation: `Scanner read string: "${parsedValue}"`
            });
            return parsedValue || "";
          }
        }
      }
    }

    // Instance method call: obj.method()
    if (expr.object) {
      const objRef = this.evaluateExpression(expr.object);
      
      // Handle scanner/built-in method calls gracefully
      if (typeof objRef !== 'string' || !objRef.startsWith('@')) {
        // Built-in or unresolved — return a placeholder
        this.steps.push({ 
          lineNumber: expr.line, 
          action: 'METHOD_CALL', 
          explanation: `Called ${methodName}()` 
        });
        // For nextLine, nextInt, etc. return sensible defaults
        if (methodName === 'nextLine' || methodName === 'next') return '';
        if (methodName === 'nextInt') return 0;
        if (methodName === 'nextDouble') return 0.0;
        if (methodName === 'toString') return String(objRef);
        return undefined;
      }

      const objId = objRef.substring(1);
      const heapObj = this.heap[objId];
      if (!heapObj) return undefined;

      const cls = this.classRegistry[heapObj.type];
      if (!cls) {
        this.steps.push({ lineNumber: expr.line, action: 'METHOD_CALL', explanation: `Called ${heapObj.type}.${methodName}()` });
        return undefined;
      }

      const method = this.findMethod(heapObj.type, methodName);
      if (method) {
        return this.executeMethod(method, objRef, args);
      } else {
        this.steps.push({ lineNumber: expr.line, action: 'METHOD_CALL', explanation: `Called ${heapObj.type}.${methodName}()` });
        return undefined;
      }
    }

    // Static or implicit 'this' method call: methodName()
    const thisRef = this.getThisRef();
    if (thisRef && typeof thisRef === 'string') {
      const objId = thisRef.substring(1);
      const heapObj = this.heap[objId];
      if (heapObj) {
        const method = this.findMethod(heapObj.type, methodName);
        if (method) {
          return this.executeMethod(method, thisRef, args);
        }
      }
    }

    // Search all classes for a matching method (fallback for actual static methods)
    for (const cls of Object.values(this.classRegistry)) {
      const method = cls.methods.find(m => m.name === methodName);
      if (method && method.isStatic) {
        return this.executeMethod(method, null, args);
      }
    }

    this.steps.push({ lineNumber: expr.line, action: 'METHOD_CALL', explanation: `Called ${methodName}()` });
    return undefined;
  }

  // ─── Unary Operations ──────────────────────────────────────────

  private evaluateUnary(expr: any): any {
    if (expr.operator === '!') {
      return !this.evaluateExpression(expr.operand);
    }
    if (expr.operator === '-' && expr.prefix) {
      return -this.evaluateExpression(expr.operand);
    }

    // ++/-- on identifiers
    if (expr.operator === '++' || expr.operator === '--') {
      if (expr.operand.type === 'Identifier') {
        const name = expr.operand.name;
        const oldVal = this.getVar(name) ?? 0;
        const newVal = expr.operator === '++' ? oldVal + 1 : oldVal - 1;
        this.setVar(name, newVal);
        this.steps.push({
          lineNumber: expr.line,
          action: 'SET_VAR',
          payload: { name, type: 'int', value: String(newVal) },
          explanation: `${name}${expr.prefix ? '' : ''} ${expr.operator === '++' ? 'incremented' : 'decremented'} to ${newVal}`
        });
        return expr.prefix ? newVal : oldVal;
      }
    }

    return this.evaluateExpression(expr.operand);
  }

  // ─── Binary Operations ─────────────────────────────────────────

  private evalBinaryOp(op: string, left: any, right: any): any {
    switch (op) {
      case '+': 
        // String concatenation: if either side is a string
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left ?? 'null') + String(right ?? 'null');
        }
        return (left ?? 0) + (right ?? 0);
      case '-': return (left ?? 0) - (right ?? 0);
      case '*': return (left ?? 0) * (right ?? 0);
      case '/': return right !== 0 ? (left ?? 0) / (right ?? 0) : 0;
      case '%': return right !== 0 ? (left ?? 0) % (right ?? 0) : 0;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '==': return left == right;
      case '!=': return left != right;
      case '&&': return left && right;
      case '||': return left || right;
      default: return undefined;
    }
  }

  // ─── Utility ────────────────────────────────────────────────────

  private displayValue(val: any): string {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'string' && val.startsWith('@')) {
      const objId = val.substring(1);
      const obj = this.heap[objId];
      return obj ? `@${objId}` : String(val);
    }
    return String(val);
  }

  private refId(val: any): string | undefined {
    if (typeof val === 'string' && val.startsWith('@')) {
      return val.substring(1);
    }
    return undefined;
  }

  private defaultValue(type: string): any {
    if (type.endsWith('[]')) return null;
    return this.defaultValueForType(type);
  }

  private defaultValueForType(type: string): any {
    switch (type) {
      case 'int': case 'long': case 'short': case 'byte': return 0;
      case 'double': case 'float': return 0.0;
      case 'boolean': return false;
      case 'char': return '\0';
      default: return null; // reference types default to null
    }
  }
}

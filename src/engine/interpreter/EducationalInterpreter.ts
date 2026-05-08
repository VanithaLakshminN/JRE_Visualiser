import type { SyntaxNode } from 'web-tree-sitter';
import type { ExecutionStep } from '../../types';

interface HeapEntry {
  id: string;
  type: string;
  fields: Record<string, any>;
}

interface Scope {
  vars: Record<string, any>;
}

export class EducationalInterpreter {
  private steps: ExecutionStep[] = [];
  private heap: Record<string, HeapEntry> = {};
  private callStack: Scope[] = [];
  private objIdCounter = 0;
  private classes: Record<string, SyntaxNode> = {};

  public interpret(rootNode: SyntaxNode): ExecutionStep[] {
    this.steps = [];
    this.heap = {};
    this.callStack = [];
    this.objIdCounter = 0;
    this.classes = {};

    // 1. Scan for classes
    const classDecls = rootNode.children.filter(c => c.type === 'class_declaration');
    for (const cls of classDecls) {
      const nameNode = cls.childForFieldName('name');
      if (nameNode) {
        this.classes[nameNode.text] = cls;
        this.steps.push({
          lineNumber: cls.startPosition.row + 1,
          action: 'LOAD_CLASS',
          payload: { className: nameNode.text, methods: [], staticVariables: {} },
          explanation: `Loaded class ${nameNode.text}`
        });
      }
    }

    // 2. Find and execute main method
    for (const cls of classDecls) {
      const body = cls.childForFieldName('body');
      if (body) {
        const methods = body.children.filter(c => c.type === 'method_declaration');
        const mainMethod = methods.find(m => m.childForFieldName('name')?.text === 'main');
        if (mainMethod) {
          this.executeMethod(mainMethod, []);
          break;
        }
      }
    }

    return this.steps;
  }

  private pushScope() {
    this.callStack.push({ vars: {} });
  }

  private popScope() {
    this.callStack.pop();
  }

  private getVar(name: string): any {
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (name in this.callStack[i].vars) {
        return this.callStack[i].vars[name];
      }
    }
    return undefined;
  }

  private setVar(name: string, value: any) {
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].vars[name] = value;
    }
  }

  private executeMethod(methodNode: SyntaxNode, args: any[]): any {
    const methodName = methodNode.childForFieldName('name')?.text || 'unknown';
    const line = methodNode.startPosition.row + 1;

    this.steps.push({
      lineNumber: line,
      action: 'PUSH_FRAME',
      payload: { methodName },
      explanation: `${methodName}() started`
    });

    this.pushScope();

    // Map args to parameters if needed (simplified for this scratch test)
    
    let returnValue: any = undefined;
    const body = methodNode.childForFieldName('body');
    if (body) {
      for (const stmt of body.children) {
        if (stmt.type === '{' || stmt.type === '}') continue;
        const result = this.executeStatement(stmt);
        if (result && result.__return) {
          returnValue = result.value;
          break;
        }
      }
    }

    this.popScope();

    this.steps.push({
      lineNumber: methodNode.endPosition.row + 1,
      action: 'POP_FRAME',
      explanation: `${methodName}() returning`
    });

    return returnValue;
  }

  private executeStatement(stmt: SyntaxNode): any {
    const line = stmt.startPosition.row + 1;

    switch (stmt.type) {
      case 'local_variable_declaration': {
        const typeNode = stmt.childForFieldName('type');
        const typeName = typeNode?.text || 'any';
        
        // Find variable_declarator
        const decl = stmt.children.find(c => c.type === 'variable_declarator');
        if (decl) {
          const name = decl.childForFieldName('name')?.text || '';
          const valueNode = decl.childForFieldName('value');
          let val = null;
          if (valueNode) {
            val = this.evaluateExpression(valueNode);
          }
          this.setVar(name, val);
          
          this.steps.push({
            lineNumber: line,
            action: 'SET_VAR',
            payload: { name, type: typeName, value: this.displayValue(val), referenceId: this.refId(val) },
            explanation: `Declared ${name} = ${this.displayValue(val)}`
          });
        }
        break;
      }

      case 'expression_statement': {
        const expr = stmt.children[0];
        if (expr) {
          this.evaluateExpression(expr);
        }
        break;
      }

      case 'return_statement': {
        let val = undefined;
        // The return value is usually the first named child
        const retExpr = stmt.namedChildren[0];
        if (retExpr) {
          val = this.evaluateExpression(retExpr);
        }
        return { __return: true, value: val };
      }
    }
  }

  private evaluateExpression(expr: SyntaxNode): any {
    const line = expr.startPosition.row + 1;

    switch (expr.type) {
      case 'string_literal': {
        // Strip quotes
        return expr.text.slice(1, -1);
      }

      case 'identifier': {
        return this.getVar(expr.text);
      }

      case 'object_creation_expression': {
        const typeNode = expr.childForFieldName('type');
        const className = typeNode?.text || 'Object';
        
        const objId = `obj_${className}_${this.objIdCounter++}`;
        this.heap[objId] = { id: objId, type: className, fields: {} };
        
        // Initialize default fields from class
        const clsNode = this.classes[className];
        if (clsNode) {
          const clsBody = clsNode.childForFieldName('body');
          if (clsBody) {
            const fields = clsBody.children.filter(c => c.type === 'field_declaration');
            for (const f of fields) {
              const decl = f.children.find(c => c.type === 'variable_declarator');
              if (decl) {
                const fName = decl.childForFieldName('name')?.text;
                if (fName) {
                  this.heap[objId].fields[fName] = null; // Default null
                }
              }
            }
          }
        }

        this.steps.push({
          lineNumber: line,
          action: 'ALLOC_OBJ',
          payload: { id: objId, type: className, fields: { ...this.heap[objId].fields } },
          explanation: `Created new ${className} object`
        });

        return `@${objId}`;
      }

      case 'assignment_expression': {
        const left = expr.childForFieldName('left');
        const right = expr.childForFieldName('right');
        
        if (left && right) {
          const val = this.evaluateExpression(right);
          
          if (left.type === 'field_access') {
            const objNode = left.childForFieldName('object');
            const fieldNode = left.childForFieldName('field');
            if (objNode && fieldNode) {
              const objRef = this.evaluateExpression(objNode);
              const fieldName = fieldNode.text;
              
              if (typeof objRef === 'string' && objRef.startsWith('@')) {
                const objId = objRef.substring(1);
                if (this.heap[objId]) {
                  this.heap[objId].fields[fieldName] = val;
                  this.steps.push({
                    lineNumber: line,
                    action: 'UPDATE_OBJ',
                    payload: { id: objId, field: fieldName, value: this.displayValue(val) },
                    explanation: `Set ${fieldName} = ${this.displayValue(val)}`
                  });
                }
              }
            }
          }
          return val;
        }
        break;
      }

      case 'method_invocation': {
        const objectNode = expr.childForFieldName('object');
        const nameNode = expr.childForFieldName('name');
        
        if (objectNode && nameNode) {
          const objText = objectNode.text;
          const nameText = nameNode.text;
          
          if (objText === 'System.out' && nameText === 'println') {
            const argsNode = expr.childForFieldName('arguments');
            if (argsNode && argsNode.namedChildren.length > 0) {
              const argVal = this.evaluateExpression(argsNode.namedChildren[0]);
              this.steps.push({
                lineNumber: line,
                action: 'PRINT',
                payload: { text: String(argVal) },
                explanation: `Printed to console`
              });
            }
            return undefined;
          }
        } else if (nameNode) {
          // Static or local method call
          const methodName = nameNode.text;
          let targetMethod: SyntaxNode | null = null;
          
          // Search in all classes for the method
          for (const cls of Object.values(this.classes)) {
            const body = cls.childForFieldName('body');
            if (body) {
              const methods = body.children.filter(c => c.type === 'method_declaration');
              const found = methods.find(m => m.childForFieldName('name')?.text === methodName);
              if (found) {
                targetMethod = found;
                break;
              }
            }
          }
          
          if (targetMethod) {
            return this.executeMethod(targetMethod, []);
          }
        }
        break;
      }
      
      case 'field_access': {
        const objNode = expr.childForFieldName('object');
        const fieldNode = expr.childForFieldName('field');
        if (objNode && fieldNode) {
          const objRef = this.evaluateExpression(objNode);
          if (typeof objRef === 'string' && objRef.startsWith('@')) {
            const objId = objRef.substring(1);
            if (this.heap[objId]) {
              return this.heap[objId].fields[fieldNode.text];
            }
          }
        }
        break;
      }
    }

    return undefined;
  }

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
}

export const educationalInterpreter = new EducationalInterpreter();

import { Parser, Language } from 'web-tree-sitter';

const code = `
class User {
    String name;
}

public class Main {
    static User createUser() {
        User u = new User();
        u.name = "Vanitha";
        return u;
    }
    public static void main(String[] args) {
        User x = createUser();
        System.out.println(x.name);
    }
}
`;

async function main() {
  await Parser.init();
  const parser = new Parser();
  const Java = await Language.load('node_modules/tree-sitter-java/tree-sitter-java.wasm');
  parser.setLanguage(Java);

  const tree = parser.parse(code);
  
  function printNode(node, depth = 0) {
    console.log(' '.repeat(depth * 2) + node.type + (node.isNamed ? (' (' + node.text.replace(/\n/g, '\\n') + ')') : ''));
    for (let child of node.children) {
      if (child.isNamed) {
         console.log(' '.repeat(depth * 2 + 1) + '[' + child.type + '] field:' + node.fieldNameForChild(node.children.indexOf(child)));
         printNode(child, depth + 1);
      }
    }
  }
  printNode(tree.rootNode);
}

main().catch(console.error);

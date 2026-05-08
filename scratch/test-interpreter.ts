import { javaParser } from '../src/engine/parser/JavaParser';
import { educationalInterpreter } from '../src/engine/interpreter/EducationalInterpreter';

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
  await javaParser.initialize();
  const tree = javaParser.parse(code);
  if (!tree) throw new Error("Parse failed");

  const events = educationalInterpreter.interpret(tree.rootNode);
  console.log(JSON.stringify(events, null, 2));
}

main().catch(console.error);

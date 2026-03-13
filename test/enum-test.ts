import { CharStreams, CommonTokenStream } from "antlr4ts";
import { JavaLexer } from "../out/parser/JavaLexer";
import { JavaParser } from "../out/parser/JavaParser";
import { CommentListener } from "../out/parser/CommentListener";
import { SpringControllerListener } from "../out/parser/SpringControllerListener";
import { OpenAPIGenerator } from "../out/parser/OpenAPIGenerator";
import { ParseTreeWalker } from 'antlr4ts/tree';

const testCode = `
public enum StatusEnum {
    ACTIVE(1, "激活"),
    INACTIVE(0, "未激活");
    
    private Integer value;
    private String desc;
    
    StatusEnum(Integer value, String desc) {
        this.value = value;
        this.desc = desc;
    }
}

public enum SimpleEnum {
    VALUE1, VALUE2
}

public enum SingleParamEnum {
    OPTION1(100),
    OPTION2(200)
}
`;

console.log("=== 测试枚举解析 ===\n");

const openapiGenerator = new OpenAPIGenerator();
const controllerListener = new SpringControllerListener(openapiGenerator);

const inputStream = CharStreams.fromString(testCode);
const lexer = new JavaLexer(inputStream);
const tokenStream = new CommonTokenStream(lexer);
const parser = new JavaParser(tokenStream);
const tree = parser.compilationUnit();

const commentListener = new CommentListener(tokenStream.getTokens(), controllerListener);

ParseTreeWalker.DEFAULT.walk(commentListener, tree);
ParseTreeWalker.DEFAULT.walk(controllerListener, tree);

const result = JSON.parse(openapiGenerator.build());

console.log("=== StatusEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.StatusEnum, null, 2));

console.log("\n=== SimpleEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SimpleEnum, null, 2));

console.log("\n=== SingleParamEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SingleParamEnum, null, 2));
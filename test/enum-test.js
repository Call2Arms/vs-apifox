"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const antlr4ts_1 = require("antlr4ts");
const JavaLexer_1 = require("../out/parser/JavaLexer");
const JavaParser_1 = require("../out/parser/JavaParser");
const CommentListener_1 = require("../out/parser/CommentListener");
const SpringControllerListener_1 = require("../out/parser/SpringControllerListener");
const OpenAPIGenerator_1 = require("../out/parser/OpenAPIGenerator");
const tree_1 = require("antlr4ts/tree");
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
const openapiGenerator = new OpenAPIGenerator_1.OpenAPIGenerator();
const controllerListener = new SpringControllerListener_1.SpringControllerListener(openapiGenerator);
const inputStream = antlr4ts_1.CharStreams.fromString(testCode);
const lexer = new JavaLexer_1.JavaLexer(inputStream);
const tokenStream = new antlr4ts_1.CommonTokenStream(lexer);
const parser = new JavaParser_1.JavaParser(tokenStream);
const tree = parser.compilationUnit();
const commentListener = new CommentListener_1.CommentListener(tokenStream.getTokens(), controllerListener);
tree_1.ParseTreeWalker.DEFAULT.walk(commentListener, tree);
tree_1.ParseTreeWalker.DEFAULT.walk(controllerListener, tree);
const result = JSON.parse(openapiGenerator.build());
console.log("=== StatusEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.StatusEnum, null, 2));
console.log("\n=== SimpleEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SimpleEnum, null, 2));
console.log("\n=== SingleParamEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SingleParamEnum, null, 2));
//# sourceMappingURL=enum-test.js.map
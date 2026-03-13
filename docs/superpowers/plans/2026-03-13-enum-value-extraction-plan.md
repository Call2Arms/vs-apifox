# 枚举值提取增强功能实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强VS Code插件的枚举处理能力，支持从Java枚举构造函数中提取value和desc字段，生成符合前端需求的OpenAPI文档。

**Architecture:** 通过扩展VS Code配置项，增强SpringControllerListener的枚举解析逻辑，从枚举构造函数参数中提取value和desc字段，并根据配置生成OpenAPI Schema。

**Tech Stack:** TypeScript, VS Code Extension API, ANTLR4 Parser

---

## 文件结构

### 新增文件
- 无

### 修改文件
- `package.json` - 添加枚举配置项定义
- `src/types/index.ts` - 添加枚举相关类型定义
- `src/services/ConfigService.ts` - 添加枚举配置读取方法
- `src/parser/SpringControllerListener.ts` - 增强枚举解析逻辑
- `src/parser/OpenAPIGenerator.ts` - 添加枚举Schema生成方法

---

## Chunk 1: 类型定义和配置项

### Task 1: 添加枚举类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 在types/index.ts添加枚举相关类型定义**

```typescript
export interface EnumValueInfo {
    name: string;
    value?: any;
    description?: string;
}

export interface EnumDefinition {
    name: string;
    values: EnumValueInfo[];
    description?: string;
}

export interface EnumSchema {
    type: "string" | "integer" | "number";
    enum: any[];
    "x-enum-descriptions"?: string[];
    description?: string;
}

export interface EnumConfig {
    enumValueSource: 'name' | 'constructor-first-param';
    enumDescriptionSource: 'name' | 'constructor-second-param';
}
```

- [ ] **Step 2: 验证类型定义编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交类型定义**

```bash
git add src/types/index.ts
git commit -m "feat: 添加枚举相关类型定义"
```

---

### Task 2: 添加VS Code配置项

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在package.json的contributes.configuration中添加枚举配置项**

在 `package.json` 的 `contributes` 部分添加 `configuration`：

```json
"contributes": {
  "configuration": {
    "title": "Spring API Helper",
    "properties": {
      "springApiHelper.enumValueSource": {
        "type": "string",
        "default": "name",
        "enum": ["name", "constructor-first-param"],
        "description": "枚举值来源：'name' 使用枚举名称，'constructor-first-param' 使用构造函数第一个参数"
      },
      "springApiHelper.enumDescriptionSource": {
        "type": "string",
        "default": "name",
        "enum": ["name", "constructor-second-param"],
        "description": "枚举描述来源：'name' 使用枚举名称，'constructor-second-param' 使用构造函数第二个参数"
      }
    }
  },
  "viewsContainers": {
    ...
  }
}
```

- [ ] **Step 2: 验证package.json格式正确**

Run: `cat package.json | jq . > /dev/null && echo "JSON格式正确"`
Expected: 输出 "JSON格式正确"

- [ ] **Step 3: 提交配置项**

```bash
git add package.json
git commit -m "feat: 添加枚举值和描述来源的配置项"
```

---

### Task 3: 扩展ConfigService

**Files:**
- Modify: `src/services/ConfigService.ts`

- [ ] **Step 1: 导入EnumConfig类型**

在文件顶部添加导入：

```typescript
import { EnumConfig } from '../types/index.js';
```

- [ ] **Step 2: 添加getEnumConfig静态方法**

在ConfigService类中添加方法：

```typescript
static getEnumConfig(): EnumConfig {
    const config = vscode.workspace.getConfiguration('springApiHelper');
    
    return {
        enumValueSource: config.get('enumValueSource') || 'name',
        enumDescriptionSource: config.get('enumDescriptionSource') || 'name'
    };
}
```

- [ ] **Step 3: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 4: 提交ConfigService更改**

```bash
git add src/services/ConfigService.ts
git commit -m "feat: 添加枚举配置读取方法"
```

---

## Chunk 2: 枚举解析逻辑增强

### Task 4: 增强SpringControllerListener - 数据结构

**Files:**
- Modify: `src/parser/SpringControllerListener.ts`

- [ ] **Step 1: 导入枚举相关类型**

在文件顶部修改导入：

```typescript
import { ApiEndpoint, ApiParameter, EnumDefinition, EnumValueInfo } from '../types/index.js';
```

- [ ] **Step 2: 修改enumDefinitions类型**

将第19行的类型定义从：

```typescript
enumDefinitions: { [key: string]: string[] };
```

修改为：

```typescript
enumDefinitions: { [key: string]: EnumDefinition };
```

- [ ] **Step 3: 修改构造函数中的enumDefinitions初始化**

将第38行从：

```typescript
this.enumDefinitions = {};
```

保持不变（空对象初始化正确）

- [ ] **Step 4: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，可能会有类型错误（后续步骤修复）

- [ ] **Step 5: 提交数据结构更改**

```bash
git add src/parser/SpringControllerListener.ts
git commit -m "feat: 更新枚举定义数据结构"
```

---

### Task 5: 添加表达式值解析方法

**Files:**
- Modify: `src/parser/SpringControllerListener.ts`

- [ ] **Step 1: 在SpringControllerListener类中添加parseExpressionValue方法**

在类的末尾（exitMethodDeclaration方法之后）添加：

```typescript
parseExpressionValue(text: string): any {
    if (text.startsWith('"') || text.startsWith("'")) {
        return text.slice(1, -1);
    }
    
    if (/^\d+$/.test(text)) {
        return parseInt(text, 10);
    }
    
    if (/^\d+\.\d+$/.test(text)) {
        return parseFloat(text);
    }
    
    if (text === 'true' || text === 'false') {
        return text === 'true';
    }
    
    return text;
}
```

- [ ] **Step 2: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交parseExpressionValue方法**

```bash
git add src/parser/SpringControllerListener.ts
git commit -m "feat: 添加表达式值解析方法"
```

---

### Task 6: 添加构造函数参数提取方法

**Files:**
- Modify: `src/parser/SpringControllerListener.ts`

- [ ] **Step 1: 在SpringControllerListener类中添加extractConstructorArgs方法**

在parseExpressionValue方法之前添加：

```typescript
extractConstructorArgs(constant: any): any[] {
    const args: any[] = [];
    
    try {
        const argumentsCtx = constant.arguments();
        if (argumentsCtx) {
            const expressionList = argumentsCtx.expressionList();
            if (expressionList) {
                expressionList.expression().forEach((expr: any) => {
                    try {
                        const value = this.parseExpressionValue(expr.text);
                        args.push(value);
                    } catch (e) {
                        args.push(null);
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Failed to extract constructor args:', e);
    }
    
    return args;
}
```

- [ ] **Step 2: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交extractConstructorArgs方法**

```bash
git add src/parser/SpringControllerListener.ts
git commit -m "feat: 添加构造函数参数提取方法"
```

---

### Task 7: 重写enterEnumDeclaration方法

**Files:**
- Modify: `src/parser/SpringControllerListener.ts`

- [ ] **Step 1: 重写enterEnumDeclaration方法**

将现有的enterEnumDeclaration方法（第245-266行）替换为：

```typescript
enterEnumDeclaration(ctx: EnumDeclarationContext) {
    const enumName = ctx.identifier().text;
    const enumValues: EnumValueInfo[] = [];
    
    const enumConstants = ctx.enumConstants();
    if (enumConstants) {
        enumConstants.enumConstant().forEach((constant: any) => {
            const name = constant.identifier().text;
            const args = this.extractConstructorArgs(constant);
            
            enumValues.push({
                name: name,
                value: args[0],
                description: args[1]
            });
        });
    }
    
    const enumDef: EnumDefinition = {
        name: enumName,
        values: enumValues,
        description: this.getComment(ctx)
    };
    
    this.enumDefinitions[enumName] = enumDef;
    
    this.openapi.addEnumSchema(enumName, enumDef);
}
```

- [ ] **Step 2: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，可能会有OpenAPIGenerator.addEnumSchema方法不存在的错误（下一步修复）

- [ ] **Step 3: 提交enterEnumDeclaration重写**

```bash
git add src/parser/SpringControllerListener.ts
git commit -m "feat: 重写枚举解析逻辑以支持构造函数参数提取"
```

---

### Task 8: 更新parseEnumValues方法

**Files:**
- Modify: `src/parser/SpringControllerListener.ts`

- [ ] **Step 1: 更新parseEnumValues方法**

将现有的parseEnumValues方法（第239-242行）替换为：

```typescript
parseEnumValues(enumType: string): any[] {
    const enumDef = this.enumDefinitions[enumType];
    if (!enumDef) {
        return [];
    }
    
    return enumDef.values.map(v => v.name);
}
```

- [ ] **Step 2: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交parseEnumValues更新**

```bash
git add src/parser/SpringControllerListener.ts
git commit -m "feat: 更新parseEnumValues方法以使用新的数据结构"
```

---

## Chunk 3: OpenAPI Schema生成

### Task 9: 扩展OpenAPIGenerator

**Files:**
- Modify: `src/parser/OpenAPIGenerator.ts`

- [ ] **Step 1: 导入ConfigService和EnumDefinition类型**

在文件顶部添加：

```typescript
import { ConfigService } from '../services/ConfigService.js';
import { EnumDefinition } from '../types/index.js';
```

- [ ] **Step 2: 添加addEnumSchema方法**

在hasSchema方法之后添加：

```typescript
addEnumSchema(enumName: string, enumDef: EnumDefinition) {
    const config = ConfigService.getEnumConfig();
    
    const enumValues = enumDef.values.map(v => {
        if (config.enumValueSource === 'constructor-first-param') {
            return v.value !== undefined ? v.value : v.name;
        }
        return v.name;
    });
    
    const descriptions = enumDef.values.map(v => {
        if (config.enumDescriptionSource === 'constructor-second-param') {
            return v.description !== undefined ? v.description : v.name;
        }
        return v.name;
    });
    
    const schema: any = {
        type: this.inferEnumType(enumValues),
        enum: enumValues,
        "x-enum-descriptions": descriptions,
        description: enumDef.description
    };
    
    this.openapi.components.schemas[enumName] = schema;
}
```

- [ ] **Step 3: 添加inferEnumType辅助方法**

在build方法之前添加：

```typescript
inferEnumType(values: any[]): "string" | "integer" | "number" {
    if (values.every(v => typeof v === 'number' && Number.isInteger(v))) {
        return 'integer';
    }
    if (values.every(v => typeof v === 'number')) {
        return 'number';
    }
    return 'string';
}
```

- [ ] **Step 4: 验证编译通过**

Run: `npm run compile`
Expected: 编译成功，无错误

- [ ] **Step 5: 提交OpenAPIGenerator扩展**

```bash
git add src/parser/OpenAPIGenerator.ts
git commit -m "feat: 添加枚举Schema生成方法和类型推断"
```

---

## Chunk 4: 测试和验证

### Task 10: 创建测试用例

**Files:**
- Create: `test/enum-test.ts`

- [ ] **Step 1: 创建测试目录**

Run: `mkdir -p /mnt/d/workspace/2026病历质控/apifox/vs-apifox/test`

- [ ] **Step 2: 创建测试文件**

创建 `test/enum-test.ts`:

```typescript
import { CharStreams, CommonTokenStream } from "antlr4ts";
import { JavaLexer } from "../src/parser/JavaLexer";
import { JavaParser } from "../src/parser/JavaParser";
import { CommentListener } from "../src/parser/CommentListener";
import { SpringControllerListener } from "../src/parser/SpringControllerListener";
import { OpenAPIGenerator } from "../src/parser/OpenAPIGenerator";

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

const ParseTreeWalker = require('antlr4ts/tree').ParseTreeWalker;
ParseTreeWalker.DEFAULT.walk(commentListener, tree);
ParseTreeWalker.DEFAULT.walk(controllerListener, tree);

const result = JSON.parse(openapiGenerator.build());

console.log("=== StatusEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.StatusEnum, null, 2));

console.log("\n=== SimpleEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SimpleEnum, null, 2));

console.log("\n=== SingleParamEnum Schema ===");
console.log(JSON.stringify(result.components.schemas.SingleParamEnum, null, 2));
```

- [ ] **Step 3: 运行测试验证默认配置**

Run: `npx ts-node test/enum-test.ts`
Expected: 输出枚举Schema，默认使用枚举名称

- [ ] **Step 4: 提交测试文件**

```bash
git add test/enum-test.ts
git commit -m "test: 添加枚举解析测试用例"
```

---

### Task 11: 手动测试完整功能

**Files:**
- 无

- [ ] **Step 1: 编译项目**

Run: `npm run compile`
Expected: 编译成功

- [ ] **Step 2: 打包插件**

Run: `npm run package`
Expected: 生成 .vsix 文件

- [ ] **Step 3: 在VS Code中测试**

1. 安装生成的 .vsix 插件
2. 打开VS Code设置，搜索 "Spring API Helper"
3. 验证配置项显示正确：
   - enumValueSource
   - enumDescriptionSource
4. 创建测试Java文件：

```java
public enum StatusEnum implements BaseEnum<Integer> {
    ACTIVE(1, "激活"),
    INACTIVE(0, "未激活");
    
    private Integer value;
    private String desc;
    
    StatusEnum(Integer value, String desc) {
        this.value = value;
        this.desc = desc;
    }
}
```

5. 运行插件生成OpenAPI文档
6. 验证输出Schema

- [ ] **Step 4: 测试不同配置组合**

测试以下配置组合并验证输出：

1. 默认配置（使用枚举名称）
2. `enumValueSource='constructor-first-param'` (使用value)
3. `enumDescriptionSource='constructor-second-param'` (使用desc)
4. 同时配置value和desc

Expected: 每种配置组合都能正确生成对应的Schema

---

### Task 12: 文档更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在README.md中添加枚举配置说明**

在使用教程部分之后添加：

```markdown
### 枚举配置

本插件支持从Java枚举构造函数中提取value和desc字段，生成符合前端需求的OpenAPI文档。

#### 配置项

在VS Code设置中配置以下选项：

1. **springApiHelper.enumValueSource**
   - `name`: 使用枚举名称（默认）
   - `constructor-first-param`: 使用构造函数第一个参数

2. **springApiHelper.enumDescriptionSource**
   - `name`: 使用枚举名称（默认）
   - `constructor-second-param`: 使用构造函数第二个参数

#### 示例

Java枚举定义：
```java
public enum StatusEnum implements BaseEnum<Integer> {
    ACTIVE(1, "激活"),
    INACTIVE(0, "未激活");
    
    private Integer value;
    private String desc;
    
    StatusEnum(Integer value, String desc) {
        this.value = value;
        this.desc = desc;
    }
}
```

配置：
```json
{
  "springApiHelper.enumValueSource": "constructor-first-param",
  "springApiHelper.enumDescriptionSource": "name"
}
```

生成的OpenAPI Schema：
```json
{
  "StatusEnum": {
    "type": "integer",
    "enum": [1, 0],
    "x-enum-descriptions": ["ACTIVE", "INACTIVE"],
    "description": "状态枚举"
  }
}
```
```

- [ ] **Step 2: 提交文档更新**

```bash
git add README.md
git commit -m "docs: 添加枚举配置使用说明"
```

---

## 完成检查清单

- [ ] 所有代码编译通过
- [ ] 所有单元测试通过
- [ ] 手动测试验证功能正常
- [ ] 文档已更新
- [ ] 代码已提交到git
- [ ] 生成的OpenAPI文档符合预期

## 注意事项

1. **向后兼容**: 默认配置保持现有行为，使用枚举名称
2. **错误处理**: 构造函数参数缺失时回退到枚举名称
3. **类型推断**: 根据枚举值自动推断string/integer/number类型
4. **配置验证**: VS Code会自动验证配置项的有效性
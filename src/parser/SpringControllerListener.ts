// spring-controller-listener.js
import { ParseTreeListener } from "antlr4ts/tree";
import {
  ClassDeclarationContext,
  MethodDeclarationContext,
} from "./JavaParser";

import { ApiEndpoint, ApiParameter } from "../types/index.js";

export class SpringControllerListener implements ParseTreeListener {
  openapi: any;
  currentClass: string | null;
  currentClassComment: string | null;
  basePath: string;
  currentMethod: any;
  comments: Map<string, string[]>; // 改为 Map 类型
  classDefinitions: { [key: string]: any }; // 存储类定义
  endpoints: ApiEndpoint[];
  filePath: string;

  // 添加必需的 ParseTreeListener 接口方法
  visitTerminal(): void {}
  visitErrorNode(): void {}
  enterEveryRule(): void {}
  exitEveryRule(): void {}
  exitClassDeclaration(): void {}

  constructor(openapiGenerator: any) {
    this.openapi = openapiGenerator;
    this.currentClass = null;
    this.currentClassComment = null;
    this.basePath = "";
    this.currentMethod = null;
    this.comments = new Map();
    this.classDefinitions = {}; // 存储类定义
    this.endpoints = [];
    this.filePath = '';
  }

  public setFilePath(filePath: string){
    this.filePath = filePath;
  }

  // 修改获取注释的辅助方法
  private getComment(ctx: any): string {
    const comments = this.comments.get(ctx.text);
    return comments && comments.length > 0 ? comments[0].replace("//", "").trim() : "";
  }

  // 修改获取参数注释的辅助方法
  private findParamComment(ctx: any, paramName: string): string {
    const comments = this.comments.get(ctx.text);
    return comments && comments.length > 0 ? comments[0].replace("//", "").trim() : "";
  }

  // 进入类声明（捕获 @RestController 和基础路径）
  enterClassDeclaration(ctx: ClassDeclarationContext) {
    const className = ctx.identifier().text;
    // 直接从类声明获取修饰符
    const classAnnotations =
      ctx.parent?.children
        ?.filter(
          (child) =>
            child.constructor.name === "ClassOrInterfaceModifierContext"
        )
        .flat() || [];

    console.debug("Class annotations:", {
      className: ctx.identifier()?.text,
      annotations: classAnnotations.map((a: any) => a.text),
    });

    // 检查是否是 Spring 控制器
    const isController = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("RestController") ||
        annot.text.includes("Controller")
    );

    // 检查是否是 Spring 控制器
    const isService = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("Service") ||
        annot.text.includes("ServiceImpl")
    );

    // 检查是否是 Spring 控制器
    const isRepository = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("Mapper") ||
        annot.text.includes("Repository") ||
        annot.text.includes("Dao")
    );

    if (isController) {
      this.currentClass = ctx.identifier().text;
      this.currentClassComment = this.getComment(ctx);
      // 提取类级别的 @RequestMapping 路径
      const requestMapping = classAnnotations.find((annot: any) =>
        annot.text.startsWith("@RequestMapping")
      );
      if (requestMapping) {
        this.basePath = this.extractAnnotationValue(requestMapping.text);
      }
    } else if (isService || isRepository) {
      // 如果是服务类或者仓储类，则不解析其字段作为 schema
    } else {
      // 如果是普通类，解析其字段作为 schema
      this.parseClassSchema(className, ctx);
    }
  }

  // 解析类定义并生成 schema
  parseClassSchema(className: string, ctx: ClassDeclarationContext) {
    if (this.openapi.hasSchema(className)) return; // 避免重复解析
    const schema: {
      type: string;
      properties: { [key: string]: any };
      description: string;
    } = {
      type: "object",
      properties: {},
      description: "",
    };

    // 获取类注释
    const classComment = this.getComment(ctx);
    if (classComment) {
      schema.description = classComment;
    }

    // 遍历类体，提取字段
    ctx
      .classBody()
      .classBodyDeclaration()
      .forEach((decl) => {
        const fieldDecl = decl.memberDeclaration()?.fieldDeclaration();
        if (fieldDecl) {
          const fieldType = fieldDecl.typeType().text;
          const fieldName = fieldDecl
            .variableDeclarators()
            .variableDeclarator(0)
            .variableDeclaratorId()
            .identifier().text;

          // 获取字段注释
          const fieldComment = this.findParamComment(fieldDecl, fieldName);

          // schema.properties[fieldName] = {
          //   type: this.mapJavaTypeToOpenAPI(fieldType),
          //   description: fieldComment ? fieldComment.trim() : "",
          // };
          schema.properties[fieldName] = this.parseFieldSchema(fieldType, fieldDecl);
        }
      });

    // 注册 schema
    this.openapi.addSchema(className, schema);
  }

  // 解析字段类型（支持嵌套对象、集合类型和枚举）
  parseFieldSchema(fieldType: string, decl: any) {
    const schema: {
      type?: string;
      description?: string;
      items?: any;
      $ref?: string;
      enum?: any[];
    } = {
      type: this.mapJavaTypeToOpenAPI(fieldType),
      description: this.findParamComment(decl, fieldType),
    };

    // 处理集合类型（如 List<User>）
    if (fieldType.startsWith("List<") || fieldType.startsWith("Set<")) {
      const itemType = fieldType.match(/<([^>]+)>/)?.[1];
      if (itemType) {
        schema.type = "array";
        schema.items = this.parseFieldSchema(itemType, decl);
      }
    }
    // 处理嵌套对象（如 User）
    else if (/^[A-Z]/.test(fieldType)) {
      if (!this.openapi.hasSchema(fieldType)) {
        const classCtx = this.classDefinitions[fieldType];
        if (classCtx) {
          this.parseClassSchema(fieldType, classCtx);
        }
      }
      // 如果是java的基本类型不需要设置$ref
      if (
        !["int", "long", "float", "double", "string", "boolean", "date", "time", "timestamp", "localdatetime"].includes(
          fieldType.toLocaleLowerCase()
        )
      ) {
        schema.$ref = `#/components/schemas/${fieldType}`;
      }
    }
    // 处理枚举类型
    else if (fieldType.endsWith("Enum")) {
      schema.enum = this.parseEnumValues(fieldType);
    }

    return schema;
  }

  // 解析枚举值
  parseEnumValues(enumType: string) {
    // 在实际项目中，可以通过遍历 AST 查找枚举定义
    return []; // 这里简化实现
  }

  // 进入方法声明（捕获 @GetMapping/@PostMapping 等）
  enterMethodDeclaration(ctx: MethodDeclarationContext) {
    console.debug("Entering method declaration", {
      methodName: ctx.identifier()?.text,
      currentClass: this.currentClass,
    });
    if (!this.currentClass) return;

    // 修复 modifier 访问方式
    const methodAnnotations =
      ctx.parent?.parent?.children
        ?.filter((child) => child.constructor.name === "ModifierContext")
        .map((mod: any) => mod.classOrInterfaceModifier()?.annotation())
        .filter(Boolean)
        .flat() || [];

    const httpMethodAnnotation = methodAnnotations.find((annot: any) =>
      [
        "GetMapping",
        "PostMapping",
        "PutMapping",
        "DeleteMapping",
        "RequestMapping",
      ].some((name) => annot.text.startsWith(`@${name}`))
    );

    if (!httpMethodAnnotation) {
      return; // 不清空 currentMethod，只是返回
    }

    // 解析 HTTP 方法和路径
    const annotationText = httpMethodAnnotation.text;
    const httpMethod = this.extractHttpMethod(annotationText);
    const path = this.basePath + this.extractAnnotationValue(annotationText);

    // 初始化 OpenAPI Operation 对象
    this.currentMethod = {
      path,
      method: httpMethod.toLowerCase(),
      operation: {
        summary: "",
        tags: ["VS-APIFOX" + "/" + this.currentClassComment],
        description: "",
        parameters: [],
        responses: {
          200: { description: "OK" },
        },
      },
    };

    // 获取方法注释
    const methodComment = this.getComment(ctx);
    if (methodComment) {
      this.currentMethod.operation.description = methodComment;
      this.currentMethod.operation.summary = methodComment;
    }

    // 提取方法参数
    const paramsCtx = ctx.formalParameters().formalParameterList();
    if (paramsCtx) {
      paramsCtx.formalParameter().forEach((paramCtx) => {
        const paramAnnotations = paramCtx
          .variableModifier()
          ?.flatMap((mod) => mod.annotation()?.text || []);
        const paramType = paramCtx.typeType().text;
        const paramName = paramCtx.variableDeclaratorId().identifier().text;

        // 解析参数位置和类型
        let paramLocation = "query";
        if (paramAnnotations?.some((a) => a.includes("PathVariable"))) {
          paramLocation = "path";
        } else if (paramAnnotations?.some((a) => a.includes("RequestBody"))) {
          paramLocation = "body";
          // 修改：使用 $ref 引用已定义的 schema
          this.currentMethod.operation.requestBody = {
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${paramType}`,
                },
              },
            },
          };
        }

        this.currentMethod.operation.parameters.push({
          name: paramName,
          in: paramLocation,
          schema: { type: this.mapJavaTypeToOpenAPI(paramType) },
          description: "", // 从注释中提取描述
        });
      });
    }

    // 提取返回类型 - 修改为使用 $ref
    let returnType = ctx.typeTypeOrVoid().text;
    if (returnType !== "void" && returnType !== "Void") {
      if(returnType.includes("ResponseEntity<")){
        returnType = returnType.replace("ResponseEntity<", "").replace(">", "")
      }
      // list类型处理
      if(returnType.includes("List<")){
        const itemType = returnType.match(/List<([^>]+)>/)?.[1];
        this.currentMethod.operation.responses["200"].content = {
          "application/json": {
            schema: {
              type: "array",
              items: {
                $ref: `#/components/schemas/${itemType}`
              }
            }
          }
        };
      } else {
        this.currentMethod.operation.responses["200"].content = {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${returnType}`
            }
          }
        };
      }
    }
  }

  // 辅助方法：映射 Java 类型到 OpenAPI 类型
  mapJavaTypeToOpenAPI(javaType: string) {
    const typeMap: { [key: string]: string } = {
      int: "integer",
      Integer: "integer",
      long: "integer",
      Long: "integer",
      float: "number",
      Float: "number",
      double: "number",
      Double: "number",
      String: "string",
      boolean: "boolean",
      Boolean: "boolean",
      List: "array",
      Map: "object",
      LocalDateTime: "string",
      LocalDate: "string",
      LocalTime: "string",
      Date: "string"
    };
    return typeMap[javaType] || "object";
  }

  // 提取注解值（如 @GetMapping("/users") → "/users"）
  extractAnnotationValue(annotationText: string): string {
    // 先尝试匹配 value 属性
    const valueMatch = annotationText.match(/value\s*=\s*"([^"]+)"/);
    if (valueMatch) return valueMatch[1];

    // 再尝试匹配直接的路径字符串
    const pathMatch = annotationText.match(/@[^(]+\("([^"]+)"\)/);
    if (pathMatch) return pathMatch[1];

    return "";
  }

  // 提取 HTTP 方法（如 @GetMapping → get）
  extractHttpMethod(annotationText: string): string {
    if (annotationText.startsWith("@GetMapping")) return "get";
    if (annotationText.startsWith("@PostMapping")) return "post";
    if (annotationText.startsWith("@PutMapping")) return "put";
    if (annotationText.startsWith("@DeleteMapping")) return "delete";
    if (annotationText.startsWith("@RequestMapping")) {
      // 尝试从 method 属性获取
      const methodMatch = annotationText.match(/method\s*=\s*([^,\s)]+)/);
      if (methodMatch) {
        return methodMatch[1].toLowerCase();
      }
    }
    return "get"; // 默认为 GET
  }

  // 退出方法时保存到 OpenAPI
  exitMethodDeclaration(ctx: MethodDeclarationContext) {
    // 添加日志以便调试
    console.debug("Exiting method declaration", {
      hasCurrentMethod: !!this.currentMethod,
      methodName: ctx.identifier()?.text,
    });

    if (this.currentMethod) {
      try {
        this.openapi.addPath(
          this.currentMethod.method,
          this.currentMethod.path,
          this.currentMethod.operation
        );
        this.endpoints.push({
          id: `${this.currentMethod.method}  ${this.currentMethod.path}`,
          path: `${this.currentMethod.path}`,
          method: `${this.currentMethod.method}`,
          description: `${this.currentMethod.operation.description}`,
          parameters: this.currentMethod.operation.parameters,
          responses: this.currentMethod.operation.responses,
          requestBody: this.currentMethod.operation.requestBody,
          apifoxFolder: `${this.currentClassComment}`,
          location: {
            filePath: this.filePath,
            line: ctx.start.line,
            character: ctx.start.startIndex
          }
        })
      } catch (error) {
        console.error("Error adding path to OpenAPI:", error);
      }
      this.currentMethod = null;
    }
  }

}

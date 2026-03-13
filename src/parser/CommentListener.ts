import { Lexer } from "antlr4ts";
import { JavaLexer } from "./JavaLexer";
import { MethodDeclarationContext } from "./JavaParser";
import { ParseTreeListener } from "antlr4ts/tree";
import { table } from "console";

export class CommentListener implements ParseTreeListener {
    tokens: any;
    controllerListener: any;
    constructor(tokens: any, controllerListener: any) {
      this.tokens = tokens; // 词法分析器的令牌列表
      this.controllerListener = controllerListener;
      // 初始化 comments Map
      this.controllerListener.comments = new Map();
    }
    enterMethodDeclaration(ctx: MethodDeclarationContext) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      const processedComments = this.processComments(comments);
      
      // 使用方法签名作为 key
      const methodKey = ctx.text;
      this.controllerListener.comments.set(methodKey, processedComments);
  
      // if (comments.length > 0) {
      //   console.log("\n方法注释:", {
      //     key: methodKey,
      //     comments: processedComments
      //   });
      // }
    }
  
    getLeadingComments(tokenIndex: number) {
      const comments = [];
      // console.log('getLeadingComments', tokenIndex);
      
      let index = tokenIndex - 1;
      let foundComment = false;
      let skipNewlines = 0;
      
      while (index >= 0) {
        const token = this.tokens[index];
        
        // console.log(`Token at ${index}:`, {
        //   text: token.text,
        //   type: token.type,
        //   typeName: this.getTokenTypeName(token.type),
        //   channel: token.channel
        // });

        // 如果是注释，收集它
        if (token.type === JavaLexer.COMMENT || 
            token.type === JavaLexer.LINE_COMMENT) {
          comments.unshift(token.text);
          foundComment = true;
          skipNewlines = 0;
        }
        // 处理空白字符和修饰符
        else if (token.text.trim() === '' || 
                 token.channel === Lexer.HIDDEN ||
                 this.isModifier(token.type)) {  // 添加对修饰符的处理
          if (token.text.includes('\n')) {
            skipNewlines++;
            if (foundComment && skipNewlines > 10) {
              console.log('skipNewlines', skipNewlines);
              break;
            }
          }
        }
        // 如果遇到了其他非修饰符token
        else if (foundComment 
          // || (token.channel === Lexer.DEFAULT_TOKEN_CHANNEL && !this.isModifier(token.type))
              ) {
          console.log('foundComment', foundComment);
          break;
        }
        
        index--;
      }

      return comments;
    }
    
    processComments(comments: string[]): string[] {
      return comments
        .map(comment => {
          // 移除注释标记和空白
          let processed = comment
            .replace(/\/\*\*|\*\/|\*/g, '')  // 移除注释标记
            .split('\n')                      // 按行分割
            .map(line => line.trim())         // 清理每行的空白
            .filter(line => line.length > 0)  // 移除空行
            [0];                      // 重新组合
          
          console.log('Processed comment:', {
            original: comment,
            processed: processed
          });
          
          return processed;
        })
        .filter(comment => comment.length > 0);
    }
    
    // 辅助方法：获取token类型名称
    private getTokenTypeName(type: number): string {
      switch (type) {
        case JavaLexer.COMMENT: return 'COMMENT';
        case JavaLexer.LINE_COMMENT: return 'LINE_COMMENT';
        // 可以添加其他类型...
        default: return `TYPE_${type}`;
      }
    }
    
    // 添加新的辅助方法来判断是否为修饰符
    private isModifier(type: number): boolean {
      // 添加所有Java修饰符的类型判断
      return [
        JavaLexer.PUBLIC,
        JavaLexer.PRIVATE,
        JavaLexer.PROTECTED,
        JavaLexer.STATIC,
        JavaLexer.FINAL,
        JavaLexer.ABSTRACT,
        // 可以根据需要添加其他修饰符
      ].includes(type);
    }
    
    // 实现 ParseTreeListener 接口所需的其他方法
    enterEveryRule(ctx: any): void {}
    exitEveryRule(ctx: any): void {}
    visitTerminal(node: any): void {}
    visitErrorNode(node: any): void {}

    // 添加处理类声明的方法
    enterClassDeclaration(ctx: any) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      const processedComments = this.processComments(comments);
      
      // 使用类名作为 key
      const classKey = ctx.text;
      this.controllerListener.comments.set(classKey, processedComments);
    }

    // 添加处理字段声明的方法
    enterFieldDeclaration(ctx: any) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      const processedComments = this.processComments(comments);

      // 提取字段名作为 key（更可靠）
      const fieldName = ctx.variableDeclarators()
        ?.variableDeclarator(0)
        ?.variableDeclaratorId()
        ?.identifier()
        ?.text;

      if (fieldName) {
        this.controllerListener.comments.set(fieldName, processedComments);
      }

      // 同时保留完整声明作为 key（兼容性）
      const fieldKey = ctx.text;
      this.controllerListener.comments.set(fieldKey, processedComments);
    }
  }
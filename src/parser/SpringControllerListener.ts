// spring-controller-listener.js
import { ParseTreeListener } from "antlr4ts/tree";
import {
  ClassDeclarationContext,
  MethodDeclarationContext,
} from "./JavaParser";
import { JavaParserListener } from './JavaParserListener';
import { ApiEndpoint, ApiParameter } from '../types/index.js';
import { randomUUID } from 'crypto';

export class SpringControllerListener implements JavaParserListener {
  private endpoints: ApiEndpoint[] = [];
  private currentEndpoint: Partial<ApiEndpoint> = {};
  private rootPath: string = '';
  private apifoxFolder: string = '';

  // 当进入类声明时
  enterClassDeclaration(ctx: any): void {
    // 检查是否有 @RestController 注解
    const annotations = ctx.annotation();
    if (annotations) {
      for (const annotation of annotations) {
        if (annotation.getText().includes('@RestController')) {
          // 获取类级别的 RequestMapping
          this.rootPath = this.extractRequestMapping(annotations);
          // 获取 apifoxFolder
          this.apifoxFolder = this.extractApifoxFolder(annotations) || ctx.IDENTIFIER().getText();
          break;
        }
      }
    }
  }

  // 当进入方法声明时
  enterMethodDeclaration(ctx: any): void {
    const annotations = ctx.annotation();
    if (annotations) {
      const mappingAnnotation = this.findMappingAnnotation(annotations);
      if (mappingAnnotation) {
        this.currentEndpoint = {
          id: randomUUID(),
          method: this.extractHttpMethod(mappingAnnotation),
          path: this.joinPaths(this.rootPath, this.extractPath(mappingAnnotation)),
          description: this.extractDescription(ctx),
          parameters: this.extractParameters(ctx),
          responseType: this.extractReturnType(ctx),
          apifoxFolder: this.apifoxFolder,
          location: {
            // 需要实现获取位置信息的逻辑
            filePath: '',
            line: 0,
            character: 0
          }
        };
        this.endpoints.push(this.currentEndpoint as ApiEndpoint);
      }
    }
  }

  private extractRequestMapping(annotations: any[]): string {
    for (const annotation of annotations) {
      if (annotation.getText().includes('@RequestMapping')) {
        // 实现提取 RequestMapping 值的逻辑
        return '';
      }
    }
    return '';
  }

  private extractApifoxFolder(annotations: any[]): string {
    for (const annotation of annotations) {
      if (annotation.getText().includes('@ApiFolder')) {
        // 实现提取 ApiFolder 值的逻辑
        return '';
      }
    }
    return '';
  }

  private findMappingAnnotation(annotations: any[]): any {
    return annotations.find(annotation => {
      const text = annotation.getText();
      return text.includes('Mapping');
    });
  }

  private extractHttpMethod(annotation: any): string {
    const text = annotation.getText();
    if (text.includes('GetMapping')) return 'GET';
    if (text.includes('PostMapping')) return 'POST';
    if (text.includes('PutMapping')) return 'PUT';
    if (text.includes('DeleteMapping')) return 'DELETE';
    return 'GET';
  }

  private extractPath(annotation: any): string {
    // 实现提取路径的逻辑
    return '';
  }

  private extractDescription(ctx: any): string {
    // 实现提取注释的逻辑
    return '';
  }

  private extractParameters(ctx: any): ApiParameter[] {
    // 实现提取参数的逻辑
    return [];
  }

  private extractReturnType(ctx: any): string {
    // 实现提取返回类型的逻辑
    return '';
  }

  private joinPaths(basePath: string, methodPath: string): string {
    let path = '';
    if (basePath) {
      path += basePath.startsWith('/') ? basePath : '/' + basePath;
    }
    if (methodPath) {
      path += methodPath.startsWith('/') ? methodPath : '/' + methodPath;
    }
    return path || '/';
  }

  getEndpoints(): ApiEndpoint[] {
    return this.endpoints;
  }
}

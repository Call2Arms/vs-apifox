// openapi-generator.js
import { ConfigService } from '../services/ConfigService.js';
import { EnumDefinition } from '../types/index.js';

export class OpenAPIGenerator {
  openapi: any;
  constructor() {
    this.openapi = {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
      title: 'VS-APIFOX',
      paths: {},
      components: {
        schemas: {},
      },
    };
  }

  // 添加接口路径和方法
  addPath(method: string, path: string, operation: any) {
    if (!this.openapi.paths[path]) {
      this.openapi.paths[path] = {};
    }
    this.openapi.paths[path][method] = operation;
  }

  // 添加嵌套对象的 schema
  addSchema(className: string, schema: any) {
    this.openapi.components.schemas[className] = schema;
  }

  // 检查是否已存在 schema
  hasSchema(className: string) {
    return !!this.openapi.components.schemas[className];
  }

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

  inferEnumType(values: any[]): "string" | "integer" | "number" {
    if (values.every(v => typeof v === 'number' && Number.isInteger(v))) {
      return 'integer';
    }
    if (values.every(v => typeof v === 'number')) {
      return 'number';
    }
    return 'string';
  }

  // 生成最终 JSON
  build() {
    return JSON.stringify(this.openapi, null, 2);
  }
}

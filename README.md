# VS Apifox Helper

VS Code 插件，用于解析 Spring 注解生成 API 文档并上传到 Apifox。

## 功能

- **API 文档生成** - 自动识别 Spring Controller 注解生成 OpenAPI 规范
- **API 调试** - 在编辑器内直接发送 HTTP 请求
- **Mock 数据** - 根据 DTO 类自动生成 Mock 规则
- **Apifox 同步** - 一键同步 API 到 Apifox 平台

## 安装

在 VS Code 插件市场搜索 `wangrc.vs-apifox-helper` 安装。

## 使用

1. 打开 Spring 项目中的 Controller 文件
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入并执行 `spring-api-helper.uploadApiDocs`
4. 按提示输入 Apifox 的 API Key、项目 ID、项目名称
5. 上传成功后可在 Apifox 中查看生成的 API 文档

## 配置

在 VS Code 设置中搜索 `springApiHelper` 或在 `.vscode/settings.json` 中配置：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `springApiHelper.enumValueSource` | string | `constructor-first-param` | 枚举值的来源 |
| `springApiHelper.enumDescriptionSource` | string | `constructor-second-param` | 枚举描述的来源 |

**enumValueSource 可选值：**
- `constructor-first-param` - 使用构造函数第一个参数值
- `name` - 使用枚举常量名称
- 或其他自定义字符串

**enumDescriptionSource 可选值：**
- `constructor-second-param` - 使用构造函数第二个参数作为描述
- `name` - 使用枚举常量名称作为描述
- 或其他自定义字符串

### 配置示例

```json
{
  "springApiHelper.enumValueSource": "constructor-first-param",
  "springApiHelper.enumDescriptionSource": "constructor-second-param"
}
```

### Java 枚举示例

```java
public enum StatusEnum {
    ACTIVE(1, "激活状态"),
    INACTIVE(0, "未激活状态");

    private final Integer code;
    private final String desc;

    StatusEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
```

# Spec Bootstarp

从空白模板手动写 Spec 是最大痛点。`rudder-spec-bootstarp` 让 AI 分析真实代码库，自动生成项目特定的 Spec。

## 是什么

`rudder-spec-bootstarp` 是一个内置 Skill，指导 AI 完成：

1. 分析项目真实架构
2. 确定 Spec 边界和结构
3. 用真实代码示例填充规则
4. 验证最终 Spec 质量

## 什么时候用

- 新项目初始化后，Spec 还是空白模板
- 现有 Spec 过期了，跟不上代码变更
- 新包/新层需要 Spec 覆盖
- 想让 Spec 更贴合真实代码

## 怎么用

在 AI 对话中，AI 会自动识别"创建/刷新 Spec"的意图并加载这个 Skill。你也可以手动触发。

### 工作流程

```
1. 确认 Rudder 已初始化，检查当前 .rudder/spec/ 树
2. 用最佳工具分析代码架构（GitNexus、ABCoder、语言原生工具、源码阅读）
3. 按包和层拆分 Spec 工作（只在确实需要时）
4. 用具体模式、文件路径、示例和反模式填充 Spec
5. 验证 Spec 内部一致，无占位文字
```

## 参考文档

Skill 内置 4 个参考文档：

| 文档 | 内容 |
|------|------|
| `references/repository-analysis.md` | 代码仓库架构分析指南 |
| `references/spec-task-planning.md` | Spec 工作拆分规划 |
| `references/spec-writing.md` | 高质量 Spec 编写指南 |
| `references/mcp-setup.md` | GitNexus / ABCoder MCP 配置 |

## MCP 工具支持

Spec Bootstarp 推荐使用以下 MCP 工具进行代码分析：

### GitNexus

构建代码知识图谱，用于：
- 模块边界
- 执行流程
- 依赖关系
- 影响范围

```bash
npx gitnexus analyze    # 索引
npx gitnexus status     # 状态
npx -y gitnexus mcp     # MCP 服务
```

### ABCoder

将代码解析为 UniAST，获取精确的包/文件/节点级结构：
- 函数签名
- 类型形状
- 依赖链

```bash
go install github.com/cloudwego/abcoder@latest
abcoder parse /path/to/repo --lang typescript --name my-project --output ~/abcoder-asts
abcoder mcp ~/abcoder-asts
```

> 这两个工具是推荐而非必须。即使没有 MCP 工具，AI 也可以直接阅读源码来生成 Spec。

## 编写原则

1. **从证据出发**：每条规则都应该指向真实的源码文件
2. **删除不适用的部分**：模板中不适用的章节直接删除，不要留空
3. **不留占位文字**：Spec 中不应有 "待补充" 或 TODO
4. **单负责人**：默认一个 Agent 完成全流程，不依赖多 Agent 并行

## 完成标准

- `.rudder/spec/` 描述了项目当前的真实架构
- 每个相关的包/层都有具体的编码指南和示例
- `index.md` 文件与最终的 Spec 文件集合匹配
- 无任何占位文字或空标题

## 最终检查

```bash
grep -R "To be filled\|TODO: fill\|placeholder" .rudder/spec
```

确保没有遗留占位文字。

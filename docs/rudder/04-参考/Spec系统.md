# Spec 系统

Spec 是 Rudder 的核心——编码指南按作用域拆分，每次会话按需注入。

## 目录结构

```
.rudder/spec/
├── guides/                    # 跨层通用指南
│   ├── index.md
│   ├── cross-layer-thinking-guide.md
│   └── code-reuse-thinking-guide.md
├── backend/                   # 后端规范
│   ├── index.md               # 导航入口（Pre-Development Checklist + Quality Check）
│   ├── directory-structure.md
│   ├── database-guidelines.md
│   ├── logging-guidelines.md
│   ├── quality-guidelines.md
│   └── error-handling.md
└── frontend/                  # 前端规范
    ├── index.md
    ├── directory-structure.md
    ├── type-safety.md
    ├── hook-guidelines.md
    ├── component-guidelines.md
    ├── quality-guidelines.md
    └── state-management.md
```

单仓库直接这样结构。Monorepo 模式下是 `spec/<package>/<layer>/`。

## index.md 的作用

每个 `index.md` 是导航文件，包含：
- **Pre-Development Checklist**：写代码前需要确认的事项
- **Quality Check**：完成后需要验证的清单
- 指向各子规范文件的链接

实际指南内容在各自的 `.md` 文件中。

## 什么时候更新 Spec

以下情况需要更新 Spec：

| 场景 | 示例 |
|------|------|
| 发现新规范/约定 | 团队统一了新的错误处理方式 |
| 修复 Bug 的预防性总结 | 某个类型的 Bug 反复出现，需要在 Spec 中加一条规则 |
| 技术决策 | 选型了新的状态管理方案 |
| 反模式总结 | 某个常见的坑需要在 Spec 中标注 |

## Spec 编写原则

### 好的 Spec

- **从证据出发**：每条规则都应该有源码、测试、项目文档或反复出现的模式作为支撑
- **具体而非泛泛**：不写"遵循最佳实践"，写"用 DTO 承载请求体，禁止用 Map"
- **带文件引用**：引用真实的文件路径和符号名
- **包含反模式**：指出"不要怎么做"

### 避免的

- 占位文字 / TODO / "待补充"
- 通用框架建议（应该是项目特有的）
- 只适用于某个 AI 平台的指令
- 大段复制源码
- 基于单个偶然实现细节的规则

## Spec Bootstarp（自动生成）

Rudder 内置了 `rudder-spec-bootstarp` skill，可以：

1. 分析项目真实代码结构
2. 自动生成项目特定的 Spec 文件
3. 用真实源码示例填充规则

详见 [Spec Bootstarp 文档](./SpecBootstarp.md)。

## 多仓库（Monorepo）

Monorepo 项目在 `.rudder/config.yaml` 中声明 `packages`：

```yaml
packages:
  cli:
    path: packages/cli
  docs-site:
    path: docs-site
```

Spec 目录结构变为 `spec/<package-name>/`。

## 如何查看可用的 Spec

```bash
python3 .rudder/scripts/get_context.py --mode packages
```

列出所有可用的包和层，以及对应的 Spec 文件路径。

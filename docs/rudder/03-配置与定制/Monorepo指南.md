# Monorepo 指南

如果你的项目是多包结构（比如 pnpm workspace、Go workspace 等），Rudder 提供了完整的 monorepo 支持。

## 声明包

在 `.rudder/config.yaml` 中声明：

```yaml
packages:
  cli:
    path: packages/cli
    type: frontend          # 包类型：frontend / backend / fullstack / unknown
  backend:
    path: packages/backend
    type: backend
  docs-site:
    path: docs-site
    type: submodule          # git 子模块
  api-client:
    path: packages/api-client
    git: true                # 独立 git 仓库
```

### 包类型

| 类型 | 说明 | 生成的 Spec |
|------|------|-------------|
| `frontend` | 纯前端包 | 只生成 frontend Spec |
| `backend` | 纯后端包 | 只生成 backend Spec |
| `fullstack` | 前后端都有 | 生成 frontend + backend Spec |
| `submodule` | git 子模块 | 同上，可独立 clone |
| `git` | 独立 git 仓库 | 同上 |

### 默认包

如果你大多数时间在某个包下工作，设置默认包：

```yaml
default_package: cli
```

这样 `task.py create` 时会自动关联到 `cli` 包，不需要每次指定 `--package`。

## 任务与包

### 创建包相关任务

```bash
python3 .rudder/scripts/task.py create "增加 CLI 初始化" --package cli --slug cli-init
```

不指定 `--package` 时，使用 `default_package`。

### 单仓库忽略 --package

如果你的项目是单仓库（没有声明 `packages`），`--package` 参数会被忽略，所有任务都是全局的。

## Spec 目录结构（Monorepo）

```
.rudder/spec/
├── cli/                    # 包名
│   ├── frontend/           # 层名
│   │   ├── index.md
│   │   └── component-guidelines.md
│   └── backend/
│       └── index.md
├── backend/
│   └── index.md
└── guides/                 # 跨包通用指南
    ├── index.md
    └── cross-layer-thinking-guide.md
```

## 工具路径的 monorepo 场景

不同包可能需要不同版本的工具：

```yaml
# config.yaml
tools:
  java:
    version: "21"
  node:
    version: "18"
  go:
    version: "1.22"

# config_local.yml
tools:
  java:
    path: "/usr/local/sdkman/candidates/java/21.0.2-open/bin/java"
  mvn:
    path: "/opt/maven/bin/mvn"
  go:
    path: "/usr/local/go/bin/go"
```

AI 会在所有 session 中自动使用这些路径。

## Spec Bootstarp 在 Monorepo 中

Spec Bootstarp skill 会在 monorepo 下按包逐个生成 Spec。建议：

1. 先跑一次整体分析（生成各包的 `index.md`）
2. 再逐个包细化层级的 Spec
3. 最后补充 `guides/` 中的跨包指南

## 子模块（Submodule）

如果某个包是 git 子模块，声明为 `type: submodule`：

```yaml
packages:
  docs-site:
    path: docs-site
    type: submodule
```

Rudder 会在子模块的 `.git` 边界内操作，不会越界到父仓库。

## 独立 git 仓库

如果某个包是独立的 git 仓库（有自己的 `.git` 目录）：

```yaml
packages:
  backend:
    path: iqs
    git: true
```

Rudder 知道这个包有独立的 git 历史，提交和分支操作会在这个包的边界内进行。

---
title: 配置指南
date: 2026-06-02
type: projects
---

# 配置指南

Rudder 通过两层 YAML 配置文件管理工作行为。

## config.yaml（团队共享）

位置：`.rudder/config.yaml`

这个文件被 git 跟踪，团队共享。

### 完整配置示例

```yaml
# 工作日志每文件最大行数
max_journal_lines: 2000

# 工作日志和任务归档是否自动提交
session_auto_commit: false

# 代码变更是否自动提交（跳过用户确认）
code_auto_commit: false

# 会话自动提交的消息模板
session_commit_message: "chore: record journal"

# 工具路径声明（团队需要的工具和版本）
tools:
  java:
    version: "21"
  node:
    version: "18"
  mvn:
    version: "3.9"

# 生命周期钩子
hooks:
  after_create: []
  after_archive: []

# Monorepo 包声明（单仓库不需要）
# packages:
#   cli:
#     path: packages/cli
#   docs-site:
#     path: docs-site

# 默认包（monorepo 下省略 --package 参数）
# default_package: cli

# Session 级别配置
# session:
#   spec_scope: ["cli"]  # 限定扫描哪些包的 spec
```

## config_local.yml（个人覆盖）

位置：`.rudder/config_local.yml`

这个文件被 `.gitignore` 忽略，个人使用。

### 用途

主要用于**覆盖工具路径**：

```yaml
tools:
  java:
    path: "/usr/local/sdkman/candidates/java/21.0.2-open/bin/java"
  mvn:
    path: "/opt/maven/bin/mvn"
  python:
    path: "/usr/bin/python3"
```

AI 会在对话中发现新工具时自动追加到 `config_local.yml`。

### 合并规则

- `config.yaml` 声明**需要什么工具**和版本
- `config_local.yml` 声明**工具的实际路径**
- 两者合并后，本地路径优先级最高

### 工具路径解析流程

```
1. config_local.yml 中明确指定的 path
2. 从版本管理文件自动检测（.sdkmanrc, .nvmrc, .tool-versions 等）
3. 系统 PATH 查找（shutil.which）
```

### 工具路径提示

如果某个工具的路径不对或找不到，你需要：
1. 手动找到正确路径（如 `which mvn`、`where java`）
2. 更新 `.rudder/config_local.yml`
3. 后续 session 就能直接使用了

## 常用配置项

### session_auto_commit

| 值 | 行为 |
|----|------|
| `false`（默认） | 文件写入磁盘，用户自己管理 `git add` / `git commit` |
| `true` | Rudder 自动 stage 和 commit |

### code_auto_commit

| 值 | 行为 |
|----|------|
| `false`（默认） | AI 展示 `git diff --stat`，说明提交消息，等待用户确认（Y/n） |
| `true` | AI 直接提交代码变更 |

### hooks

配置生命周期事件触发时执行的命令：

```yaml
hooks:
  after_create:
    - "echo '新任务已创建'"
  after_archive:
    - "echo '任务已归档'"
```

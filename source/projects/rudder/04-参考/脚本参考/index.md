---
title: 脚本参考
date: 2026-06-02
type: projects
---

# 脚本参考

Rudder 的 `.rudder/scripts/` 目录下包含所有 Python 和 Bash 脚本。

## 脚本列表

### 任务管理（task.py）

```bash
python3 .rudder/scripts/task.py <command> [args]
```

| 命令 | 说明 | 示例 |
|------|------|------|
| `create <title>` | 创建新任务 | `task.py create "登录功能" --slug login` |
| `start <dir>` | 激活任务 | `task.py start 06-02-login` |
| `current --source` | 查看当前任务 | `task.py current --source` |
| `finish` | 清除当前任务指针 | `task.py finish` |
| `archive <name>` | 归档已完成的任务 | `task.py archive 06-02-login` |
| `list` | 列出活动任务 | `task.py list --mine` |
| `list-archive` | 列出已归档任务 | `task.py list-archive` |
| `set-branch <dir> <branch>` | 设置任务分支 | `task.py set-branch 06-02-login feat/login` |
| `set-base-branch <dir> <branch>` | 设置 PR 目标分支 | `task.py set-base-branch 06-02-login develop` |
| `set-scope <dir> <scope>` | 设置 PR scope | `task.py set-scope 06-02-login auth` |
| `add-subtask <parent> <child>` | 添加子任务 | `task.py add-subtask 06-02-login login-ui` |
| `remove-subtask <parent> <child>` | 移除子任务 | `task.py remove-subtask 06-02-login login-ui` |

`create` 支持的选项：
- `--slug <name>`：任务短名（不含 `MM-DD-` 前缀）
- `--parent <dir>`：父任务
- `--assignee <name>`：负责人
- `--package <name>`：所属包（monorepo）
- `--priority <level>`：优先级

### 上下文获取（get_context.py）

```bash
python3 .rudder/scripts/get_context.py [options]
```

| 模式 | 说明 | 示例 |
|------|------|------|
| 无参数 | 完整的 session 运行时上下文 | `get_context.py` |
| `--mode packages` | 列出可用的包和 spec 层 | `get_context.py --mode packages` |
| `--mode phase --step <X.Y>` | 获取某阶段的详细指导 | `get_context.py --mode phase --step 1.3` |

### Session 记录（add_session.py）

```bash
python3 .rudder/scripts/add_session.py \
  --title "标题" \
  --commit "hash" \
  --summary "摘要"
```

自动追加到当前开发者的 journal 文件。

### 任务上下文（task_context.py）

被 hook 调用，注入当前任务状态到 AI session 的 system prompt 中。

### 会话上下文（session_context.py）

被 hook 调用，注入会话历史和工具路径信息。

### 配置读取（config.py）

提供 Python 侧的配置读取函数：
- `get_max_journal_lines()` — 日志行数限制
- `get_session_auto_commit()` — 是否自动提交
- `get_code_auto_commit()` — 代码自动提交
- `get_hooks(event)` — 获取钩子命令
- `get_packages()` — monorepo 包声明
- `get_tools_config()` — 工具配置
- `resolve_tools()` — 合并后的工具路径解析

### 路径工具（paths.py）

提供路径常量和方法：
- `DIR_WORKFLOW` — `.rudder/` 目录名
- `DIR_TASKS` — `tasks/`
- `DIR_SPEC` — `spec/`
- `DIR_WORKSPACE` — `workspace/`
- `DIR_ARCHIVE` — `archive/`
- `get_repo_root()` — 获取仓库根目录

### Git 工具（git.py）

封装 git 操作：
- `run_git(args, cwd)` — 执行 git 命令

### Git 上下文（git_context.py）

提供 git 上下文信息（当前分支、远程 URL 等）。

### 工作流阶段（workflow_phase.py）

解析当前处于工作流的哪个阶段。

### 任务队列（task_queue.py）

管理任务队列（多任务场景）。

### CLI 适配器（cli_adapter.py）

适配不同 CLI 平台的差异。

### 包上下文（packages_context.py）

monorepo 下的包上下文注入。

## 通用约定

- 所有脚本从 `.rudder/config.yaml` 读取配置
- `config_local.yml` 可以覆盖工具路径
- 错误信息输出到 `stderr`（彩色显示）
- 成功输出到 `stdout`（纯路径，供脚本链式调用）

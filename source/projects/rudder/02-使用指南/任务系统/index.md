---
title: 任务系统
date: 2026-06-02
type: projects
---

# 任务系统

每个功能/修复/重构都有自己的任务目录，AI 不是写完就走，而是有完整的生命周期管理。

## 任务目录结构

```
.rudder/tasks/{MM-DD-任务名}/
├── task.json          # 任务元数据（状态、负责人、分支等）
├── prd.md             # 需求文档
├── implement.jsonl    # 实现代理需要的 Spec 文件列表
├── check.jsonl        # 检查代理需要的 Spec 文件列表
├── research/          # 调研文件（可选）
└── info.md            # 技术设计（复杂任务可选）
```

## 任务生命周期

```
创建(create) → 规划(planning) → 激活(start) → 执行(in_progress) → 归档(archive)
```

### 创建任务

```bash
python3 .rudder/scripts/task.py create "用户认证功能" --slug auth
```

创建后：
- 状态 = `planning`
- 自动创建目录 `.rudder/tasks/MM-DD-auth/`
- 自动填充 `task.json`
- 自动创建 `implement.jsonl` 和 `check.jsonl`（含引导行）

### 激活任务

完成 PRD 和 JSONL 填充后：

```bash
python3 .rudder/scripts/task.py start auth
```

状态翻转为 `in_progress`。

### 查看当前任务

```bash
python3 .rudder/scripts/task.py current --source
```

### 列出任务

```bash
python3 .rudder/scripts/task.py list                  # 所有任务
python3 .rudder/scripts/task.py list --mine           # 我的任务
python3 .rudder/scripts/task.py list --status planning # 按状态筛选
```

### 归档任务

```bash
python3 .rudder/scripts/task.py archive auth
```

归档后：
- 状态 = `completed`
- 目录移动到 `.rudder/tasks/archive/YYYY-MM/`
- 自动清理会话指针

### 查看已归档

```bash
python3 .rudder/scripts/task.py list-archive
```

## 子任务

支持父子任务层级：

```bash
# 创建子任务时指定父
python3 .rudder/scripts/task.py create "登录页UI" --slug login-ui --parent auth

# 或者后续链接
python3 .rudder/scripts/task.py add-subtask auth login-ui
python3 .rudder/scripts/task.py remove-subtask auth login-ui
```

## 任务元数据

`task.json` 结构：

```json
{
  "id": "auth",
  "title": "用户认证功能",
  "status": "planning",        // planning | in_progress | completed
  "package": null,             // monorepo 下的包名
  "creator": "zhangsan",
  "assignee": "zhangsan",
  "createdAt": "2026-06-02",
  "completedAt": null,
  "branch": "feat/auth",
  "base_branch": "main",       // PR 目标分支
  "scope": "auth",             // PR 标题的 scope 前缀
  "children": ["MM-DD-login-ui"],
  "parent": null,
  "subtasks": [],
  "pr_url": null
}
```

### 修改元数据

```bash
python3 .rudder/scripts/task.py set-branch auth feat/auth
python3 .rudder/scripts/task.py set-base-branch auth develop
python3 .rudder/scripts/task.py set-scope auth auth-module
```

## JSONL 的作用

`implement.jsonl` 和 `check.jsonl` 是**子代理上下文的桥梁**。

格式（每行一个 JSON 对象）：

```jsonl
{"file": ".rudder/spec/backend/index.md", "reason": "后端规范总入口"}
{"file": ".rudder/spec/backend/error-handling.md", "reason": "统一错误响应格式"}
{"file": ".rudder/tasks/MM-DD-auth/research/auth-library-comparison.md", "reason": "认证库选型结论"}
```

只放 **Spec 文件** 和 **研究文件**，不放代码文件。代码文件由子代理在实现时自行读取。

## 钩子

`task.json` 支持生命周期钩子：

```json
{
  "hooks": {
    "after_create": ["your-script-or-command"],
    "after_archive": ["your-script-or-command"]
  }
}
```

支持的事件：`after_create` / `after_start` / `after_finish` / `after_archive`

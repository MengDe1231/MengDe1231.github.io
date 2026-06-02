---
title: 平台配置
date: 2026-06-02
type: projects
---

# 平台配置

Rudder 支持 14 个 AI 编程平台，一套配置通吃。

## 支持的平台

| 平台 | 类型 |
|------|------|
| Claude Code | CLI / VS Code / JetBrains / Web |
| Gemini | CLI |
| Cursor | IDE |
| Codex | VS Code |
| OpenCode | IDE |
| CodeBuddy | IDE |
| Qoder | IDE |
| Kiro | IDE |
| Pi | CLI |
| Windsurf | IDE |
| Copilot | VS Code / JetBrains |
| Antigravity | CLI |
| Kilo | CLI |
| Droid | Factory IDE |

## 初始化平台

```bash
# 初始化所有平台
rudder init -u your-name

# 只初始化需要的平台（推荐）
rudder init --claude --cursor --codex -u your-name
```

### 可用的平台标志

| 标志 | 对应平台 |
|------|----------|
| `--claude` | Claude Code |
| `--cursor` | Cursor IDE |
| `--codex` | Codex (VS Code) |
| `--gemini` | Gemini CLI |
| `--opencode` | OpenCode IDE |
| `--codebuddy` | CodeBuddy IDE |
| `--qoder` | Qoder IDE |
| `--kiro` | Kiro IDE |
| `--pi` | Pi CLI |
| `--windsurf` | Windsurf IDE |
| `--copilot` | Copilot (VS Code / JetBrains) |
| `--antigravity` | Antigravity CLI |
| `--kilo` | Kilo CLI |
| `--droid` | Factory Droid |

## 更新平台配置

```bash
rudder update
```

会自动检测哪些模板文件有新版，并提示是否覆盖。遇到冲突时有三种选择：

- **Overwrite** — 用新版本替换
- **Skip** — 保留当前版本
- **Create copy** — 保存新版本为 `.new` 文件

提示：可以按 `a` / `s` / `n` 批量应用选择。

## 版本检测

Rudder CLI 启动时会自动检测：
- 如果 `.rudder/` 存在，会比较 CLI 版本与项目记录版本
- CLI 版本更新时，提示运行 `rudder update`

## 各平台的配置目录

| 平台 | 配置目录 |
|------|----------|
| Claude Code | `.claude/` |
| Cursor | `.cursor/` |
| Codex | `.codex/` |
| Gemini | `.gemini/` |
| OpenCode | `.opencode/` |
| CodeBuddy | `.codebuddy/` |
| Qoder | `.qoder/` |
| Kiro | `.kiro/` |
| Pi | `.pi/` |
| Droid | `.factory/` |
| Copilot | `.github/copilot/` |

每个平台目录下 Rudder 会自动写入：
- **Agents**（子代理定义）
- **Hooks**（session 生命周期钩子）
- **Skills**（自动触发的技能）

---
title: 工作流
date: 2026-06-02
type: projects
---

# 工作流

Rudder 每次 AI 会话运行一个 4 阶段循环。

## 阶段总览

```
Phase 1: Plan    → 搞清楚要做什么（头脑风暴 + 调研 → prd.md）
Phase 2: Execute → 写代码并通过质量检查
Phase 3: Finish  → 沉淀认知 + 收尾
```

## Phase 1: Plan

**目标**：明确需求，产出清晰的 PRD 和实现上下文。

### 步骤

| 步骤 | 标记 | 说明 |
|------|------|------|
| 1.0 创建任务 | `[required · once]` | 创建任务目录，状态进入 `planning` |
| 1.1 需求探索 | `[required · repeatable]` | 与用户交互确认需求，写入 `prd.md` |
| 1.2 调研 | `[optional · repeatable]` | 调研第三方库、行业方案等 |
| 1.3 配置上下文 | `[required · once]` | 填写 `implement.jsonl` 和 `check.jsonl` |
| 1.4 激活任务 | `[required · once]` | 状态翻转为 `in_progress` |
| 1.5 完成标准 | — | 检查 PRD 完整、JSONL 已填充 |

### 关键命令

```bash
# 创建任务
python3 .rudder/scripts/task.py create "用户认证功能" --slug auth

# 查看当前任务
python3 .rudder/scripts/task.py current --source

# 激活任务（完成 1.3 后）
python3 .rudder/scripts/task.py start auth

# 列出可用 Spec
python3 .rudder/scripts/get_context.py --mode packages
```

## Phase 2: Execute

**目标**：把 PRD 变成通过质量检查的代码。

### 步骤

| 步骤 | 标记 | 说明 |
|------|------|------|
| 2.1 实现 | `[required · repeatable]` | 派子代理写代码 |
| 2.2 质量检查 | `[required · repeatable]` | 派子代理审查代码 |
| 2.3 回滚 | `[on demand]` | PRD 有缺陷时退回 Phase 1 |

### 子代理调度

Rudder 使用子代理模式，主代理不直接写代码：

```
主代理 → 派发 rudder-implement → 写代码
        → 派发 rudder-check    → 审查 + 修复
```

子代理会自动获取：
- `implement.jsonl` 中列出的 Spec 文件
- PRD 内容
- 研究文件

## Phase 3: Finish

**目标**：确保代码质量，沉淀认知，记录工作。

### 步骤

| 步骤 | 标记 | 说明 |
|------|------|------|
| 3.1 质量验证 | `[required · repeatable]` | 最后一次 spec 合规检查 |
| 3.2 调试回顾 | `[on demand]` | 如果有反复调试的问题，记录教训 |
| 3.3 更新 Spec | `[required · once]` | 把新认知写回 `.rudder/spec/` |
| 3.4 提交代码 | `[required · once]` | 批量提交代码变更 |
| 3.5 提醒收尾 | — | 提醒用户运行 `/finish-work` |

### 提交流程

Phase 3.4 会：
1. 检查变更文件（`git status --porcelain`）
2. 学习最近的提交风格（`git log --oneline -5`）
3. 把文件分为两类：AI 本次编辑的 vs 不认识的
4. 生成提交计划，等待用户确认
5. 按批次执行 `git add` + `git commit`

## 阶段回退

```
Execute 发现 PRD 缺陷 → 退回 Plan 修复 prd.md → 重新进入 Execute
```

阶段可以回退，Spec 是活的。

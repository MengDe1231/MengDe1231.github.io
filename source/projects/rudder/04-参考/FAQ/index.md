---
title: FAQ
date: 2026-06-02
type: projects
---

# FAQ

## 这玩意儿跟 CLAUDE.md / AGENTS.md / .cursorrules 有啥区别？

这些文件确实有用，但用久了都会变成几千行的缝合怪。Rudder 做了分层：规范按作用域拆分、任务有独立 PRD、工作流有关卡控制、跨平台自动适配。一句话：**不把所有东西塞进一个文件里。**

## Rudder 是不是只支持 Claude Code？

不是。Rudder 是项目层的基础设施，14 个 AI coding 平台都能用。你可以今天用 Gemini 写前端，明天切 Claude Code 写后端，后天让 Codex 审查。

## 适合一个人用还是团队？

都行。一个人用主要是项目记忆 + 可复用流程；团队用收益更大——标准统一、任务边界清晰、上下文可审查，换平台不换脑子。

## Spec 文件是不是得手动一个一个写？

不用。大多数团队的做法是让 AI 先基于现有代码生成初稿，然后人工收紧关键规则。Rudder 还内置了 `rudder-spec-bootstarp` skill，可以自动分析代码库生成 Spec。核心思想是：把高价值的规则显式化、版本化，剩下的让 AI 自己搞定。

## 团队协作会不会经常冲突？

不会。个人工作区的 journal 是每个开发者独立维护的，共享的 Spec 和任务进仓库走 git——跟其他项目代码一样，冲突就合并不就完了。

## config_local.yml 是什么？

团队共享的 `config.yaml` 声明需要什么工具和版本；个人的 `config_local.yml` 声明工具的实际路径。AI 在对话中发现新工具时会自动补充到 `config_local.yml`，越用越好用。

## 工具路径不对怎么办？

找到正确路径后手动更新 `.rudder/config_local.yml`，比如 `which mvn` 或 `where java`。后续 session 就能直接用了。

## 更新 Rudder 后项目怎么同步？

```bash
npm install -g @mengde1231/rudder@latest  # 更新 CLI
rudder update                              # 更新项目配置
```

## Rudder 会修改我的源代码吗？

不会。Rudder 只管理 `.rudder/` 和平台配置目录（`.claude/`、`.cursor/` 等）。代码变更完全由 AI 和你自己控制。

## 支持 Python 项目吗？Java 呢？

完全支持。Rudder 本身是平台无关的。作者作为 Java 全栈开发日常自用，Java Spec 模板最丰富，但其他语言同样兼容。

## 版本为什么从 0.5.30 开始？

Rudder 诞生于 5 月，主版本用了 0.5。之前本地迭代了很多版本，0.5.30 是第一个公开发布版本。

## 在线文档什么时候上线？

Rudder 在线文档和使用手册正在逐步完善中，敬请期待。

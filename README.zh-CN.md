<p align="center">
  <h1 align="center">zylos-component-template</h1>
</p>

<p align="center">
  Zylos 智能体生态的官方组件开发模板。
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

- **三种组件类型** — 通讯（Telegram、飞书）、能力（浏览器自动化）、工具
- **生产验证的模式** — Owner 绑定、消息路由、配置热更新、优雅退出
- **完整生命周期** — 安装、升级、卸载钩子开箱即用
- **AI 友好** — CLAUDE.md 引导 AI 助手完成整个构建流程

## 快速开始

**AI 辅助（推荐）：** 让 AI 助手读取这个仓库，然后说：

> "用 zylos-component-template 创建一个 discord 组件"

**手动创建：**

```bash
git clone https://github.com/zylos-ai/zylos-component-template.git
cd zylos-component-template
./init.sh discord "Discord 消息机器人" communication
```

## 模板内容

```
template/
  src/index.js            入口文件，支持优雅退出
  src/lib/config.js       配置加载器，支持热更新
  scripts/send.js         出站消息接口（通讯类组件）
  hooks/                  生命周期钩子（安装、升级）
  SKILL.md                组件元数据（Zylos CLI 读取）
  ecosystem.config.cjs    PM2 服务配置
  DESIGN.md               架构设计文档模板
```

## 文档

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | AI 开发指南，含实现模式 |
| [COMPONENT-SPEC.md](./COMPONENT-SPEC.md) | 完整技术规范 |

## 参考实现

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) — Telegram 机器人（长轮询、媒体处理、群聊上下文）
- [zylos-lark](https://github.com/zylos-ai/zylos-lark) — 飞书机器人（Webhook、文档访问、日历查询）
- [zylos-browser](https://github.com/zylos-ai/zylos-browser) — 浏览器自动化（CDP、无障碍快照）

## 参与贡献

请查看[贡献指南](https://github.com/zylos-ai/.github/blob/main/CONTRIBUTING.md)。

## 由 Coco 构建

Zylos 是 [Coco](https://coco.xyz/)（AI 员工平台）的开源核心基础设施。

我们构建 Zylos 是因为我们自己需要它：可靠的基础设施，让 AI 智能体 24/7 稳定运行。每个组件都在 Coco 生产环境中经过实战检验，服务于每天依赖 AI 员工的团队。

想要开箱即用？[Coco](https://coco.xyz/) 提供即开即用的 AI 员工——持久记忆、多渠道沟通、技能包——5 分钟完成部署。

## 许可证

[MIT](./LICENSE)

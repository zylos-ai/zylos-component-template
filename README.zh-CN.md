<p align="center">
  <img src="./assets/logo.png" alt="Zylos" height="120">
</p>

<h1 align="center">zylos-component-template</h1>

<p align="center">
  Zylos 智能体生态的官方组件开发模板。
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://discord.gg/GS2J39EGff"><img src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/ZylosAI"><img src="https://img.shields.io/badge/X-follow-000000?logo=x&logoColor=white" alt="X"></a>
  <a href="https://zylos.ai"><img src="https://img.shields.io/badge/website-zylos.ai-blue" alt="Website"></a>
  <a href="https://coco.xyz"><img src="https://img.shields.io/badge/Built%20by-Coco-orange" alt="Built by Coco"></a>
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

- **秒级创建** — 一条命令生成完整的、可直接开发的组件
- **零样板代码** — 配置热更新、生命周期钩子、优雅退出、PM2 — 全部内置
- **即插即用** — 组件被 Zylos CLI 自动发现，一条命令即可安装运行
- **AI 原生开发** — 内置指南让 AI 助手自主完成组件构建

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

## 发布你的组件

做了有用的组件？提交到 [Zylos Registry](https://github.com/zylos-ai/zylos-registry)，让其他人也能一键发现和安装。

## 参与贡献

请查看[贡献指南](https://github.com/zylos-ai/.github/blob/main/CONTRIBUTING.md)。

## 由 Coco 构建

Zylos 是 [Coco](https://coco.xyz/)（AI 员工平台）的开源核心基础设施。

我们构建 Zylos 是因为我们自己需要它：可靠的基础设施，让 AI 智能体 24/7 稳定运行。每个组件都在 Coco 生产环境中经过实战检验，服务于每天依赖 AI 员工的团队。

想要开箱即用？[Coco](https://coco.xyz/) 提供即开即用的 AI 员工——持久记忆、多渠道沟通、技能包——5 分钟完成部署。

## 许可证

[MIT](./LICENSE)

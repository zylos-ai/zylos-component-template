<p align="center">
  <img src="./assets/logo.png" alt="Zylos" height="120">
</p>

<h1 align="center">🐙 zylos-component-template</h1>

> **Zylos** (/ˈzaɪ.lɒs/) — Give your AI a life

<p align="center">
  Official template for building components for the Zylos agent ecosystem.
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
  <a href="./README.zh-CN.md">中文</a>
</p>

---

- **Scaffold in seconds** — one command creates a complete, ready-to-develop component
- **Zero boilerplate** — config hot-reload, lifecycle hooks, graceful shutdown, PM2 — all included
- **Plug and play** — components are auto-discovered by Zylos CLI, one command to install and run
- **AI-native development** — built-in guide enables AI assistants to build components autonomously

## Quick Start

**With AI (recommended):** Point your AI assistant to this repo and say:

> "Create a discord component using zylos-component-template"

**Manual:**

```bash
git clone https://github.com/zylos-ai/zylos-component-template.git
cd zylos-component-template
./init.sh discord "Discord messaging bot" communication
```

## What's Included

```
template/
  src/index.js            Entry point with graceful shutdown
  src/lib/config.js       Config loader with hot-reload
  scripts/send.js         Outbound message interface (communication)
  hooks/                  Lifecycle hooks (install, upgrade)
  SKILL.md                Component metadata for Zylos CLI
  ecosystem.config.cjs    PM2 service config
  DESIGN.md               Architecture document template
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | AI development guide with implementation patterns |
| [COMPONENT-SPEC.md](./COMPONENT-SPEC.md) | Full technical specification |

## Reference Implementations

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) — Telegram bot (long polling, media, group context)
- [zylos-lark](https://github.com/zylos-ai/zylos-lark) — Lark/Feishu bot (webhooks, documents, calendar)
- [zylos-browser](https://github.com/zylos-ai/zylos-browser) — Browser automation (CDP, accessibility snapshots)

## Publish Your Component

Built something useful? Submit it to the [Zylos Registry](https://github.com/zylos-ai/zylos-registry) so others can discover and install it with one command.

## Contributing

See [Contributing Guide](https://github.com/zylos-ai/.github/blob/main/CONTRIBUTING.md).

## Built by Coco

Zylos is the open-source core of [Coco](https://coco.xyz/) — the AI employee platform.

We built Zylos because we needed it ourselves: reliable infrastructure to keep AI agents running 24/7 on real work. Every component is battle-tested in production at Coco, serving teams that depend on their AI employees every day.

Want a managed experience? [Coco](https://coco.xyz/) gives you a ready-to-work AI employee — persistent memory, multi-channel communication, and skill packages — deployed in 5 minutes.

## License

[MIT](./LICENSE)

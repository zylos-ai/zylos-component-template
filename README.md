<p align="center">
  <h1 align="center">zylos-component-template</h1>
</p>

<p align="center">
  Official template for building components for the Zylos agent ecosystem.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
</p>

<p align="center">
  <a href="./README.zh-CN.md">中文</a>
</p>

---

- **Three component types** — communication (Telegram, Lark), capability (browser), and utility
- **Production-tested patterns** — owner binding, message routing, config hot-reload, graceful shutdown
- **Full lifecycle** — install, upgrade, and uninstall hooks out of the box
- **AI-friendly** — CLAUDE.md guide walks AI assistants through the entire build process

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

## Contributing

See [Contributing Guide](https://github.com/zylos-ai/.github/blob/main/CONTRIBUTING.md).

## Built by Coco

Zylos is the open-source core of [Coco](https://coco.xyz/) — the AI employee platform.

We built Zylos because we needed it ourselves: reliable infrastructure to keep AI agents running 24/7 on real work. Every component is battle-tested in production at Coco, serving teams that depend on their AI employees every day.

Want a managed experience? [Coco](https://coco.xyz/) gives you a ready-to-work AI employee — persistent memory, multi-channel communication, and skill packages — deployed in 5 minutes.

## License

[MIT](./LICENSE)

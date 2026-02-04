# Zylos Component Template

Standard template for creating zylos components.

## Usage

### AI Development (Recommended)

Have an AI assistant read [CLAUDE.md](./CLAUDE.md) then execute:

> "Create a xxx component using zylos-component-template"

### Manual Development

```bash
git clone https://github.com/zylos-ai/zylos-component-template.git
cd zylos-component-template
./init.sh mycomponent "Component description" communication
# Component created at ../zylos-mycomponent/
```

## Component Types

| Type | Description | Examples |
|------|-------------|----------|
| `communication` | Communication channels | telegram, discord |
| `capability` | Agent capabilities | browser, knowledge-base |
| `utility` | Utility tools | helper tools |

## Project Structure

```
├── CLAUDE.md             # AI development guide
├── README.md             # This file
├── COMPONENT-SPEC.md     # Full development specification
├── init.sh               # Manual initialization script
└── template/             # Component template files
    ├── SKILL.md
    ├── README.md
    ├── CHANGELOG.md
    ├── package.json
    ├── ecosystem.config.js
    ├── send.js
    ├── hooks/
    │   ├── post-install.js
    │   ├── pre-upgrade.js
    │   └── post-upgrade.js
    └── src/
```

## Reference Implementation

[zylos-telegram](https://github.com/zylos-ai/zylos-telegram)

## License

MIT

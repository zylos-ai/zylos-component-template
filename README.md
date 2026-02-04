# Zylos Component Template

Standard template for creating new zylos components.

## Quick Start

1. **Clone this template:**
   ```bash
   git clone https://github.com/zylos-ai/zylos-component-template.git zylos-mycomponent
   cd zylos-mycomponent
   ```

2. **Run the initialization script:**
   ```bash
   ./init.sh mycomponent "My component description"
   ```

3. **Or manually replace placeholders:**
   - `{{COMPONENT_NAME}}` - Component name (lowercase, e.g., `telegram`)
   - `{{COMPONENT_NAME_UPPER}}` - Uppercase name (e.g., `TELEGRAM`)
   - `{{COMPONENT_DESCRIPTION}}` - One-line description
   - `{{COMPONENT_TYPE}}` - Type: `communication`, `capability`, or `utility`
   - `{{DATE}}` - Current date (YYYY-MM-DD)

## Template Files

| File | Purpose |
|------|---------|
| `COMPONENT-SPEC.md` | Full development specification |
| `SKILL.md.template` | Component metadata (rename to `SKILL.md`) |
| `README.md.template` | User-facing docs (rename to `README.md`) |
| `CHANGELOG.md.template` | Version history |
| `package.json.template` | npm configuration |
| `ecosystem.config.js.template` | PM2 configuration |
| `hooks/post-install.js.template` | Installation hook |
| `hooks/post-upgrade.js.template` | Upgrade migration hook |
| `src/index.js.template` | Main entry point |
| `src/lib/config.js.template` | Configuration loader |
| `send.js.template` | C4 interface (communication components only) |

## Component Types

### Communication Component
Enables Claude to communicate (Telegram, Discord, etc.).

**Required:**
- All standard files
- `send.js` - C4 Communication Bridge interface

**send.js interface:**
```bash
./send.js <endpoint_id> "message text"
./send.js <endpoint_id> "[MEDIA:image] /path/to/image.png"
./send.js <endpoint_id> "[MEDIA:file] /path/to/document.pdf"
```

### Capability Component
Extends agent capabilities (browser, knowledge-base, etc.).

**Required:**
- All standard files
- Service implementation in `src/`

### Utility Component
Internal tools and helpers.

**Required:**
- All standard files (service optional)

## Directory Structure After Setup

```
zylos-mycomponent/
├── SKILL.md              # Component metadata
├── README.md             # User documentation
├── CHANGELOG.md          # Version history
├── package.json          # npm configuration
├── ecosystem.config.js   # PM2 configuration
├── send.js               # (communication components only)
├── hooks/
│   ├── post-install.js   # Installation hook
│   └── post-upgrade.js   # Upgrade hook
└── src/
    ├── index.js          # Main entry point
    └── lib/
        └── config.js     # Configuration loader
```

## Development Workflow

1. **Implement your logic** in `src/index.js`
2. **Add dependencies** to `package.json`
3. **Configure defaults** in `src/lib/config.js`
4. **Test locally:**
   ```bash
   npm install
   npm start
   ```
5. **Push to GitHub** under `zylos-ai/` organization

## Installation

Users install via zylos CLI:
```bash
zylos install mycomponent
```

This will:
1. Clone from `zylos-ai/zylos-mycomponent`
2. Run `npm install`
3. Create data directory
4. Run `hooks/post-install.js`
5. Start PM2 service

## Reference Implementation

See [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) for a complete example.

## License

MIT

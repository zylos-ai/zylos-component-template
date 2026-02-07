# AI Component Development Guide

This document guides AI assistants to create new zylos components using this template.

## Quick Start

When a user requests creating a new component, follow these steps:

### Step 1: Copy Template

**Quick command (recommended):**
```bash
cd ~/src && git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone && cp -r temp-clone/template zylos-<name> && rm -rf temp-clone && cd zylos-<name>
```

**Or step by step:**
```bash
cd ~/src
git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone
cp -r temp-clone/template zylos-<name>
rm -rf temp-clone
cd zylos-<name>
```

### Step 2: Gather Component Info

Confirm with user:
- **Name**: lowercase, e.g., `discord`, `slack`
- **Description**: one-line description
- **Type**: `communication` | `capability` | `utility`

### Step 3: Replace Placeholders

Run these sed commands (replace values with actual component info):

```bash
# Set variables
NAME="discord"
NAME_UPPER="DISCORD"
TITLE="Discord"
DESC="Discord bot integration"
TYPE="communication"
DATE=$(date +%Y-%m-%d)

# Replace all placeholders
find . -type f -exec sed -i "s/{{COMPONENT_NAME}}/$NAME/g" {} \;
find . -type f -exec sed -i "s/{{COMPONENT_NAME_UPPER}}/$NAME_UPPER/g" {} \;
find . -type f -exec sed -i "s/{{COMPONENT_TITLE}}/$TITLE/g" {} \;
find . -type f -exec sed -i "s/{{COMPONENT_DESCRIPTION}}/$DESC/g" {} \;
find . -type f -exec sed -i "s/{{COMPONENT_TYPE}}/$TYPE/g" {} \;
find . -type f -exec sed -i "s/{{DATE}}/$DATE/g" {} \;
```

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `{{COMPONENT_NAME}}` | Component name (lowercase) | `discord` |
| `{{COMPONENT_NAME_UPPER}}` | Component name (uppercase) | `DISCORD` |
| `{{COMPONENT_TITLE}}` | Component title | `Discord` |
| `{{COMPONENT_DESCRIPTION}}` | Component description | `Discord bot integration` |
| `{{COMPONENT_TYPE}}` | Component type | `communication` |
| `{{DATE}}` | Current date | `2026-02-04` |

### Step 4: Handle Component Type

If not `communication` type, delete scripts/send.js:
```bash
rm -f scripts/send.js
```

### Step 5: Implement Component Logic

Based on component type, implement core logic:

**communication type**:
- `src/index.js` - Message receiving service
- `scripts/send.js` - Message sending interface

**capability type**:
- `src/index.js` - Main service logic

**utility type**:
- `src/index.js` - Tool logic (may not need persistent service)

### Step 6: Initialize Git

```bash
git init
git add .
git commit -m "Initial commit: zylos-<name>"
git branch -M main
git remote add origin git@github.com:zylos-ai/zylos-<name>.git
git push -u origin main
```

## Template File Structure

```
template/
├── SKILL.md              # Component metadata, read by zylos CLI
├── README.md             # User documentation
├── CHANGELOG.md          # Version history
├── LICENSE               # MIT license
├── .gitignore            # Git ignore rules
├── package.json          # npm dependencies
├── ecosystem.config.js   # PM2 configuration
├── scripts/
│   └── send.js           # C4 send interface (communication only)
├── hooks/
│   ├── post-install.js   # Post-install hook
│   ├── pre-upgrade.js    # Pre-upgrade hook
│   └── post-upgrade.js   # Post-upgrade hook
└── src/
    ├── index.js          # Main entry point
    └── lib/
        └── config.js     # Configuration loader
```

## Directory Convention

```
Code: ~/.claude/skills/<component>/
Data: ~/zylos/components/<component>/
Secrets: ~/zylos/.env
```

## scripts/send.js Interface (communication type)

```bash
# Send text
./scripts/send.js <endpoint_id> "message content"

# Send media
./scripts/send.js <endpoint_id> "[MEDIA:image]/path/to/image.png"
./scripts/send.js <endpoint_id> "[MEDIA:file]/path/to/file.pdf"
```

## Acceptance Checklist

After completing the component, verify:

- [ ] SKILL.md metadata is complete
- [ ] README.md is clear
- [ ] `npm install && npm start` works
- [ ] post-install.js creates data directory and default config
- [ ] post-upgrade.js handles config migrations
- [ ] PM2 can manage the service
- [ ] (communication) scripts/send.js interface works

## Reference Implementation

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram)

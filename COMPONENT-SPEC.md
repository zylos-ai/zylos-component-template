# Zylos Component Development Specification

> **Note**: This is the full reference specification. For daily development, see [CLAUDE.md](./CLAUDE.md).
> This file is deleted when creating a new component.

**Version**: 1.0.0
**Date**: 2026-02-04
**Status**: Released

This document defines the development specification for Zylos components, based on v2 hooks mode.

---

## 1. Component Types

| Type | Description | Examples |
|------|-------------|----------|
| **communication** | Communication channels for external platforms | telegram, lark, discord |
| **capability** | Capability components extending Agent functionality | browser, knowledge-base |
| **utility** | Utility components for helper functions | custom tools |

---

## 2. Directory Structure

### 2.1 Skills Directory (Code)

```
~/.claude/skills/<component>/
├── SKILL.md              # Component metadata (required)
├── README.md             # Documentation (required)
├── CHANGELOG.md          # Change log (required)
├── LICENSE               # Open source license
├── package.json          # Dependencies
├── ecosystem.config.js   # PM2 config (if service)
├── send.js               # C4 send interface (communication only)
├── hooks/                # Lifecycle hooks
│   ├── post-install.js   # Post-install hook
│   ├── pre-upgrade.js    # Pre-upgrade hook
│   └── post-upgrade.js   # Post-upgrade hook
└── src/                  # Source code
    ├── index.js          # Main entry (or bot.js etc.)
    └── lib/              # Module directory
        └── config.js     # Config loader
```

### 2.2 Data Directory

```
~/zylos/components/<component>/
├── config.json           # Runtime configuration
├── media/                # Media files (if needed)
└── logs/                 # Log directory
```

### 2.3 Key Principles

1. **Code in Skills**: `~/.claude/skills/<component>/`
2. **Data in Data**: `~/zylos/components/<component>/`
3. **Secrets in .env**: `~/zylos/.env`
4. **Code can be overwritten on upgrade, data is preserved**

---

## 3. SKILL.md Specification (v2)

SKILL.md uses YAML frontmatter to define component metadata:

```yaml
---
name: <component-name>
version: x.y.z
description: Component description
type: communication | capability | utility

lifecycle:
  npm: true                              # Whether npm install needed
  service:
    name: zylos-<component>              # PM2 service name
    entry: src/index.js                  # Entry file
  data_dir: ~/zylos/components/<component>
  hooks:
    post-install: hooks/post-install.js
    pre-upgrade: hooks/pre-upgrade.js
    post-upgrade: hooks/post-upgrade.js

upgrade:
  repo: zylos-ai/zylos-<component>
  branch: main

dependencies:                            # Dependencies on other components
  - comm-bridge
---

# Component Name

Component documentation...
```

### 3.1 Field Description

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Component name |
| version | Yes | Version number (semver) |
| description | Yes | Short description |
| type | Yes | Component type |
| lifecycle.npm | No | Whether npm install needed, default true |
| lifecycle.service | No | PM2 service config |
| lifecycle.data_dir | No | Data directory path |
| lifecycle.hooks | No | Lifecycle hooks |
| upgrade.repo | Yes | GitHub repository (org/repo) |
| upgrade.branch | No | Tracking branch, default main |
| dependencies | No | Dependencies on other components |

---

## 4. Hooks Specification

### 4.1 File Format

- **Recommended**: Node.js script (.js)
- **Supported**: Shell script (.sh or no extension)

### 4.2 post-install.js

Executed after installation, used for:
- Creating data subdirectories
- Generating default config file
- Checking environment variables
- Configuring PM2 service

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/<component>');

const DEFAULT_CONFIG = {
  enabled: true,
  // ... default config
};

// 1. Create subdirectories
fs.mkdirSync(path.join(DATA_DIR, 'logs'), { recursive: true });

// 2. Create default config
const configPath = path.join(DATA_DIR, 'config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

// 3. Check environment variables
// ...

console.log('[post-install] Complete!');
```

### 4.3 pre-upgrade.js

Executed before upgrade, used for:
- Backing up critical data
- Validating upgrade prerequisites

### 4.4 post-upgrade.js

Executed after upgrade, used for:
- Config schema migrations
- Data format updates

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, 'zylos/components/<component>/config.json');

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let migrated = false;

  // Migration: Add new field
  if (config.newField === undefined) {
    config.newField = 'default';
    migrated = true;
  }

  if (migrated) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[post-upgrade] Config migrated');
  }
}

console.log('[post-upgrade] Complete!');
```

---

## 5. Configuration Specification

### 5.1 config.json Structure

```json
{
  "enabled": true,
  "feature_flags": {},
  "settings": {}
}
```

### 5.2 Environment Variables (~/zylos/.env)

Secrets are placed in .env:

```bash
# Component name uppercase + underscore
<COMPONENT>_API_KEY=xxx
<COMPONENT>_SECRET=xxx
```

---

## 6. Communication Component Specification

Communication components need to implement the C4 interface.

### 6.1 send.js Interface

Location: Component root directory `send.js`

```bash
# Usage
node send.js <endpoint_id> "<message>"

# Return
# 0: Success
# non-0: Failure
```

### 6.2 Message Format

**Receiving (External → Claude)**:
```
[<SOURCE> <TYPE>] <username> said: <message>

# Examples
[TG DM] howardzhou said: Hello
[TG GROUP:Dev Team] howardzhou said: @bot please check
```

**Sending (Claude → External)**:
```bash
# Plain text
send.js "12345" "Hello"

# Media files (with prefix)
send.js "12345" "[MEDIA:image]/path/to/image.jpg"
send.js "12345" "[MEDIA:file]/path/to/document.pdf"
```

---

## 7. PM2 Service Configuration

### 7.1 ecosystem.config.js

```javascript
const path = require('path');
const os = require('os');

module.exports = {
  apps: [{
    name: 'zylos-<component>',
    script: 'src/index.js',
    cwd: path.join(os.homedir(), '.claude/skills/<component>'),
    env: {
      NODE_ENV: 'production'
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    error_file: path.join(os.homedir(), 'zylos/components/<component>/logs/error.log'),
    out_file: path.join(os.homedir(), 'zylos/components/<component>/logs/out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

---

## 8. Version Management

### 8.1 Version Number Convention

Use [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH
- Example: 1.0.0, 1.1.0, 1.1.1

### 8.2 CHANGELOG.md Convention

```markdown
# Changelog

## [x.y.z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes

### Fixed
- Fixes

### Upgrade Notes
Upgrade notes
```

---

## 9. Acceptance Criteria

- [ ] SKILL.md contains complete metadata
- [ ] README.md is clear
- [ ] CHANGELOG.md records version history
- [ ] hooks/post-install.js correctly creates data directory and config
- [ ] hooks/post-upgrade.js handles config migrations
- [ ] Configuration separated from code (config.json + .env)
- [ ] PM2 can manage start/stop (if service)
- [ ] `zylos install <component>` completes installation in fresh environment
- [ ] `zylos upgrade <component>` preserves user configuration

---

## 10. Reference Implementation

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) - Communication component reference

---

*End of document*

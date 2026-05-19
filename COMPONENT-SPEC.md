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
~/zylos/.claude/skills/<component>/
├── SKILL.md              # Component metadata (required)
├── README.md             # Documentation (required)
├── CHANGELOG.md          # Change log (required)
├── LICENSE               # Open source license
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
├── ecosystem.config.cjs  # PM2 config (if service, CommonJS required by PM2)
├── docs/                 # Development and design documents, not agent-facing runtime context
│   └── DESIGN.md         # Architecture/design notes for maintainers and reviews
├── scripts/
│   └── send.js           # C4 send interface (communication only)
├── hooks/                # Lifecycle hooks
│   ├── post-install.js   # Post-install hook
│   ├── pre-upgrade.js    # Pre-upgrade hook
│   └── post-upgrade.js   # Post-upgrade hook
└── src/                  # Source code
    ├── index.js          # Main entry point
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

1. **Code in Skills**: `~/zylos/.claude/skills/<component>/`
2. **Data in Data**: `~/zylos/components/<component>/`
3. **Secrets in config.json**: `~/zylos/components/<component>/config.json` (mark `sensitive: true` in SKILL.md)
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
    type: pm2                            # Service manager
    name: zylos-<component>              # PM2 service name
    entry: src/index.js                  # Entry file
  data_dir: ~/zylos/components/<component>
  hooks:
    configure: hooks/configure.js
    post-install: hooks/post-install.js
    pre-upgrade: hooks/pre-upgrade.js
    post-upgrade: hooks/post-upgrade.js
  preserve:                              # Files preserved during upgrade
    - config.json
    - data/

upgrade:
  repo: zylos-ai/zylos-<component>
  branch: main

config:
  required:
    - name: API_KEY
      description: API key
      sensitive: true

dependencies: []                          # Dependencies on other installable components

http_routes:                              # Optional: browser-facing HTTP routes managed by Zylos Caddy
  - path: /<component>/*
    type: reverse_proxy
    target: localhost:3000
    strip_prefix: /<component>
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
| lifecycle.service.type | No | Service manager (pm2) |
| lifecycle.service.name | No | PM2 service name |
| lifecycle.service.entry | No | Entry file path |
| lifecycle.data_dir | No | Data directory path |
| lifecycle.hooks | No | Lifecycle hooks. `configure` is the non-interactive config storage hook |
| lifecycle.preserve | No | Files to preserve during upgrade |
| upgrade.repo | Yes | GitHub repository (org/repo) |
| upgrade.branch | No | Tracking branch, default main |
| config.required | No | Required config items (collected on install) |
| config.optional | No | Optional config items (with defaults) |
| dependencies | No | Dependencies on other components |
| http_routes | No | Browser-facing HTTP routes managed by Zylos Caddy |

---

## 4. HTTP Routes and Base Path Compatibility

Components that expose a browser-facing HTTP service must support both direct local access and Caddy proxy access.

### 4.1 Caddy Route Declaration

Declare routes in `SKILL.md` frontmatter:

```yaml
http_routes:
  - path: /<component>/*
    type: reverse_proxy
    target: localhost:3000
    strip_prefix: /<component>
```

When `strip_prefix` is set, Zylos core generates a Caddy route equivalent to:

```caddy
redir /<component> /<component>/ permanent
handle /<component>/* {
    uri strip_prefix /<component>
    reverse_proxy localhost:3000 {
        header_up X-Forwarded-Prefix /<component>
    }
}
```

The component receives root-internal requests such as `/`, `/login`, and `/_assets/app.js`. The external browser path remains `/<component>/...`.

### 4.2 Component Routing Rules

HTTP components must follow these rules:

1. **Root-internal routes**: serve the app at `/` internally. Do not mount route handlers under `/<component>`.
2. **No hardcoded external prefix**: application code must not hardcode `/<component>` into links, forms, assets, redirects, or APIs.
3. **Proxy-aware browser base**: use `X-Forwarded-Prefix` when present to generate browser-facing absolute paths.
4. **Relative local fallback**: when `X-Forwarded-Prefix` is absent, generate relative URLs so direct local access works without Caddy.
5. **Strict forwarded-prefix validation**: treat `X-Forwarded-Prefix` as untrusted. Accept only a clean path prefix and reject query/fragment, whitespace/control chars, backslashes, protocol-like or protocol-relative values, dot segments, percent-encoded input, and HTML metacharacters before using it in templates or redirects.
6. **Safe redirects**: validate `next` and similar redirect params against the current browser base. Reject external URLs, dot-segment escapes such as `/<component>/../admin`, and paths outside the component prefix.
7. **Browser-base-aware caching**: if cached HTML contains links, forms, scripts, or API URLs derived from the browser base, cache entries must include the browser base in the key or render those parts after cache lookup. File watchers or other invalidators must clear every browser-base variant for the same underlying resource.

### 4.3 URL Generation Pattern

Recommended behavior:

| Request context | Browser base | Link/form/action examples |
|-----------------|--------------|---------------------------|
| Direct localhost, no `X-Forwarded-Prefix` | relative | `./login`, `./_assets/app.js`, `login?next=.%2F` |
| Caddy proxy with `X-Forwarded-Prefix: /<component>` | absolute prefix | `/<component>/login`, `/<component>/_assets/app.js`, `/<component>/login?next=%2F<component>%2F` |

Normalize `X-Forwarded-Prefix` before use:

- It must start with `/`.
- It must not start with `//`.
- It must not end with `/`, except the root prefix `/`.
- It must not contain query strings, fragments, spaces, control characters, backslashes, protocols, `.` / `..` path segments, percent-encoded input, or HTML metacharacters (`"`, `'`, `` ` ``, `<`, `>`, `&`).
- Ignore invalid values and fall back to relative local URLs.

### 4.4 Test Requirements

HTTP components with `http_routes.strip_prefix` must include tests for:

- Direct access to `/` without proxy headers.
- Proxied access with `X-Forwarded-Prefix: /<component>`.
- Login/logout or other redirects preserving the correct browser base.
- Template links, form actions, assets, and API URLs generated under the correct base.
- Rejection of unsafe `X-Forwarded-Prefix` values, including protocol-relative prefixes (`//evil.test`), query/fragment injection, and HTML metacharacters.
- Rejection of unsafe `next` targets, including absolute URLs, paths outside the current prefix, and dot-segment escapes such as `/<component>/../admin`.
- Cache invalidation across all browser-base variants when rendered HTML is browser-base-specific.

---

## 5. Hooks Specification

### 5.1 File Format

- **Recommended**: Node.js script (.js)
- **Supported**: Shell script (.sh or no extension)

### 5.2 configure.js

Executed after zylos collects `config.required` values and before `post-install`.

Contract:
- Input is a JSON object on stdin, keyed by SKILL.md config item name.
- The hook is non-interactive and must not prompt.
- The component owns storage and should write to `~/zylos/components/<component>/config.json`.
- Sensitive values must not be printed.
- Exit non-zero if input is invalid or config cannot be written.
- If the configure hook exits non-zero, zylos logs a warning and continues installation. The component may still need manual configuration before service start succeeds.
- `configure` is install-time only. Upgrade-time config migrations belong in `post-upgrade`, where the component can map old keys or storage formats into the current `config.json` schema.

```javascript
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.join(process.env.HOME, 'zylos/components/<component>/config.json');
const input = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => resolve(data));
  process.stdin.on('error', reject);
});

const collected = JSON.parse(input);
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : { enabled: true };

for (const [key, value] of Object.entries(collected)) {
  config[key.toLowerCase()] = value;
}

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('[configure] Complete!');
```

### 5.3 post-install.js

Executed after installation, used for:
- Creating data subdirectories
- Generating default config file
- Checking config.json fields
- Configuring PM2 service

```javascript
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

// 3. Verify config has required fields
// ...

console.log('[post-install] Complete!');
```

### 5.4 pre-upgrade.js

Executed before upgrade, used for:
- Backing up critical data
- Validating upgrade prerequisites

### 5.5 post-upgrade.js

Executed after upgrade, used for:
- Config schema migrations
- Data format updates

```javascript
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

## 6. Configuration Specification

### 6.1 config.json Structure

```json
{
  "enabled": true,
  "feature_flags": {},
  "settings": {}
}
```

### 6.2 Secrets

Secrets live in `config.json` alongside runtime config. Mark sensitive fields with `sensitive: true` in SKILL.md `config.required` and declare `lifecycle.hooks.configure` so zylos can collect values and hand them to the component for storage:

```json
{
  "enabled": true,
  "api_key": "xxx",
  "settings": {}
}
```

Components read secrets from `config.json` — they never need to know the secret's origin. When vault is introduced, the platform layer populates `config.json` from vault; component code stays unchanged.

Legacy components without `lifecycle.hooks.configure` remain supported by zylos-core's `.env` compatibility path. New components should use the configure hook so the component owns its storage format.

---

## 7. Communication Component Specification

Communication components need to implement the C4 interface.

### 7.1 send.js Interface

Location: `scripts/send.js`

```bash
# Usage
node scripts/send.js <endpoint_id> "<message>"

# Return
# 0: Success
# non-0: Failure
```

### 7.2 Message Format

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
scripts/send.js "12345" "Hello"

# Media files (with prefix)
scripts/send.js "12345" "[MEDIA:image]/path/to/image.jpg"
scripts/send.js "12345" "[MEDIA:file]/path/to/document.pdf"
```

---

## 8. PM2 Service Configuration

### 8.1 ecosystem.config.cjs

```javascript
const path = require('path');
const os = require('os');

module.exports = {
  apps: [{
    name: 'zylos-<component>',
    script: 'src/index.js',
    cwd: path.join(os.homedir(), 'zylos/.claude/skills/<component>'),
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

## 9. Version Management

### 9.1 Version Number Convention

Use [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH
- Example: 1.0.0, 1.1.0, 1.1.1

### 9.2 CHANGELOG.md Convention

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

## 10. Acceptance Criteria

- [ ] SKILL.md contains complete metadata
- [ ] README.md is clear
- [ ] CHANGELOG.md records version history
- [ ] hooks/post-install.js correctly creates data directory and config
- [ ] hooks/post-upgrade.js handles config migrations
- [ ] Browser-facing HTTP routes support both direct localhost access and Caddy proxy access
- [ ] Configuration separated from code (config.json in data directory)
- [ ] PM2 can manage start/stop (if service)
- [ ] `zylos add <component>` completes installation in fresh environment
- [ ] `zylos upgrade <component>` preserves user configuration

---

## 11. Reference Implementations

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) - Telegram communication component
- [zylos-lark](https://github.com/zylos-ai/zylos-lark) - Lark/Feishu communication component

---

*End of document*

# AI Component Development Guide

This document guides AI assistants to create new zylos components using this template.

For the full technical specification, see [COMPONENT-SPEC.md](./COMPONENT-SPEC.md).

## Part 1: Quick Start

### Step 1: Copy Template

```bash
cd ~/src
git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone
cp -r temp-clone/template zylos-<name>
rm -rf temp-clone
cd zylos-<name>
```

### Step 2: Gather Component Info

Confirm with user:
- **Name**: lowercase, e.g., `discord`, `slack`, `browser`
- **Description**: one-line description
- **Type**: `communication` | `capability` | `utility`

### Step 3: Replace Placeholders

```bash
NAME="discord"
NAME_UPPER="DISCORD"
TITLE="Discord"
DESC="Discord bot integration"
TYPE="communication"
DATE=$(date +%Y-%m-%d)

find . -type f -exec sed -i "s|{{COMPONENT_NAME}}|$NAME|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_NAME_UPPER}}|$NAME_UPPER|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_TITLE}}|$TITLE|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_DESCRIPTION}}|$DESC|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_TYPE}}|$TYPE|g" {} \;
find . -type f -exec sed -i "s|{{DATE}}|$DATE|g" {} \;
```

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `{{COMPONENT_NAME}}` | Component name (lowercase) | `discord` |
| `{{COMPONENT_NAME_UPPER}}` | Component name (uppercase) | `DISCORD` |
| `{{COMPONENT_TITLE}}` | Component title | `Discord` |
| `{{COMPONENT_DESCRIPTION}}` | Component description | `Discord bot integration` |
| `{{COMPONENT_TYPE}}` | Component type | `communication` |
| `{{DATE}}` | Current date | `2026-02-09` |

### Step 4: Handle Component Type

- **communication**: Keep all files as-is
- **capability / utility**: Delete `scripts/send.js` (not needed)

```bash
# For non-communication types:
rm -f scripts/send.js
```

### Step 5: Implement Component Logic

Follow Part 2 below based on component type. This is where the real work happens.

### Step 6: Update SKILL.md

Fill in the SKILL.md body sections:
- **Dependencies**: List what the component needs (or "None")
- **When to Use**: When should Claude invoke this component?
- **How to Use**: Code examples for Claude to reference
- **Config**: Uncomment and fill `config.required` if the component needs API keys or secrets

### Step 7: Update README.md

Replace placeholder features with actual features. Fill in:
- Real feature list
- Platform-specific setup instructions (if any)
- Environment variables needed

### Step 8: Initialize Git

```bash
git init
git add .
git commit -m "Initial commit: zylos-<name>"
git branch -M main
git remote add origin git@github.com:zylos-ai/zylos-<name>.git
git push -u origin main
```

---

## Part 2: Type-Specific Implementation

### Communication Components

Communication components connect external platforms (Telegram, Lark, Discord, etc.) to Claude via the C4 bridge. They have two jobs: **receive messages** from the platform and **send messages** back.

**Files to implement:**
- `src/index.js` — Message receiving service (long-running)
- `scripts/send.js` — Message sending interface (called by Claude per-message)

#### Message Receiving Pattern (src/index.js)

The service listens for messages from the platform and forwards them to Claude via C4.

```javascript
import { exec } from 'child_process';
import path from 'path';

const C4_RECEIVE = path.join(process.env.HOME,
  'zylos/.claude/skills/comm-bridge/scripts/c4-receive.js');

/**
 * Parse c4-receive JSON response from stdout.
 */
function parseC4Response(stdout) {
  if (!stdout) return null;
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}

/**
 * Forward a message to Claude via C4 bridge.
 * @param {string} source - Channel name, e.g. "discord"
 * @param {string} endpoint - Chat/channel ID for reply routing
 * @param {string} content - Formatted message string
 * @param {function} [onReject] - Callback with error message when c4-receive rejects
 */
function sendToC4(source, endpoint, content, onReject) {
  const safeContent = content.replace(/'/g, "'\\''");
  const cmd = `node "${C4_RECEIVE}" --channel "${source}" --endpoint "${endpoint}" --json --content '${safeContent}'`;

  exec(cmd, { encoding: 'utf8' }, (error, stdout) => {
    if (!error) {
      console.log(`[${source}] Sent to C4: ${content.substring(0, 50)}...`);
      return;
    }
    // Structured rejection (health down/recovering) — no retry
    const response = parseC4Response(error.stdout || stdout);
    if (response && response.ok === false && response.error?.message) {
      console.warn(`[${source}] C4 rejected (${response.error.code}): ${response.error.message}`);
      if (onReject) onReject(response.error.message);
      return;
    }
    // Unexpected failure — retry once after 2s
    console.warn(`[${source}] C4 send failed, retrying: ${error.message}`);
    setTimeout(() => {
      exec(cmd, { encoding: 'utf8' }, (retryError, retryStdout) => {
        if (!retryError) return;
        const retryResponse = parseC4Response(retryError.stdout || retryStdout);
        if (retryResponse?.ok === false && retryResponse.error?.message && onReject) {
          onReject(retryResponse.error.message);
        }
      });
    }, 2000);
  });
}
```

#### Message Format Convention

Messages sent to C4 must follow this format so Claude knows who sent what, from where:

```
[SOURCE TYPE] username said: message text

# Private messages
[DISCORD DM] alice said: Hello!

# Group messages (include group name)
[DISCORD GROUP:dev-chat] bob said: @bot check this

# Messages with file attachments
[DISCORD DM] alice said: Look at this ---- file: /path/to/downloaded/file.png
```

The `reply via:` path is automatically appended by C4 — you don't need to add it.

#### Owner Binding Pattern

First user to interact becomes the owner (admin). This is a proven pattern from telegram and lark.

```javascript
function handleMessage(userId, username, chatId, text) {
  const config = getConfig();

  // First-user binding
  if (!config.owner?.bound) {
    config.owner = { bound: true, user_id: userId, name: username };
    saveConfig(config);
    console.log(`[component] Owner bound: ${username}`);
    // Reply: "You are now the admin of this bot."
    return;
  }

  // Authorization check
  if (!isAuthorized(config, userId)) {
    // Reply: "Sorry, this bot is private."
    return;
  }

  // Forward to Claude (reply with rejection reason if C4 is down)
  const message = `[DISCORD DM] ${username} said: ${text}`;
  sendToC4('discord', String(chatId), message, (errMsg) => {
    replyToUser(chatId, errMsg);  // implement using your platform's send API
  });
}
```

#### Group Message Context Pattern

For group chats, log all messages and provide recent context when the bot is @mentioned:

```javascript
// Log every message in allowed groups (for context)
logMessage(chatId, { username, text, timestamp });

// When @mentioned, include recent context
const recentMessages = getGroupContext(chatId);  // last N messages since bot's last response
const contextPrefix = recentMessages.length > 0
  ? `[Recent context]\n${recentMessages.map(m => `${m.user}: ${m.text}`).join('\n')}\n[Current message]\n`
  : '';
const message = `[DISCORD GROUP:${groupName}] ${username} said: ${contextPrefix}${text}`;
sendToC4('discord', String(chatId), message, (errMsg) => {
  replyToUser(chatId, errMsg);
});
```

#### Message Sending Pattern (scripts/send.js)

The template `scripts/send.js` provides the interface — you implement `sendText()` and `sendMedia()`:

```javascript
// Text: call the platform's API to send a message
async function sendText(endpoint, text) {
  const response = await fetch(`https://api.platform.com/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channel: endpoint, text })
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
}

// Media: upload file to the platform
async function sendMedia(endpoint, type, filePath) {
  // Read file, create form data, upload via platform API
}
```

**Important**: Handle long messages by splitting into chunks (platform-specific max length).

---

### Capability Components

Capability components extend the agent's abilities (browser automation, knowledge base, etc.). They typically expose tools or services that Claude uses to accomplish tasks.

**Files to implement:**
- `src/index.js` — Main service (may be long-running or on-demand)
- Delete `scripts/send.js` (not needed)

#### Service Pattern

```javascript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.env.HOME, 'zylos/.env') });

import { getConfig, watchConfig } from './lib/config.js';

let config = getConfig();

watchConfig((newConfig) => {
  config = newConfig;
});

// Example: HTTP server exposing capability
import http from 'http';

const server = http.createServer((req, res) => {
  // Handle capability requests
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

server.listen(config.port || 3000, () => {
  console.log(`[component] Listening on port ${config.port || 3000}`);
});

// Graceful shutdown
function shutdown() {
  server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

#### CLI Tool Pattern

Some capability components provide CLI tools instead of (or in addition to) a service:

```javascript
#!/usr/bin/env node
// scripts/tool-name.js

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'search':
    await doSearch(args[1]);
    break;
  case 'get':
    await doGet(args[1]);
    break;
  default:
    console.error('Usage: tool-name.js <search|get> <query>');
    process.exit(1);
}
```

---

### Utility Components

Utility components provide helper tools or one-shot scripts. They may not need a persistent service.

**Files to implement:**
- `src/index.js` — Tool logic
- Delete `scripts/send.js` (not needed)
- Consider: if no persistent service is needed, you can also remove `ecosystem.config.cjs` and set `lifecycle.service` to null in SKILL.md

---

## Part 3: Best Practices

These patterns are extracted from production-tested telegram and lark components.

### Config Management

**Two places for configuration, each with a clear purpose:**

| Location | What goes here | Example |
|----------|---------------|---------|
| `~/zylos/.env` | Secrets and credentials | `DISCORD_BOT_TOKEN=xxx` |
| `~/zylos/components/<name>/config.json` | Runtime configuration | `{"enabled": true, "allowed_groups": [...]}` |

**Rule**: Secrets NEVER go in config.json. Config.json is for non-sensitive runtime settings that may be modified during operation.

Declare secrets in SKILL.md frontmatter so the install flow collects them:

```yaml
config:
  required:
    - name: DISCORD_BOT_TOKEN
      description: Discord bot token
      sensitive: true
```

### Logging

Use a consistent prefix format: `[component-name]`

```javascript
console.log(`[discord] Starting...`);
console.log(`[discord] Config loaded, enabled: ${config.enabled}`);
console.error(`[discord] Failed to connect: ${err.message}`);
```

### Error Handling

```javascript
// Startup: fail fast on missing credentials
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('[discord] DISCORD_BOT_TOKEN not set in ~/zylos/.env');
  process.exit(1);
}

// Runtime: log and continue (don't crash the service)
bot.on('error', (err) => {
  console.error(`[discord] Error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### Hooks

The template includes three lifecycle hooks. They're called by Claude (not CLI) at the right time:

| Hook | When | Purpose |
|------|------|---------|
| `post-install.js` | After `zylos add` | Create data dirs, default config, check env vars |
| `pre-upgrade.js` | Before `zylos upgrade` | Backup config. Return exit 1 to abort upgrade |
| `post-upgrade.js` | After `zylos upgrade` | Migrate config schema, update data formats |

The template hooks are ready to use — just uncomment and customize the sections you need.

### Directory Convention

```
Code:    ~/zylos/.claude/skills/<component>/    # Overwritten on upgrade
Data:    ~/zylos/components/<component>/         # Preserved across upgrades
Secrets: ~/zylos/.env                            # Shared across components
```

**Code is disposable, data is permanent.** Never store user data in the skills directory.

---

## File Reference

```
template/
├── SKILL.md              # Component metadata — read by zylos CLI
├── README.md             # User-facing documentation
├── CHANGELOG.md          # Version history (Keep a Changelog format)
├── LICENSE               # MIT license
├── .gitignore            # Git ignore rules
├── package.json          # npm package (ESM: "type": "module")
├── ecosystem.config.cjs  # PM2 config (CommonJS — required by PM2)
├── scripts/
│   └── send.js           # C4 send interface (communication only)
├── hooks/
│   ├── post-install.js   # Post-install setup
│   ├── pre-upgrade.js    # Pre-upgrade backup/validation
│   └── post-upgrade.js   # Post-upgrade config migration
└── src/
    ├── index.js          # Main entry point
    └── lib/
        └── config.js     # Config loader with hot-reload
```

## Acceptance Checklist

- [ ] SKILL.md frontmatter is complete (name, version, type, lifecycle, upgrade)
- [ ] SKILL.md body has meaningful When to Use / How to Use sections
- [ ] README.md has real features and setup instructions
- [ ] `npm install && npm start` works
- [ ] post-install.js creates data directory and default config
- [ ] post-upgrade.js handles config migrations
- [ ] PM2 can manage the service (`pm2 start ecosystem.config.cjs`)
- [ ] (communication) scripts/send.js sends text and media
- [ ] (communication) Messages forwarded to C4 in correct format

## Reference Implementations

Study these for real-world patterns:

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) — Telegram communication component
- [zylos-lark](https://github.com/zylos-ai/zylos-lark) — Lark/Feishu communication component

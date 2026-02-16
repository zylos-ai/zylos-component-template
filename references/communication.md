# Communication Component Patterns

Communication components connect external platforms (Telegram, Lark, Discord, etc.) to Claude via the C4 bridge. Two jobs: **receive messages** and **send messages**.

**Files to implement:**
- `src/index.js` — Message receiving service (long-running)
- `scripts/send.js` — Message sending interface (called by Claude per-message)

## Message Receiving (src/index.js)

Forward platform messages to Claude via C4:

```javascript
import { exec } from 'child_process';
import path from 'path';

const C4_RECEIVE = path.join(process.env.HOME,
  'zylos/.claude/skills/comm-bridge/scripts/c4-receive.js');

function parseC4Response(stdout) {
  if (!stdout) return null;
  try { return JSON.parse(stdout.trim()); } catch { return null; }
}

/**
 * Forward a message to Claude via C4 bridge.
 * @param {string} source - Channel name, e.g. "discord"
 * @param {string} endpoint - Chat/channel ID for reply routing
 * @param {string} content - Formatted message string
 * @param {function} [onReject] - Callback when c4-receive rejects
 */
function sendToC4(source, endpoint, content, onReject) {
  const safeContent = content.replace(/'/g, "'\\''");
  const cmd = `node "${C4_RECEIVE}" --channel "${source}" --endpoint "${endpoint}" --json --content '${safeContent}'`;

  exec(cmd, { encoding: 'utf8' }, (error, stdout) => {
    if (!error) {
      console.log(`[${source}] Sent to C4: ${content.substring(0, 50)}...`);
      return;
    }
    const response = parseC4Response(error.stdout || stdout);
    if (response && response.ok === false && response.error?.message) {
      console.warn(`[${source}] C4 rejected (${response.error.code}): ${response.error.message}`);
      if (onReject) onReject(response.error.message);
      return;
    }
    // Retry once after 2s
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

## Message Format

Messages to C4 must follow this format:

```
# Private messages
[DISCORD DM] alice said: Hello!

# Group messages
[DISCORD GROUP:dev-chat] bob said: @bot check this

# With file attachments
[DISCORD DM] alice said: Look at this ---- file: /path/to/file.png
```

The `reply via:` path is automatically appended by C4.

## Owner Binding

First user to interact becomes admin:

```javascript
function handleMessage(userId, username, chatId, text) {
  const config = getConfig();

  if (!config.owner?.bound) {
    config.owner = { bound: true, user_id: userId, name: username };
    saveConfig(config);
    return;  // Reply: "You are now the admin of this bot."
  }

  if (!isAuthorized(config, userId)) {
    return;  // Reply: "Sorry, this bot is private."
  }

  const message = `[DISCORD DM] ${username} said: ${text}`;
  sendToC4('discord', String(chatId), message, (errMsg) => {
    replyToUser(chatId, errMsg);
  });
}
```

## Group Context

Log all group messages, include recent context when @mentioned:

```javascript
logMessage(chatId, { username, text, timestamp });

const recentMessages = getGroupContext(chatId);
const contextPrefix = recentMessages.length > 0
  ? `[Recent context]\n${recentMessages.map(m => `${m.user}: ${m.text}`).join('\n')}\n[Current message]\n`
  : '';
const message = `[DISCORD GROUP:${groupName}] ${username} said: ${contextPrefix}${text}`;
sendToC4('discord', String(chatId), message);
```

## Message Sending (scripts/send.js)

Implement `sendText()` and `sendMedia()` in the template:

```javascript
async function sendText(endpoint, text) {
  const response = await fetch(`https://api.platform.com/send`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: endpoint, text })
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
}
```

Handle long messages by splitting into chunks (platform-specific max length).

## Reference Implementations

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram)
- [zylos-lark](https://github.com/zylos-ai/zylos-lark)

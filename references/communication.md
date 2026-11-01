# Communication Component Patterns

Communication components connect external platforms (Telegram, Lark, Discord, etc.) to Claude via the C4 bridge. Two jobs: **receive messages** and **send messages**.

**Files to implement:**
- `src/index.js` — Message receiving service (long-running)
- `scripts/send.js` — Message sending interface (called by Claude per-message)

## Message Receiving (src/index.js)

Forward platform messages to Claude via C4:

```javascript
import { execFile } from 'child_process';
import path from 'path';
import { getConfig } from './lib/config.js';
import { buildC4ReceiveArgs } from './lib/c4.js';

const C4_RECEIVE = path.join(process.env.ZYLOS_DIR || path.join(process.env.HOME, 'zylos'),
  '.claude/skills/comm-bridge/scripts/c4-receive.js');

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
  const args = () => [C4_RECEIVE, ...buildC4ReceiveArgs({
    source, endpoint, content, sessionGroup: getConfig().settings?.session_group,
  })];

  execFile(process.execPath, args(), { encoding: 'utf8' }, (error, stdout) => {
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
      execFile(process.execPath, args(), { encoding: 'utf8' }, (retryError, retryStdout) => {
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

### Core feature compatibility

The optional `settings.session_group` field in the component's data-directory
`config.json` selects a local session group. Leave it absent for the default
component namespace: no group value is supplied and `--session-group` is omitted.
Do not add a default value to the config scaffold. The literal group name
`default` is an ordinary non-default local group, not a reserved value.

`buildC4ReceiveArgs` appends `--session-group` only when a local group is configured
and `supportsCoreFeature('sessionGroup')` returns true. Its centralized threshold
is `{ sessionGroup: { 1: '1.0.0-beta.1' } }`: Core `multi-session/base` at
`76d4ac4f7536f9b86524ea973d8a84105a38b415` has that package version and its
`c4-receive.js` parser recognizes this option. Thresholds are per major line;
compare SemVer (including prereleases) within a listed line, support versions
above every listed major, and reject all other versions or unknown features.
Add a major-line entry when a feature is backported. Build metadata does not
affect comparison.

Every call resolves the first executable `zylos` on PATH through `realpath`, walks
up to the package named `zylos`, and rereads its `package.json`. There is no cache,
subprocess fallback, separate version file, or user-controlled feature switch.
Unreadable or invalid SemVer versions mean unsupported. Before checking features,
the helper checks `<ZYLOS_DIR>/.zylos/upgrade/active.json` (default root `~/zylos`):
while that marker exists, every feature is unsupported even if the package version
is new. `getCoreVersion()` still reports the package version during an upgrade.
Both the initial send and its retry construct arguments afresh.

New C4 options must have their own version threshold and be gated the same way.
The example keeps its existing single retry after 2 seconds for transport errors,
immediate `onReject` for structured rejections, and retry rejection callback;
only command/argument construction changes to `execFile` with an argument array.

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

## Outbound Messages (Claude → Platform via C4)

Claude sends messages to external platforms via `c4-send.js`. **Always use stdin (heredoc) form** — CLI argument form silently truncates messages containing quotes, `$`, backticks, or other shell special characters.

In the component's SKILL.md, document the sending pattern like this:

```bash
cat <<'EOF' | node ~/zylos/.claude/skills/comm-bridge/scripts/c4-send.js "<channel>" "<endpoint>"
message content here
EOF
```

**Never** use the CLI argument form in documentation:
```bash
# DON'T — fragile, breaks on special characters
node ~/zylos/.claude/skills/comm-bridge/scripts/c4-send.js "<channel>" "<endpoint>" "message"
```

See `comm-bridge/references/c4-send.md` for the full specification.

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

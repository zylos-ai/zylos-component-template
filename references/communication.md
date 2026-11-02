# Communication Component Patterns

Communication components connect external platforms (Telegram, Lark, Discord, etc.) to Claude via the C4 bridge. Two jobs: **receive messages** and **send messages**.

**Files to implement:**
- `src/index.js` — Message receiving service (long-running)
- `scripts/send.js` — Message sending interface (called by Claude per-message)

## Message Receiving (src/index.js)

Forward platform messages to Claude via C4:

```javascript
import { execFile } from 'child_process';
import { buildC4ReceiveArgs, getC4ReceivePath } from './lib/c4.js';

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
 * @param {string} [sessionGroup] - Group computed by the caller for this message
 */
function sendToC4(source, endpoint, content, onReject, sessionGroup) {
  const args = () => [getC4ReceivePath(), ...buildC4ReceiveArgs({
    source, endpoint, content, sessionGroup,
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

### C4 option compatibility

Each component computes a session group for each message using its own rules
and passes it to `sendToC4` as the optional fifth argument. The template does
not define grouping rules or add a configuration field. An omitted, null, or
empty-string group selects the overall group and omits `--session-group`.

`buildC4ReceiveArgs` appends `--session-group` only when the caller supplies a nonempty group
and `c4ReceiveSupportsOption('--session-group')` returns true. Every call rereads
`c4-receive-options.json` beside the script returned by `getC4ReceivePath()`:
`<ZYLOS_DIR>/.claude/skills/comm-bridge/scripts/c4-receive.js`, with
`<HOME>/zylos` as the root when `ZYLOS_DIR` is unset or empty. Use that same
function for the executed script, as in the example, so the manifest and script
come from the same deployment.

The manifest has an `options` object, for example
`{ "options": { "--channel": { "takesValue": true } } }`.
Only an own key in that object declares support; the helper does not inspect
the option's value. Missing or unreadable files, invalid JSON, and invalid shapes
all mean unsupported. Older installations without a manifest omit optional
arguments. The manifest and script are synchronized and rolled back together.
Neither lookup nor argument construction caches support across calls, so both
the initial send and its retry see the current manifest.

Gate future optional C4 arguments with the same manifest lookup.
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

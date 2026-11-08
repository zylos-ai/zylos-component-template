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
import { sessionGroupFromEndpoint } from './lib/session-group.js';

const TRY_LATER = "Sorry, I couldn't take this message right now. Please try again later.";
const MAYBE_LOST = "Sorry, this message may not have reached me. If you don't get a reply in a few minutes, please send it again.";

function parseC4Response(stdout) {
  if (!stdout) return null;
  try { return JSON.parse(stdout.trim()); } catch { return null; }
}

// error.persisted lists rows Core already stored for this message.
function classifyRejection(response) {
  const persisted = response.error.persisted;
  if (!Array.isArray(persisted)) return 'uncertain';
  return persisted.length > 0 ? 'committed' : 'not_stored';
}

/**
 * Forward a message to Claude via C4 bridge.
 * @param {string} source - Channel name, e.g. "discord"
 * @param {string} endpoint - Chat/channel ID for reply routing
 * @param {string} content - Formatted message string
 * @param {object} [options] - Per-message options
 * @param {function} [options.onReject] - Called once when the agent will not answer:
 *   with a user-facing notice, or with null when Core already stored the message
 *   (clean up typing/reaction only, send nothing)
 */
function sendToC4(source, endpoint, content, { onReject } = {}) {
  const sessionGroup = sessionGroupFromEndpoint(endpoint);
  const args = () => [getC4ReceivePath(), ...buildC4ReceiveArgs({
    source, endpoint, content, sessionGroup,
  })];

  // Core's error text is written for the agent: log it, never send it to users.
  const handleRejection = response => {
    const kind = classifyRejection(response);
    console.warn(`[${source}] C4 rejected (${response.error.code}, ${kind}) [group=${sessionGroup}]: ${response.error.message}`);
    if (onReject) onReject(kind === 'committed' ? null : kind === 'not_stored' ? TRY_LATER : MAYBE_LOST);
  };

  execFile(process.execPath, args(), { encoding: 'utf8', timeout: 30000 }, (error, stdout) => {
    if (!error) {
      console.log(`[${source}] Sent to C4: ${content.substring(0, 50)}...`);
      return;
    }
    const response = parseC4Response(error.stdout || stdout);
    if (response?.ok === false && response.error?.message) return handleRejection(response);
    // Retry once after 2s
    console.warn(`[${source}] C4 send failed, retrying: ${error.message}`);
    setTimeout(() => {
      execFile(process.execPath, args(), { encoding: 'utf8', timeout: 30000 }, (retryError, retryStdout) => {
        if (!retryError) return;
        const retryResponse = parseC4Response(retryError.stdout || retryStdout);
        if (retryResponse?.ok === false && retryResponse.error?.message) return handleRejection(retryResponse);
        console.error(`[${source}] C4 send failed after retry: ${retryError.message}`);
        if (onReject) onReject(MAYBE_LOST);
      });
    }, 2000);
  });
}
```

### C4 option compatibility

The example computes the session group from the endpoint with the component's
own `sessionGroupFromEndpoint` (see [Session groups](#session-groups)) and passes
it to `buildC4ReceiveArgs`. The template constrains the rules but defines no
platform mapping and adds no configuration field. An omitted, null, or
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
The example keeps a single retry after 2 seconds for transport errors and calls
`onReject` immediately for structured rejections. It uses `execFile` with an
argument array.

## Session Groups

With a multi-session Core, each inbound message carries a session group and Core
runs each group as its own agent conversation. The component decides the group;
Core prefixes the component namespace (never add it yourself).

### Mapping rules

Implement `sessionGroupFromEndpoint(endpoint)` in `src/lib/session-group.js`:

1. **Derive the group only from the reply endpoint.** Put every id the mapping
   needs (chat id, topic/thread id) into the endpoint, so the inbound
   `--session-group` and `scripts/session-group.js <endpoint>` always agree.
   Never use display names, titles or config; they change.
2. **One stable platform id per level.** Typical shape: `dm-<id>`,
   `group-<chat id>`, `group-<chat id>:topic-<topic id>`. Split by topic or
   thread only when the platform explicitly marks the message as belonging to
   one (for example Telegram `is_topic_message`); ordinary reply chains stay in
   the group.
3. **Fixed once live.** Changing the rules moves existing conversations into
   new groups and needs a migration plan. Document the table in SKILL.md and
   note platform events that change ids (for example a Telegram group upgraded
   to a supergroup continues in a new group).
4. **Fit Core's syntax by construction.** Name ≤ 95 characters, matching
   `^[A-Za-z0-9][A-Za-z0-9_.:-]*$`. Build names only from ids whose format you
   validate (throw on anything else). Do not truncate or replace characters:
   two conversations must never map to the same name. `isValidSessionGroup` is
   for tests; Core validates again on receive.

### When Core rejects a message

- **Never drop the group and resend to the overall group.** That would mix
  the conversation into another thread.
- **Never show Core's error text to platform users.** It is written for the
  agent and developers; log it with the code and group.
- Classify by `error.persisted` (see the example above): a non-empty array means
  Core already stored the message, so send nothing, do not resend, and only clear
  typing and reaction; an empty array means nothing was stored, so tell the user
  to try again later; no array (or c4-receive failing twice) means unknown, so
  say the message may not have arrived and to resend if there is no reply.

### Lookup script

`scripts/session-group.js <endpoint>` prints the group on stdout and exits 0, or
prints an error on stderr and exits 1. Document it in SKILL.md so the agent can
find the group for a `reply via` endpoint.

### Tests and acceptance

- Replace the `test.todo` in `test/session-group.test.js` with a table covering
  every conversation type, invalid endpoints, and `isValidSessionGroup` on every
  output.
- Live acceptance on a test instance must check both the component's own logs
  and Core's c4.db: messages the component filters out never reach Core, so
  c4.db alone cannot show them.
- Platform quirks found in the reference implementation: in Telegram forum
  topics every message carries `reply_to_message` pointing to the topic's
  creation message; do not quote it as a reply.

Reference implementation: zylos-telegram v0.5.0 (`src/lib/session-group.js`,
`src/lib/c4.js`, SKILL.md "Session Groups").

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
  sendToC4('discord', String(chatId), message, { onReject: (notice) => {
    if (notice) replyToUser(chatId, notice);
  } });
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

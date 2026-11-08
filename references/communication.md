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
 * @param {string} [options.sessionGroup] - Group computed by the caller for this message
 */
function sendToC4(source, endpoint, content, { onReject, sessionGroup } = {}) {
  const args = () => [getC4ReceivePath(), ...buildC4ReceiveArgs({
    source, endpoint, content, sessionGroup,
  })];

  // Core's error text is written for the agent: log it, never send it to users.
  const handleRejection = response => {
    const kind = classifyRejection(response);
    console.warn(`[${source}] C4 rejected (${response.error.code}, ${kind}) [group=${sessionGroup}]: ${response.error.message}`);
    if (onReject) onReject(kind === 'committed' ? null : kind === 'not_stored' ? TRY_LATER : MAYBE_LOST);
  };

  execFile(process.execPath, args(), { encoding: 'utf8' }, (error, stdout) => {
    if (!error) {
      console.log(`[${source}] Sent to C4: ${content.substring(0, 50)}...`);
      return;
    }
    const response = parseC4Response(error.stdout || stdout);
    if (response?.ok === false && response.error?.message) return handleRejection(response);
    // Retry once after 2s
    console.warn(`[${source}] C4 send failed, retrying: ${error.message}`);
    setTimeout(() => {
      execFile(process.execPath, args(), { encoding: 'utf8' }, (retryError, retryStdout) => {
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

Each component computes a session group for each message and passes it to
`sendToC4` as the named `sessionGroup` option (see [Session Groups](#session-groups)).
Each component decides its own partitioning (which conversations get their own
group and which use the overall group); the template prescribes none, ships no
grouping algorithm and adds no configuration field. It only states the Core
contract every mapping must meet. An omitted, null, or
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
argument array and sets no timeout of its own: killing c4-receive after Core
stored the message and then retrying would deliver the message twice.

## Session Groups

With a multi-session Core, each inbound message can carry a session group and
Core runs each group as its own agent conversation. The component chooses the
in-component name; Core prefixes the component namespace (never add it yourself).
Messages sent without a group go to the component's overall group.

### Core contract (required)

Source of truth: zylos-core (1.0 and later) `skills/comm-bridge/scripts/c4-session-group.js`
and `skills/comm-bridge/references/c4-receive.md`.

1. **Syntax.** A nonempty name is at most 95 characters and matches
   `^[A-Za-z0-9][A-Za-z0-9_.:-]*$` (case-sensitive). Core does not convert
   anything. The fixed 95 limit lets a component check names locally before
   calling c4-receive; `isValidSessionGroup` does that check (optional at
   runtime, since Core validates again).
2. **One-to-one.** When platform ids are too long or contain other characters
   (for example WeChat `xxx@chatroom`), map them to compliant values that still
   identify each conversation uniquely: replace characters reversibly, or use a
   short id the component stores locally. Never truncate or hash.
3. **Lookup matches the receiver.** `scripts/session-group.js <endpoint>` must
   print the group the receiver sends for messages from that endpoint. Success:
   the name on stdout and exit 0; empty output with exit 0 means the overall
   group. Failure (invalid endpoint, unknown conversation): message on stderr,
   nothing on stdout, exit 1. A failure must never look like empty output:
   callers such as the scheduler would file the task under the overall group.
4. **Names are fixed once live.** A rule change moves existing conversations
   into new groups, and Core currently has no migration tool. Changing the
   partitioning must be planned together with Core as an explicit migration.

### Partitioning (each component decides)

Which conversations get their own group, and which share the overall group, is
the component's choice. Document it as a table in SKILL.md. Reference example,
zylos-telegram v0.5.0:

| Conversation | Group |
|---|---|
| Private chat | `dm-<chat id>` |
| Group / supergroup | `group<chat id>` (id keeps its minus sign) |
| Forum topic | `group<chat id>:topic-<topic id>` |

Telegram splits by topic only for messages the platform marks as forum-topic
messages (`is_topic_message`); reply chains stay in the group. Every id the
mapping needs is carried in the endpoint, so the lookup needs no stored state.

### Calling the mapping

`sessionGroupFromEndpoint` throws when it cannot map a conversation. The caller
catches it, logs it, clears typing and reaction, and tells the user to try
again later; it never falls back to the overall group:

```javascript
let sessionGroup;
try {
  sessionGroup = sessionGroupFromEndpoint(endpoint);
} catch (err) {
  console.error(`[discord] no session group for ${endpoint}: ${err.message}`);
  if (onReject) onReject(TRY_LATER);
  return;
}
sendToC4('discord', endpoint, message, { onReject, sessionGroup });
```

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

### Tests and acceptance

- Replace the `test.todo` in `test/session-group.test.js` with a table covering
  every conversation type and invalid endpoints; check every nonempty output
  with `isValidSessionGroup`.
- Live acceptance on a test instance must check both the component's own logs
  and Core's c4.db: messages the component filters out never reach Core, so
  c4.db alone cannot show them.
- Platform quirk found in the reference implementation: in a Telegram forum
  topic, a message that is not a reply still carries `reply_to_message`,
  pointing to the topic's creation message; do not quote that as a reply. Real
  replies inside a topic quote the original message as usual.

Reference implementation: zylos-telegram v0.5.0 (`src/lib/session-group.js`,
`src/lib/c4.js`, SKILL.md "Session Groups").

## Message Format

Build the content with `formatMessage()` from `src/lib/format.js`; the full
convention is in [channel-standards.md 11.6](./channel-standards.md#116-message-format-convention-c4-protocol).

```
# Private message
[Discord DM]
<current-message>
alice said: Hello!
</current-message>

# Group message with an attachment
[Discord GROUP:dev-chat]
<current-message>
bob said: @bot check this
</current-message> ---- file: /path/to/file.png
```

Set `CHANNEL_TAG` in `src/lib/format.js` to the platform's short label. The
reply route is appended by C4 when it delivers the message.

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

  const message = formatMessage({ chatType: 'private', userName: username, text });
  sendToC4('discord', String(chatId), message, { onReject: (notice) => {
    if (notice) replyToUser(chatId, notice);
  } });
}
```

## Group Context

Log all group messages, include recent context when @mentioned:

```javascript
logMessage(chatId, { username, text, timestamp });

const message = formatMessage({
  chatType: 'group', groupName, userName: username, text,
  contextMessages: getGroupContext(chatId),  // [{ user_name, text }], oldest first
});
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

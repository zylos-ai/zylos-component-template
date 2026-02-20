# Channel Component Pitfalls & Coding Standards

> Distilled from 16 rounds of Codex review on zylos-telegram v0.2.0 (50+ issues found and fixed).
> Updated 2026-02-20: 6 new patterns added from Lark/Feishu cross-validation audit (path traversal, config watcher, bot self-loop, internal auth, admin validation, lazy-load marking).
> Use this document to audit existing channels and as the foundation for the component template.

---

## 1. Shell Injection & Command Execution

### 1.1 Never Use exec() with User Data

Any user-controlled string (message text, filename, group title, username) in an `exec()` shell command is a critical injection vector.

**Wrong:**
```javascript
exec(`curl -F "document=@${filePath}" ${url}`);
exec(`node send.js "${chatId}" "${chatTitle}"`);
```

**Correct:**
```javascript
execFile('curl', ['-s', '--max-time', '30', '-F', `document=@${filePath}`, url], ...);
execFile('node', [sendPath, chatId, message], { timeout: 35000 }, callback);
```

**Rule:** Every `exec()` with external input → `execFile()` with args array. For filename prefixes from platform API, sanitize: `raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64)`.

### 1.2 Path Traversal in File Downloads

When downloading files from the platform API, the `file_name` field is user-controlled. A filename like `../../etc/passwd` or `../config.json` can write outside the intended directory.

**Wrong:**
```javascript
const filePath = path.join(downloadDir, msg.file_name);
fs.writeFileSync(filePath, buffer);
```

**Correct:**
```javascript
const safeName = path.basename(msg.file_name || 'file').replace(/[^a-zA-Z0-9_.\-]/g, '_');
const filePath = path.join(downloadDir, safeName);
// Double-check: resolved path must still be inside downloadDir
if (!path.resolve(filePath).startsWith(path.resolve(downloadDir) + path.sep)) {
  throw new Error('Path traversal blocked');
}
fs.writeFileSync(filePath, buffer);
```

**Rule:** Always use `path.basename()` on platform-provided filenames, sanitize special characters, and verify the resolved path stays within the target directory.

### 1.3 XML Injection in Message Formatting

User text embedded in `<current-message>`, `<group-context>`, etc. can inject fake XML tags.

**Rule:** All user-controlled strings must pass through `escapeXml()`:
```javascript
export function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}
```

Apply to: message body, username, group name, file path, caption — everything from the platform API.

---

## 2. Authentication & Authorization

### 2.1 isOwner Must Use the User ID, Not the Chat ID

On many platforms, DM chat ID happens to equal the user ID. In groups, chat ID is the group's ID. Using chat ID in `isOwner()` silently works in DMs but always fails in groups.

**Rule:** `isOwner()` and `bindOwner()` must use the sender's user ID (`ctx.from.id` in Telegram), never the chat/channel ID.

**Migration note:** If a v0.1 installation stored a negative group ID as owner, the upgrade hook must reset it to force re-binding.

### 2.2 Policy Bypass: disabled Means disabled

`groupPolicy: disabled` must be an absolute gate. No handler — including owner messages — should bypass it. Owner can always use DM.

**Checklist:**
- `isSmartGroup()` checks `policy === 'disabled'` before per-group config
- `isGroupAllowed()` checks `policy === 'disabled'` before per-group config
- Group handlers don't have special owner-in-disabled-mode paths

### 2.3 Access Controls Must Be Consistent Across All Message Types

If the text handler checks `isSenderAllowed(config, chatId, senderId)`, the photo handler and document handler must also check it. Media handlers are often added later and miss the guards.

**Rule:** Every message type handler (text, photo, document, voice, sticker, video) must apply the same auth chain: `isOwner() || isSenderAllowed()`.

### 2.4 Type Coercion in ID Comparisons

Platform IDs may arrive as numbers from the API but be stored as strings in config. `123 === "123"` is false.

**Rule:** Always normalize both sides: `String(a) === String(b)`.

### 2.5 Bot Self-Message Loop Prevention

The bot must never process its own outgoing messages. On some platforms (Lark, Feishu), webhook events include messages sent by the bot itself. Without a guard, the bot responds to its own replies in an infinite loop.

**Rule:** At the earliest point in the message handler, check if the sender is the bot itself and return immediately:
```javascript
// Early exit: ignore bot's own messages
if (senderId === config.app_id || senderId === config.bot_open_id) return;
```

**Checklist:**
- Webhook handler checks sender against bot's own ID(s)
- Check happens BEFORE any logging or processing (avoid logging self-messages)
- Works for all message types (text, media, system events)

### 2.6 Admin Command Input Validation

Admin commands (`/set-group-policy`, `/set-group-history-limit`, etc.) must validate all parameters. Unvalidated input can corrupt config state.

**Rule:** Every admin command must validate:
```javascript
// Validate enum parameters
const VALID_POLICIES = ['disabled', 'allowlist', 'smart'];
if (!VALID_POLICIES.includes(value)) {
  return reply(`Invalid policy. Valid: ${VALID_POLICIES.join(', ')}`);
}

// Validate numeric parameters with range check
const limit = parseInt(value, 10);
if (isNaN(limit) || limit < 1 || limit > 200) {
  return reply('History limit must be 1-200');
}

// Validate IDs: must be non-empty strings
if (!groupId || typeof groupId !== 'string') {
  return reply('Invalid group ID');
}
```

**Key rules:**
- Enum values: validate against explicit allowlist
- Numeric values: parse, check NaN, enforce min/max range
- IDs: non-empty string validation
- Never write unvalidated user input directly to config

---

## 3. Deadlock & Event Loop Safety

### 3.1 No execFileSync in Server Processes

`execFileSync` blocks the event loop. If the spawned process calls back into the same process (e.g., `send.js` POSTs to the internal recording server), you get a deadlock.

**Rule:** In long-running server processes, use async `execFile()` for any child that may (even transitively) call back.

### 3.2 ensureReplay Must Precede logAndRecord

On cold start, the first message triggers history replay from disk. If `logAndRecord` runs first, the current message is at index 0 and replayed history appends after it — breaking chronological order.

**Rule:** In every handler: `ensureReplay()` → `logAndRecord()` → `getHistory()`. This applies to ALL message types, not just text.

---

## 4. Resource Management

### 4.1 Timeouts on All External I/O

Every external call without a timeout is a silent hang risk.

| Call Type | Timeout Mechanism |
|---|---|
| `exec`/`execFile` | `{ timeout: <ms> }` option |
| `curl` | `--max-time <seconds>` (set ~10% below Node timeout) |
| `fetch` | `AbortController` + `setTimeout` |
| Platform SDK calls | Platform-specific timeout config |

### 4.2 File Descriptor Leak Prevention

Every `fs.openSync` must have `closeSync` in a `finally` block:
```javascript
const fd = fs.openSync(file, 'r');
try {
  fs.readSync(fd, buf, 0, size, offset);
} finally {
  fs.closeSync(fd);
}
```

### 4.3 Graceful Shutdown Must Clear All Handles

Enumerate at startup, clear in shutdown:
- All `setInterval` handles
- All `setTimeout` handles (typing indicators, retries)
- `fs.watch` watchers
- HTTP servers (`.close()`)
- Platform SDK polling (`.stop()`)

```javascript
function cleanup() {
  clearInterval(pollInterval);
  clearInterval(cacheInterval);
  if (watcher) watcher.close();
  for (const [id] of activeIndicators) stopIndicator(id);
  internalServer.close();
}
process.once('SIGINT', () => { cleanup(); sdk.stop('SIGINT'); });
process.once('SIGTERM', () => { cleanup(); sdk.stop('SIGTERM'); });
```

### 4.4 EventEmitters Must Have Error Listeners

`fs.watch`, `http.createServer`, `net.createServer` — all emit `'error'` events. Without a listener, unhandled errors crash the process.

```javascript
watcher.on('error', (err) => {
  console.warn(`[channel] watcher error: ${err.message}`);
  watcher = null;
});
```

---

## 5. Context & History Integrity

### 5.1 Bot Replies Must Be Persisted

If only incoming messages are logged, after a restart Claude sees a conversation with no bot replies — incomplete context.

**Rule:** `send.js` must call `recordOutgoing()` after every successful send, writing the bot's reply to the same log/history system as incoming messages.

### 5.2 ensureReplay in Every Handler Type

Not just the text handler. Photo, document, voice, sticker — any handler that calls `sendToC4` in a group needs `ensureReplay()` first. A cold-start scenario where the first message is a photo must still have full context.

### 5.3 Replay Failure Must Not Permanently Disable Replay

If log replay fails (I/O error), don't mark the key as replayed. Leave it un-replayed so the next message retries.

```javascript
try {
  // read log, populate history
  _replayedKeys.add(historyKey); // ONLY on success
} catch (err) {
  // Don't add to _replayedKeys — allow retry
}
```

### 5.4 Per-Group Limits in Replay

`ensureReplay` must use the per-group `historyLimit`, not the global default. Groups configured with a larger context window should get their full history replayed on cold start.

### 5.5 Lazy-Load Marking Must Follow Completion

When lazy-loading containers (groups, threads), don't mark the container as loaded before processing completes. If processing fails midway, the container is permanently skipped.

**Wrong:**
```javascript
_lazyLoadedContainers.add(containerId);  // ← marked BEFORE processing
for (const item of items) {
  await process(item);  // if this fails, retry is disabled
}
```

**Correct:**
```javascript
let allProcessed = true;
for (const item of items) {
  try {
    await process(item);
  } catch (err) {
    log(`Failed to process ${item.id}: ${err.message}`);
    allProcessed = false;
  }
}
if (allProcessed) {
  _lazyLoadedContainers.add(containerId);  // ← marked AFTER success
}
```

**Rule:** Only mark a container as loaded after all items in the batch have been successfully processed. Partial failure must allow retry on next trigger.

### 5.6 Outgoing Text Truncation

Long bot replies can exceed the internal server's body limit (413). Truncate client-side before POSTing to `recordOutgoing`.

---

## 6. Config Integrity & Atomic Writes

### 6.1 Atomic Write Pattern (Mandatory)

Direct `writeFileSync` to the target path risks partial writes on crash/kill.

**Rule:** All config and state writes must use tmp+rename:
```javascript
export function saveConfig(config) {
  const tmp = CONFIG_PATH + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
    fs.renameSync(tmp, CONFIG_PATH);  // atomic on POSIX
    return true;
  } catch (err) {
    console.error('[channel] Failed to save config:', err.message);
    try { fs.unlinkSync(tmp); } catch {}
    return false;
  }
}
```

Apply to: config.json, user-cache.json, any persistent state file.

### 6.2 Check saveConfig Return Value

Every `saveConfig()` call site must check the return. Silent persistence failure means in-memory state diverges from disk.

### 6.3 Config Watcher Must Handle Atomic Rename Events

When using atomic writes (6.1), `fs.watch` fires a `rename` event — not `change`. If the watcher only listens for `change`, config hot-reload silently breaks after the first atomic save.

**Wrong:**
```javascript
fs.watch(CONFIG_PATH, (eventType) => {
  if (eventType === 'change') reloadConfig();  // misses atomic rename!
});
```

**Correct:**
```javascript
fs.watch(CONFIG_PATH, (eventType) => {
  if (eventType === 'change' || eventType === 'rename') {
    // Debounce: atomic rename fires multiple events
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      if (fs.existsSync(CONFIG_PATH)) reloadConfig();
    }, 100);
  }
});
```

**Key rules:**
- Watch for both `change` AND `rename` events
- Debounce with a short timer (100ms) — atomic rename can fire 2-3 events rapidly
- Check `existsSync` before reload — during rename, the file briefly doesn't exist
- Add an error listener (see §4.4)

### 6.4 Config Race in Async Handlers

Async handlers (photo, document) should use `const config = loadConfig()` locally, not capture a module-level mutable reference.

---

## 7. HTTP Internal Server

### 7.1 EADDRINUSE Handling with Retry Limit

The internal server must handle port conflicts with bounded retries (e.g., max 5).

### 7.2 Double-Response Race Prevention

When the body exceeds the size limit (413 path), set a flag to prevent the `end` handler from also responding. Always check `res.headersSent` before writing headers.

### 7.3 Body Assembly with Buffer.concat

```javascript
// WRONG: chunks are Buffers, joining as strings corrupts multi-byte chars
const body = chunks.join('');

// CORRECT:
const body = Buffer.concat(chunks).toString('utf8');
```

### 7.4 Port Must Come from Config

`send.js` must read the internal port from config, not hardcode it.

### 7.5 req.on('error') Handler

After `req.destroy()`, Node emits `ERR_STREAM_DESTROYED`. Add: `req.on('error', () => {})`.

### 7.6 Internal Endpoint Authentication

The internal HTTP server (used by `send.js` for `recordOutgoing`) must not be accessible from the network. Using `app_id` as a token is insufficient — it's not a secret.

**Rule:** Internal endpoints must use defense in depth:
```javascript
// 1. Bind to localhost only (primary defense)
server.listen(port, '127.0.0.1');

// 2. Use a dedicated random secret, not app_id
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || crypto.randomUUID();

// 3. Validate on every internal request
app.use('/internal', (req, res, next) => {
  if (req.headers['x-internal-token'] !== INTERNAL_SECRET) {
    return res.status(403).end();
  }
  next();
});
```

**Key rules:**
- Bind internal server to `127.0.0.1`, never `0.0.0.0`
- Token must be a dedicated random secret, not a reused app credential
- If `send.js` runs as a child process, pass the secret via environment variable

---

## 8. Typing Indicator & Reaction Lifecycle

### 8.1 Reactions and Typing Are a Pair

They start together and must stop together in ALL paths:
- Success path (reply sent)
- Rejection path (C4 reject / error)
- Timeout path (120s auto-sweep)

**Every onReject callback must:**
```javascript
onReject: (errMsg) => {
  stopTypingIndicator(correlationId);
  clearReaction(chatId, messageId);
  sendErrorReply(chatId, errMsg, threadId);
}
```

### 8.2 clearReaction Must Use the Shared API Helper

Don't duplicate API call logic. All platform API calls should go through one helper with consistent proxy, timeout, and error handling.

---

## 9. Message Content Handling

### 9.1 Optional Platform API Fields

Never assume optional fields are present. Common traps:

| Field | Can Be Absent | Fallback |
|---|---|---|
| `document.file_name` | Voice, some attachments | `'file'` |
| `from.username` | Users with no username | `from.first_name` |
| `message.caption` | Text-only messages | `''` |
| `message.message_thread_id` | Non-forum messages | `null` |

### 9.2 @Mention Detection Must Use Entities

String search (`text.includes('@botname')`) matches partial usernames. Use the platform's structured entity/mention data.

### 9.3 Bot Mention Replacement Must Handle Captions

`replaceBotMention()` must read both `text`/`entities` (for text messages) and `caption`/`caption_entities` (for media messages).

Process entities in reverse offset order — replacing earlier mentions shifts byte positions of later ones.

### 9.4 Thread ID in All Replies Including Errors

In forum/topic platforms, omitting the thread ID sends the reply to the default topic. The user never sees it. Every `sendMessage` and error reply must include the thread ID.

### 9.5 splitMessage Must Skip Empty Chunks

After trimming at split boundaries, a chunk may become empty. `sendMessage(chatId, '')` fails on most platforms. Guard: `if (chunk.length > 0) chunks.push(chunk)`.

---

## 10. Data Boundaries

### 10.1 Don't Log Messages from Non-Authorized Contexts

Only log and record messages from groups/chats where the bot is authorized to operate. Recording from non-allowed groups is a data boundary violation.

---

## 11. Message Flow Templates

These are the standard message handling patterns every channel must implement. The three chat types (private/group/thread) have distinct logic but share common infrastructure.

### 11.1 Architecture Overview

```
Platform SDK/Webhook
       │
       ▼
  ┌─────────────┐
  │  bot.js     │  Message router: determines chat type, auth, response mode
  │  (entry)    │
  └──────┬──────┘
         │
    ┌────┴────┐
    ▼         ▼
 Private    Group/Supergroup
    │         │
    │    ┌────┴────┐
    │    ▼         ▼
    │  Mention   Smart Mode
    │  Mode      (auto-evaluate)
    │    │         │
    ▼    ▼         ▼
  ┌─────────────────────┐
  │  Common Pipeline     │
  │  1. ensureReplay()   │  ← cold-start history from disk
  │  2. logAndRecord()   │  ← persist incoming message
  │  3. formatMessage()  │  ← XML-structured context
  │  4. sendToC4()       │  ← dispatch to Claude
  │  5. onReject cleanup │  ← typing + reaction cleanup
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  send.js            │  Outbound: Claude → Platform
  │  1. Parse endpoint   │  ← chatId|msg:X|thread:Y
  │  2. Split message    │  ← platform char limit
  │  3. Send via API     │  ← with retry + timeout
  │  4. recordOutgoing() │  ← persist bot reply
  │  5. markTypingDone() │  ← signal typing complete
  └─────────────────────┘
```

### 11.2 Private Chat (DM) Flow

Private chat is the simplest flow. One user, one conversation, no group policy.

```
Message In ──► Auth Check ──► Log ──► React ──► Typing ──► Format ──► C4
                  │
                  ├─ No owner? → bindOwner()
                  ├─ Not authorized? → reject ("bot is private")
                  └─ Authorized → proceed
```

**Template (pseudocode):**
```javascript
function handlePrivateMessage(ctx, messageType) {
  const config = loadConfig();
  const chatId = ctx.chat.id;
  const messageId = ctx.message.message_id;
  const threadId = null; // no threads in DM (some platforms may differ)
  const userName = resolveUserName(ctx.from);

  // 1. Auth
  if (!hasOwner(config)) bindOwner(config, ctx);
  if (!isAuthorized(config, ctx)) {
    ctx.reply('Sorry, this bot is private.').catch(() => {});
    return;
  }

  // 2. Media gate (for photo/document handlers)
  if (messageType !== 'text' && !config.features.download_media) {
    ctx.reply('Media download is disabled.').catch(() => {});
    return;
  }

  // 3. Log incoming
  const logEntry = buildLogEntry(ctx, userName, messageType);
  logAndRecord(chatId, logEntry, config);

  // 4. Download media if applicable
  let mediaPath = null;
  if (messageType === 'photo') mediaPath = await downloadPhoto(ctx);
  if (messageType === 'document') mediaPath = await downloadDocument(ctx);

  // 5. React + typing
  const endpoint = buildEndpoint(chatId, { messageId });
  const correlationId = `${chatId}:${messageId}`;
  setReaction(chatId, messageId, '👀');     // acknowledge receipt
  startTypingIndicator(chatId, correlationId);

  // 6. Format + send
  const msg = formatMessage({
    chatType: 'private',
    userName,
    text: extractText(ctx, messageType),
    quotedContent: getReplyToContext(ctx),
    mediaPath
  });

  sendToC4('channel-name', endpoint, msg, (errMsg) => {
    // 7. Cleanup on reject
    stopTypingIndicator(correlationId);
    clearReaction(chatId, messageId);
    ctx.reply(errMsg).catch(() => {});
  });
}
```

**Key rules:**
- `bindOwner()` must use `ctx.from.id` (user ID), not `ctx.chat.id`
- Auth is checked BEFORE any processing/download
- Every `sendToC4` has an `onReject` that cleans up typing + reaction

### 11.3 Group Chat Flow

Group chat adds: group policy, sender allowlist, mention detection, context history, and the distinction between "log only" vs "respond".

```
Message In ──► Group Policy Gate ──► Sender Auth ──► Response Decision
                    │                     │                │
                    ├─ disabled? → drop    │          ┌─────┴──────┐
                    ├─ not allowed? → drop │          ▼            ▼
                    └─ allowed → continue  │    Should Respond  Log Only
                                           │          │            │
                                     ┌─────┴────┐     ▼            ▼
                                     ▼           ▼   React+C4    Silent
                                   Owner     Allowed
                                   (bypass   sender
                                   allowFrom)
```

**Template (pseudocode):**
```javascript
function handleGroupMessage(ctx, messageType) {
  const config = loadConfig();
  const chatId = ctx.chat.id;
  const messageId = ctx.message.message_id;
  const threadId = ctx.message.message_thread_id || null;  // ← CRITICAL for forums
  const userName = resolveUserName(ctx.from);

  const isAllowed = isGroupAllowed(config, chatId);
  const isSmart = isSmartGroup(config, chatId, threadId);
  const mentioned = isBotMentioned(ctx);          // entity-based, not string search
  const senderIsOwner = isOwner(config, ctx);      // uses ctx.from.id
  const policy = config.groupPolicy || 'allowlist';

  // Gate 1: Group must be configured
  if (!isAllowed && !isSmart) return;

  // Gate 2: Replay history BEFORE logging (chronological order)
  ensureReplay(getHistoryKey(chatId, threadId), config);

  // Gate 3: Log for context (only from allowed groups)
  const logEntry = buildLogEntry(ctx, userName, messageType);
  if (isAllowed) logAndRecord(chatId, logEntry, config);

  // Gate 4: Determine if bot should respond
  const shouldRespond =
    isSmart ||                                         // smart mode: always evaluate
    (isAllowed && mentioned) ||                        // mention mode: @bot required
    (policy !== 'disabled' && senderIsOwner && mentioned); // owner can trigger in any non-disabled group

  if (!shouldRespond) return;

  // Gate 5: Sender auth (owner bypasses allowFrom)
  if (!senderIsOwner && !isSenderAllowed(config, chatId, ctx.from.id)) return;

  // Gate 6: Log owner messages from non-allowed groups only when responding
  if (!isAllowed && senderIsOwner) {
    logAndRecord(chatId, logEntry, config);
  }

  // === From here: same pipeline as private, plus group context ===

  const historyKey = getHistoryKey(chatId, threadId);
  const contextMessages = getHistory(historyKey, messageId, config);
  const groupName = getGroupName(config, chatId, ctx.chat.title);
  const cleanText = mentioned ? replaceBotMention(ctx) : extractText(ctx, messageType);

  const endpoint = buildEndpoint(chatId, { messageId, threadId });
  const correlationId = `${chatId}:${messageId}`;
  const sendReplyOpts = threadId ? { message_thread_id: threadId } : {};  // ← CRITICAL

  // Smart mode without @mention: reaction only, no typing indicator
  const smartNoMention = isSmart && !mentioned;
  setReaction(chatId, messageId, '👀');
  if (!smartNoMention) startTypingIndicator(chatId, correlationId, threadId);

  const msg = formatMessage({
    chatType: ctx.chat.type,
    groupName,
    userName,
    text: cleanText,
    contextMessages,
    quotedContent: getReplyToContext(ctx),
    mediaPath: null, // or downloaded path for media handlers
    isThread: !!threadId,
    smartHint: smartNoMention
  });

  sendToC4('channel-name', endpoint, msg, (errMsg) => {
    stopTypingIndicator(correlationId);
    clearReaction(chatId, messageId);
    sendMessage(chatId, errMsg, sendReplyOpts).catch(() => {});  // ← includes threadId
  });
}
```

**Key rules:**
- `policy === 'disabled'` must be checked in `isGroupAllowed()` and `isSmartGroup()` — not in the handler
- `ensureReplay()` → `logAndRecord()` → `getHistory()` — order is mandatory
- `threadId` in ALL replies including error replies
- Smart mode sends `smartHint` so Claude can decide to respond or `[SKIP]`
- Owner bypasses `allowFrom` but NOT `disabled` policy

### 11.4 Thread / Forum Topic Flow

Threads (Telegram forum topics, Lark thread replies, Discord threads) add a sub-conversation layer inside a group.

```
Group ──► Thread ID present? ──► Yes: historyKey = "chatId:threadId"
                                      logFile = "chatId_threadId.jsonl"
                                      reply includes thread ID
                                 No:  historyKey = "chatId"
                                      logFile = "chatId.jsonl"
                                      reply has no thread ID
```

**Critical implementation details:**

```javascript
// historyKey: determines which in-memory history bucket AND which log file
export function getHistoryKey(chatId, threadId) {
  chatId = String(chatId);
  return threadId ? `${chatId}:${threadId}` : chatId;
}

// Log file: derived from historyKey (colon replaced with underscore)
export function historyKeyToLogFile(historyKey) {
  return historyKey.replace(/:/g, '_') + '.jsonl';
}
```

**Thread vs non-thread differences:**

| Aspect | No Thread | With Thread |
|---|---|---|
| History key | `chatId` | `chatId:threadId` |
| Log file | `chatId.jsonl` | `chatId_threadId.jsonl` |
| Context tag | `<group-context>` | `<thread-context>` |
| Reply option | `{}` | `{ message_thread_id: threadId }` |
| Typing indicator | Group-level | Thread-level (if platform supports) |
| Smart mode check | `isSmartGroup(config, chatId)` | `isSmartGroup(config, chatId, threadId)` |

**Common thread pitfalls:**
1. **Error replies without threadId** — user never sees the error (goes to default topic)
2. **Single log file for all threads** — cross-thread context leaks; users in Topic A see messages from Topic B
3. **Typing indicator in wrong thread** — `sendChatAction` without `message_thread_id` shows typing in the general channel
4. **Thread ID is optional** — even in forum groups, some system messages have no `thread_id`. Always use `|| null`, never assume present
5. **Smart mode per-thread** — a forum group might want smart mode in some topics. The config check should accept `threadId` as a parameter for future per-topic override

### 11.5 Smart Mode Logic

Smart mode is a special group mode where the bot evaluates every message for relevance, rather than requiring `@mention`.

```
Message In ──► isSmartGroup? ──► Yes ──► @mentioned?
                   │                       │       │
                   No → (handled by        Yes     No
                         mention flow)      │       │
                                           ▼       ▼
                                        Download  Forward text only
                                        media     (no download)
                                        + full    + smart hint
                                        response  + [SKIP] option
```

**Template for smart hint in formatMessage:**
```javascript
if (smartHint) {
  parts.push(`<smart-mode>
Decide whether to respond. Do NOT reply if: the message is unrelated to you,
just casual chat, or doesn't need your input. Only reply when:
1) someone asks a question you can help with,
2) discussing technical topics you know well,
3) someone clearly needs assistance.
When uncertain, prefer NOT to reply. Reply with exactly [SKIP] to stay silent.
</smart-mode>`);
}
```

**send.js must handle [SKIP]:**
```javascript
// In send.js, after receiving Claude's reply:
if (text.trim() === '[SKIP]') {
  // Don't send anything to the user
  markTypingDone(correlationId);  // but DO clear the typing indicator
  clearReaction(chatId, messageId); // and clear the reaction
  return;
}
```

**Key rules:**
- Smart mode messages without `@mention` get reaction but NO typing indicator (since Claude might [SKIP])
- `[SKIP]` must still trigger cleanup (typing + reaction)
- Media in smart mode without `@mention`: forward metadata only (no download), let Claude decide if it's relevant
- Media in smart mode WITH `@mention`: download and process normally

### 11.6 Message Format Convention (C4 Protocol)

All channels must format messages consistently for C4:

```
[CHANNEL_TAG] userName said: <context>...</context><current-message>...</current-message> ---- file: /path
                                                                                          ---- reply via: node send.js "endpoint"
```

**Tag format by chat type:**
- Private: `[TG DM]`, `[Lark DM]`, `[Discord DM]`
- Group: `[TG GROUP:groupName]`, `[Lark GROUP:groupName]`
- The tag tells Claude where the message came from

**Endpoint format (structured):**
```
chatId|msg:messageId|req:correlationId|thread:threadId
```
- `chatId`: platform chat/channel ID
- `msg`: trigger message ID (for reaction cleanup)
- `req`: correlation ID (for typing indicator matching)
- `thread`: thread/topic ID (for reply routing)
- All fields after chatId are optional key:value pairs
- `send.js` parses this with `parseEndpoint()`

**XML structure in message body:**
```xml
[CHANNEL TAG] userName said: <group-context>
[alice]: previous message 1
[bob]: previous message 2
</group-context>

<replying-to>
[originalSender]: quoted message content
</replying-to>

<smart-mode>
... evaluation instructions ...
</smart-mode>

<current-message>
The actual message text goes here
</current-message>
```

- `<group-context>` or `<thread-context>`: recent history (from `getHistory()`)
- `<replying-to>`: reply/quote context (if user replied to a specific message)
- `<smart-mode>`: only present when `smartHint: true`
- `<current-message>`: always present, always last
- All user-controlled content inside tags must be `escapeXml()`'d

### 11.7 Media Handling Matrix

Different chat types handle media differently:

| Scenario | Download? | Forward to C4? | Typing? |
|---|---|---|---|
| DM: photo/file | Yes (if enabled) | Yes with file path | Yes |
| Group mention: photo/file with @bot in caption | Yes (if enabled) | Yes with file path | Yes |
| Group mention: photo/file without @bot | Log metadata only | No | No |
| Smart mode: photo/file with @bot | Yes (if enabled) | Yes with file path | Yes |
| Smart mode: photo/file without @bot | No download | Yes (metadata + smart hint) | No |

**Metadata-only forwarding** (smart mode without @mention):
```javascript
// Include file_id so Claude can request download later if needed
const photoInfo = `[photo, file_id: ${fileId}, msg_id: ${messageId}]`;
const msg = formatMessage({
  text: caption ? `${caption}\n${photoInfo}` : `[sent a photo]\n${photoInfo}`,
  mediaPath: null,  // no download
  smartHint: true
});
```

---

## Pre-Commit Checklist for New Channel Components

- [ ] All `exec()` with external input → `execFile()` with args array
- [ ] Platform file names sanitized with `path.basename()` + boundary check
- [ ] All user strings in message formatting pass through `escapeXml()`
- [ ] `isOwner()` uses user ID, not chat/channel ID
- [ ] `groupPolicy: disabled` is an absolute gate, no bypass
- [ ] Auth checks (isOwner, isSenderAllowed) applied to ALL message types
- [ ] Bot self-message loop prevention (sender !== bot ID)
- [ ] ID comparisons use `String()` normalization on both sides
- [ ] Admin commands validate all parameters (enum, range, type)
- [ ] No `execFileSync` in server processes for callbacks
- [ ] `ensureReplay()` → `logAndRecord()` → `getHistory()` order in every handler
- [ ] `saveConfig()` uses atomic tmp+rename; return value checked
- [ ] Config watcher handles both `change` and `rename` events
- [ ] Bot replies persisted via `recordOutgoing()`
- [ ] Replay failure doesn't permanently disable replay
- [ ] Lazy-load marking only after all items processed successfully
- [ ] All exec/execFile/fetch/curl have explicit timeouts
- [ ] `fs.openSync` has `closeSync` in `finally` block
- [ ] Shutdown clears all intervals, watchers, servers, indicators
- [ ] EventEmitters have error listeners
- [ ] Internal server handles EADDRINUSE with bounded retries
- [ ] Internal endpoint uses dedicated secret, bound to localhost
- [ ] Body assembled with `Buffer.concat().toString('utf8')`
- [ ] Internal port read from config, not hardcoded
- [ ] onReject clears typing + reaction + sends error reply
- [ ] Optional platform fields have fallback values
- [ ] @mention detection uses structured entities
- [ ] replaceBotMention handles both text and caption
- [ ] Thread ID included in all replies and error replies
- [ ] splitMessage skips empty chunks
- [ ] No logging from non-authorized contexts

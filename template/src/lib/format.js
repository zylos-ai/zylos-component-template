/**
 * Inbound message assembly for C4 (communication components).
 *
 * Same block structure as zylos-lark and zylos-telegram. Fallbacks (e.g.
 * GROUP:unknown, [] for a missing sender) follow zylos-lark; the call signature
 * follows zylos-telegram. The smart-mode text is the standard text in
 * channel-standards.md 11.6, which neither component uses yet. Layout:
 *
 *   [<TAG> DM]                       or  [<TAG> GROUP:<group name>]
 *   <group-context> | <thread-context>   optional, recent history
 *   <replying-to>                         optional, quoted message
 *   <smart-mode>                          optional, smart-mode groups only
 *   <current-message>
 *   <user name> said: <text>
 *   </current-message> ---- file: <path>  file suffix optional
 *
 * C4 appends the reply route when it delivers the message. Every
 * platform-supplied string is escaped.
 */

/** Short platform label used in the source line, e.g. "TG", "Lark". */
export const CHANNEL_TAG = '{{COMPONENT_TITLE}}';

export const SMART_MODE_HINT = "Decide whether to respond. Do NOT reply if: the message is unrelated to you, "
  + "just casual chat, or doesn't need your input. Only reply when: 1) someone asks a question you can help with, "
  + '2) the discussion is on a topic you can substantially help with, 3) someone clearly needs assistance. '
  + 'When uncertain, prefer NOT to reply. Reply with exactly [SKIP] to stay silent.';

/**
 * Escape text so platform content cannot open or close tags.
 * @param {*} text
 * @returns {string}
 */
export function escapeXml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

/**
 * @typedef {object} ContextEntry
 * @property {string} [message_id]
 * @property {string} [user_name]
 * @property {string} [user_id]
 * @property {string} text
 */

/**
 * Build the content passed to c4-receive.
 * @param {object} opts
 * @param {string} opts.chatType - Only 'private' is a direct message; any other
 *   value (group, supergroup, p2p, ...) is formatted as a group. Map the
 *   platform's DM type to 'private' before calling.
 * @param {string} [opts.groupName] - Group display name (group chats)
 * @param {string} opts.userName - Sender display name
 * @param {string} opts.text - Message text, bot mention already stripped
 * @param {ContextEntry[]|null} [opts.contextMessages] - Recent history, oldest first; null means none
 * @param {boolean} [opts.isThread] - History comes from a thread/topic
 * @param {string} [opts.threadRootId] - message_id of the thread's first message, marked as <thread-root>
 * @param {{ sender: string, text: string }|null} [opts.quotedContent] - Message being replied to;
 *   omit it when it only repeats the thread root already in the context
 * @param {boolean} [opts.smartHint] - Smart-mode group message without a mention
 * @param {string|null} [opts.mediaPath] - Downloaded attachment path
 * @returns {string}
 */
export function formatMessage({
  chatType, groupName, userName, text,
  contextMessages = [], isThread = false, threadRootId = null,
  quotedContent = null, smartHint = false, mediaPath = null,
}) {
  const source = chatType === 'private'
    ? `[${CHANNEL_TAG} DM]`
    : `[${CHANNEL_TAG} GROUP:${escapeXml(groupName || 'unknown')}]`;
  const parts = [`${source}\n`];

  if (contextMessages?.length > 0) {
    const tag = isThread ? 'thread-context' : 'group-context';
    const lines = contextMessages.map(m => {
      const line = `[${escapeXml(m.user_name || m.user_id)}]: ${escapeXml(m.text)}`;
      return threadRootId && m.message_id === threadRootId ? `<thread-root>\n${line}\n</thread-root>` : line;
    });
    parts.push(`<${tag}>\n${lines.join('\n')}\n</${tag}>\n\n`);
  }

  if (quotedContent) {
    parts.push(`<replying-to>\n[${escapeXml(quotedContent.sender || 'unknown')}]: ${escapeXml(quotedContent.text)}\n</replying-to>\n\n`);
  }

  if (smartHint) parts.push(`<smart-mode>\n${SMART_MODE_HINT}\n</smart-mode>\n\n`);

  parts.push(`<current-message>\n${escapeXml(userName)} said: ${escapeXml(text)}\n</current-message>`);

  let message = parts.join('');
  if (mediaPath) message += ` ---- file: ${escapeXml(mediaPath)}`;
  return message;
}

/**
 * Session-group mapping for zylos-core multi-session mode.
 *
 * The component decides which conversations get their own session group and
 * which use the overall group (empty string). Whatever the partitioning, it must
 * meet the Core contract in zylos-component-template references/communication.md
 * "Session Groups": Core-valid names, one-to-one with conversations, and
 * `scripts/session-group.js <endpoint>` matching the receiver. Names are fixed
 * once live: Core has no migration tool, so changing the partitioning must be
 * planned with Core. Core prefixes the component
 * namespace; never add it here.
 */

/** Core's limits for the name a component passes (Core adds `<namespace>:`). */
export const SESSION_GROUP_MAX_LENGTH = 95;
export const SESSION_GROUP_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

/**
 * Whether Core would accept this nonempty name. Use it in mapping tests, and
 * optionally before calling c4-receive (Core validates again).
 * @param {string} name
 * @returns {boolean}
 */
export function isValidSessionGroup(name) {
  return typeof name === 'string' && name.length <= SESSION_GROUP_MAX_LENGTH
    && SESSION_GROUP_PATTERN.test(name);
}

/**
 * Derive the session group for a conversation from its reply endpoint.
 * TODO: implement this platform's partitioning (document it in SKILL.md).
 * @param {string} endpoint - Reply endpoint, e.g. "12345|msg:6|thread:7"
 * @returns {string} Group name without namespace; '' for the overall group
 * @throws {Error} When the conversation cannot be mapped (never return '' for that)
 */
export function sessionGroupFromEndpoint(endpoint) {
  throw new Error('sessionGroupFromEndpoint not implemented');
}

/**
 * Session-group mapping for zylos-core multi-session mode.
 *
 * Each conversation (DM, group, thread/topic) maps to one session group, so
 * Core gives it its own agent thread. The mapping must be derived only from the
 * reply endpoint: the inbound `--session-group` value and
 * `scripts/session-group.js <endpoint>` then always agree.
 * See references/communication.md "Session groups" in zylos-component-template.
 *
 * Rules are fixed once live: changing them moves existing conversations into
 * new groups and needs a migration. Core prefixes the component namespace;
 * never add it here.
 */

/** Core's limits for the name a component passes (Core adds `<namespace>:`). */
export const SESSION_GROUP_MAX_LENGTH = 95;
export const SESSION_GROUP_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

/**
 * Whether Core would accept this name. For tests of the mapping; Core
 * validates again on receive, so do not duplicate this check at runtime.
 * @param {string} name
 * @returns {boolean}
 */
export function isValidSessionGroup(name) {
  return typeof name === 'string' && name.length <= SESSION_GROUP_MAX_LENGTH
    && SESSION_GROUP_PATTERN.test(name);
}

/**
 * Derive the session group from an endpoint string.
 * TODO: implement this platform's rules, for example
 *   private chat -> dm-<user or chat id>
 *   group        -> group-<chat id>
 *   thread/topic -> group-<chat id>:topic-<topic id>
 * Use only stable platform ids found in the endpoint, never display names.
 * @param {string} endpoint - Reply endpoint, e.g. "12345|msg:6|thread:7"
 * @returns {string} Group name (without namespace)
 * @throws {Error} When the endpoint has no valid chat id
 */
export function sessionGroupFromEndpoint(endpoint) {
  throw new Error('sessionGroupFromEndpoint not implemented');
}

#!/usr/bin/env node
/**
 * Print the session group for a reply endpoint (communication components).
 * Usage: node scripts/session-group.js <endpoint>
 * Success: group name on stdout, exit 0; empty output means the overall group.
 * Failure: message on stderr, nothing on stdout, exit 1.
 */
import { sessionGroupFromEndpoint } from '../src/lib/session-group.js';

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node scripts/session-group.js <endpoint>');
  process.exit(1);
}
try {
  const group = sessionGroupFromEndpoint(args[0]);
  if (group) process.stdout.write(`${group}\n`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

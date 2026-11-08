import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isValidSessionGroup } from '../src/lib/session-group.js';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '../scripts/session-group.js');

test('accepts names Core accepts', () => {
  for (const name of ['dm-8101553026', 'group-1001234567890:topic-42', 'a', 'A.b_c:d-e', 'x'.repeat(95)]) {
    assert.equal(isValidSessionGroup(name), true, name);
  }
});

test('rejects names Core rejects', () => {
  for (const name of ['', '-group', ':topic', '_a', 'a b', 'a/b', 'dm-é', 'x'.repeat(96), null, 42]) {
    assert.equal(isValidSessionGroup(name), false, String(name));
  }
});

test('CLI requires exactly one endpoint argument', () => {
  for (const args of [[], ['a', 'b']]) {
    assert.throws(() => execFileSync(process.execPath, [script, ...args], { stdio: 'pipe' }),
      err => err.status === 1 && /Usage:/.test(err.stderr.toString()));
  }
});

test('CLI failure exits 1 with nothing on stdout, never as empty output', () => {
  assert.throws(() => execFileSync(process.execPath, [script, ''], { stdio: 'pipe' }),
    err => err.status === 1 && err.stdout.toString() === '' && /Error:/.test(err.stderr.toString()));
});

// Replace with this platform's mapping table: every conversation type maps to its
// group ('' for the overall group, otherwise isValidSessionGroup), and invalid
// endpoints throw (CLI exit 1).
test.todo('maps each conversation type to its session group');

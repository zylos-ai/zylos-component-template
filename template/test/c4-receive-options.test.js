import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { c4ReceiveSupportsOption, getC4ReceivePath } from '../src/lib/c4.js';
import { c4Fixture } from './helpers/c4-fixture.js';

test('missing manifest means unsupported', t => {
  c4Fixture(t);
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
});

test('unreadable manifest means unsupported until permissions are restored', t => {
  const fixture = c4Fixture(t);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  const mode = fs.statSync(fixture.manifest).mode & 0o777;
  fs.chmodSync(fixture.manifest, 0o000);
  try {
    let error;
    try { fs.readFileSync(fixture.manifest, 'utf8'); } catch (cause) { error = cause; }
    if (!error) {
      t.skip('File permissions are bypassed by this runner');
      return;
    }
    assert.equal(error.code, 'EACCES');
    assert.equal(c4ReceiveSupportsOption('--session-group'), false);
  } finally {
    fs.chmodSync(fixture.manifest, mode);
  }
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
});

test('invalid JSON means unsupported', t => {
  const fixture = c4Fixture(t);
  fs.writeFileSync(fixture.manifest, '{');
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
});

test('invalid manifest and options shapes mean unsupported', t => {
  const fixture = c4Fixture(t);
  for (const value of [null, [], true, 1, 'text', {},
    { options: null }, { options: [] }, { options: true }, { options: 1 }, { options: 'text' }]) {
    fs.writeFileSync(fixture.manifest, JSON.stringify(value));
    assert.equal(c4ReceiveSupportsOption('--session-group'), false, JSON.stringify(value));
  }
  fixture.writeOptions([{ takesValue: true }]);
  assert.equal(c4ReceiveSupportsOption('0'), false);
});

test('only own option keys declare support', t => {
  const fixture = c4Fixture(t);
  fixture.writeOptions({ '--channel': { takesValue: true }, '--no-reply': { takesValue: false } });
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
  assert.equal(c4ReceiveSupportsOption('--channel'), true);
  assert.equal(c4ReceiveSupportsOption('--no-reply'), true);
  assert.equal(c4ReceiveSupportsOption('toString'), false);
  assert.equal(c4ReceiveSupportsOption('constructor'), false);
  fixture.writeOptions({ toString: { takesValue: false } });
  assert.equal(c4ReceiveSupportsOption('toString'), true);
});

test('option values do not affect support', t => {
  const fixture = c4Fixture(t);
  for (const value of [{ takesValue: true }, { takesValue: false }, null, false, 0, '', []]) {
    fixture.writeOptions({ '--session-group': value });
    assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  }
});

test('every lookup observes added and removed options and files', t => {
  const fixture = c4Fixture(t);
  fixture.writeOptions({});
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  fixture.writeOptions({});
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  fs.unlinkSync(fixture.manifest);
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
});

test('manifest follows the executed script across explicit and home roots', t => {
  const fixture = c4Fixture(t);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  assert.equal(getC4ReceivePath(), fixture.script);
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  const homeScript = path.join(fixture.home, 'zylos/.claude/skills/comm-bridge/scripts/c4-receive.js');
  const homeManifest = path.join(path.dirname(homeScript), 'c4-receive-options.json');
  fs.mkdirSync(path.dirname(homeManifest), { recursive: true });
  fs.writeFileSync(homeManifest, JSON.stringify({ options: {} }));
  for (const root of [undefined, '']) {
    if (root === undefined) delete process.env.ZYLOS_DIR;
    else process.env.ZYLOS_DIR = root;
    assert.equal(getC4ReceivePath(), homeScript);
    assert.equal(c4ReceiveSupportsOption('--session-group'), false);
  }
  fs.writeFileSync(homeManifest, JSON.stringify({ options: { '--session-group': { takesValue: true } } }));
  assert.equal(c4ReceiveSupportsOption('--session-group'), true);
  fixture.writeOptions({});
  process.env.ZYLOS_DIR = fixture.zylosDir;
  assert.equal(getC4ReceivePath(), fixture.script);
  assert.equal(c4ReceiveSupportsOption('--session-group'), false);
});

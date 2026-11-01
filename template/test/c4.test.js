import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildC4ReceiveArgs } from '../src/lib/c4.js';
import { coreFixture } from './core-fixture.js';

const message = { source: 'channel', endpoint: 'chat', content: 'Quotes "\' $HOME `cmd`\nline' };
const defaultArgs = ['--channel', message.source, '--endpoint', message.endpoint, '--json', '--content', message.content];

for (const [version, supported] of [['0.9.3', false], ['1.0.0-beta.1', true]]) {
  for (const sessionGroup of [undefined, 'team']) {
    test(`constructs arguments for ${sessionGroup === undefined ? 'default' : 'local'} group on Core ${version}`, t => {
      coreFixture(t, version);
      assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup }),
        supported && sessionGroup !== undefined ? [...defaultArgs, '--session-group', sessionGroup] : defaultArgs);
    });
  }
}

test('a configured group named default is not the omitted default group', t => {
  coreFixture(t);
  assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup: 'default' }), [...defaultArgs, '--session-group', 'default']);
});

test('upgrade marker suppresses a configured group with the same supported package', t => {
  const fixture = coreFixture(t);
  fs.writeFileSync(fixture.marker, '{}');
  assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup: 'team' }), defaultArgs);
  fs.unlinkSync(fixture.marker);
  assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup: 'team' }), [...defaultArgs, '--session-group', 'team']);
});

test('unknown and rolled-back versions omit configured groups on subsequent calls', t => {
  const fixture = coreFixture(t);
  assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup: 'team' }), [...defaultArgs, '--session-group', 'team']);
  for (const version of ['0.9.4', 'invalid']) {
    fixture.writeVersion(version);
    assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup: 'team' }), defaultArgs);
  }
});

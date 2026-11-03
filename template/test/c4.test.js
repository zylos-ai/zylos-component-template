import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildC4ReceiveArgs } from '../src/lib/c4.js';
import { c4Fixture } from './helpers/c4-fixture.js';

const message = { source: 'channel', endpoint: 'chat', content: 'Quotes "\' $HOME `cmd`\nline' };
const defaultArgs = ['--channel', message.source, '--endpoint', message.endpoint, '--json', '--content', message.content];

for (const supported of [false, true]) {
  for (const [label, sessionGroup] of [['omitted', undefined], ['null', null], ['empty', ''], ['nonempty', 'team']]) {
    test(`constructs arguments for a ${label} group when support is ${supported}`, t => {
      const fixture = c4Fixture(t);
      fixture.writeOptions(supported ? { '--session-group': { takesValue: true } } : {});
      assert.deepEqual(buildC4ReceiveArgs({ ...message, sessionGroup }),
        supported && label === 'nonempty' ? [...defaultArgs, '--session-group', 'team'] : defaultArgs);
    });
  }
}

test('subsequent argument construction observes manifest changes and removal', t => {
  const fixture = c4Fixture(t);
  const args = () => buildC4ReceiveArgs({ ...message, sessionGroup: 'team' });
  assert.deepEqual(args(), defaultArgs);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  assert.deepEqual(args(), [...defaultArgs, '--session-group', 'team']);
  fixture.writeOptions({ '--channel': { takesValue: true } });
  assert.deepEqual(args(), defaultArgs);
  fixture.writeOptions({ '--session-group': { takesValue: true } });
  fs.unlinkSync(fixture.manifest);
  assert.deepEqual(args(), defaultArgs);
});

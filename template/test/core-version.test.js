import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getCoreVersion, supportsCoreFeature } from '../src/lib/core-version.js';
import { coreFixture } from './core-fixture.js';

test('reads the package above a direct executable', t => {
  const fixture = coreFixture(t, '0.9.3');
  process.env.PATH = fixture.cli;
  assert.equal(getCoreVersion(), '0.9.3');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
});

test('follows executable symlinks to the real package', t => {
  coreFixture(t);
  assert.equal(getCoreVersion(), '1.0.0-beta.1');
  assert.equal(supportsCoreFeature('sessionGroup'), true);
});

test('uses the first executable on PATH and skips non-executable files', t => {
  const fixture = coreFixture(t);
  const first = path.join(fixture.root, 'first');
  fs.mkdirSync(first);
  const candidate = path.join(first, 'zylos');
  fs.writeFileSync(candidate, '', { mode: 0o600 });
  process.env.PATH = [first, fixture.bin].join(path.delimiter);
  assert.equal(getCoreVersion(), '1.0.0-beta.1');
  fs.writeFileSync(path.join(first, 'package.json'), '{"name":"zylos","version":"0.9.3"}');
  fs.chmodSync(candidate, 0o700);
  assert.equal(getCoreVersion(), '0.9.3');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
});

test('returns null without a PATH executable and never runs a fallback', t => {
  const fixture = coreFixture(t);
  process.env.PATH = path.join(fixture.root, 'absent');
  assert.equal(getCoreVersion(), null);
  assert.equal(supportsCoreFeature('sessionGroup'), false);
  delete process.env.PATH;
  assert.equal(getCoreVersion(), null);
});

test('rejects missing, malformed and differently named packages', t => {
  const fixture = coreFixture(t);
  for (const content of ['{', '{"name":"other","version":"9.0.0"}', 'null']) {
    fs.writeFileSync(fixture.packageFile, content);
    assert.equal(getCoreVersion(), null);
    assert.equal(supportsCoreFeature('sessionGroup'), false);
  }
  fs.unlinkSync(fixture.packageFile);
  assert.equal(getCoreVersion(), null);
});

test('rejects invalid SemVer without throwing', t => {
  const fixture = coreFixture(t);
  for (const version of [undefined, null, 1, '', 'latest', 'v1.0.0', '1.0', '01.0.0',
    '1.00.0', '1.0.01', '1.0.0-beta.01', '1.0.0-01', '1.0.0-beta..1',
    '1.0.0+', '1.0.0+build..1', '1.0.0\n', ' 1.0.0', '1.0.0-beta_1']) {
    fixture.writeVersion(version);
    assert.equal(getCoreVersion(), null, String(version));
    assert.equal(supportsCoreFeature('sessionGroup'), false, String(version));
  }
});

test('compares prereleases, stable versions and major-line boundaries', t => {
  const fixture = coreFixture(t);
  for (const version of ['0.9.3', '0.9.4', '0.99.99', '1.0.0-alpha', '1.0.0-beta',
    '1.0.0-beta.0', '1.0.0-9999999999999999999999999999999999']) {
    fixture.writeVersion(version);
    assert.equal(supportsCoreFeature('sessionGroup'), false, version);
  }
  for (const version of ['1.0.0-beta.1', '1.0.0-beta.1+build.01', '1.0.0-beta.1.0',
    '1.0.0-beta.2', '1.0.0-beta.10', '1.0.0-beta.a', '1.0.0-rc.1',
    '1.0.0', '1.0.0+build.01', '1.0.1-alpha', '1.1.0', '2.0.0-alpha',
    '2.0.0', '9999999999999999999999999999999999.0.0']) {
    fixture.writeVersion(version);
    assert.equal(getCoreVersion(), version);
    assert.equal(supportsCoreFeature('sessionGroup'), true, version);
  }
  assert.equal(supportsCoreFeature('unknown'), false);
  assert.equal(supportsCoreFeature('toString'), false);
});

test('rereads the package on upgrades, rollbacks and executable retargeting', t => {
  const fixture = coreFixture(t, '0.9.3');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
  fixture.writeVersion('1.0.0-beta.1');
  assert.equal(supportsCoreFeature('sessionGroup'), true);
  fixture.writeVersion('0.9.4');
  assert.equal(getCoreVersion(), '0.9.4');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
  const next = path.join(fixture.root, 'next');
  fs.mkdirSync(next);
  fs.writeFileSync(path.join(next, 'package.json'), '{"name":"zylos","version":"2.0.0"}');
  fs.writeFileSync(path.join(next, 'zylos'), '', { mode: 0o700 });
  fs.unlinkSync(path.join(fixture.bin, 'zylos'));
  fs.symlinkSync(path.join(next, 'zylos'), path.join(fixture.bin, 'zylos'));
  assert.equal(getCoreVersion(), '2.0.0');
  assert.equal(supportsCoreFeature('sessionGroup'), true);
});

test('upgrade marker disables features without hiding the same package version', t => {
  const fixture = coreFixture(t);
  fs.writeFileSync(fixture.marker, '{}');
  assert.equal(getCoreVersion(), '1.0.0-beta.1');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
  fs.unlinkSync(fixture.marker);
  assert.equal(getCoreVersion(), '1.0.0-beta.1');
  assert.equal(supportsCoreFeature('sessionGroup'), true);
  fs.writeFileSync(fixture.marker, 'not JSON');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
});

test('disables features when upgrade marker state is unreadable', t => {
  const fixture = coreFixture(t);
  const directory = path.dirname(fixture.marker);
  const mode = fs.statSync(directory).mode & 0o777;
  assert.equal(supportsCoreFeature('sessionGroup'), true);
  fs.chmodSync(directory, 0o000);
  try {
    let error;
    try { fs.lstatSync(fixture.marker); } catch (cause) { error = cause; }
    if (!error) {
      t.skip('Directory permissions are bypassed by this runner');
      return;
    }
    assert.equal(error.code, 'EACCES');
    assert.equal(getCoreVersion(), '1.0.0-beta.1');
    assert.equal(supportsCoreFeature('sessionGroup'), false);
  } finally {
    fs.chmodSync(directory, mode);
  }
  assert.equal(supportsCoreFeature('sessionGroup'), true);
});

test('uses the home default only when ZYLOS_DIR is absent', t => {
  const fixture = coreFixture(t);
  delete process.env.ZYLOS_DIR;
  fs.writeFileSync(fixture.marker, '{}');
  assert.equal(supportsCoreFeature('sessionGroup'), false);
  process.env.ZYLOS_DIR = path.join(fixture.root, 'other-deployment');
  assert.equal(supportsCoreFeature('sessionGroup'), true);
});

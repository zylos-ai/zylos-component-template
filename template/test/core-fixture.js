import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function coreFixture(t, version = '1.0.0-beta.1') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-feature-'));
  const previous = Object.fromEntries(['HOME', 'ZYLOS_DIR', 'PATH'].map(key => [key, process.env[key]]));
  const home = path.join(root, 'home');
  const zylosDir = path.join(home, 'zylos');
  const bin = path.join(root, 'bin');
  const pkg = path.join(root, 'core');
  const cli = path.join(pkg, 'cli');
  const packageFile = path.join(pkg, 'package.json');
  const executable = path.join(cli, 'zylos');
  const marker = path.join(zylosDir, '.zylos/upgrade/active.json');
  for (const directory of [home, zylosDir, bin, cli, path.dirname(marker)]) fs.mkdirSync(directory, { recursive: true });
  // This fixture must only be inspected; executing it would fail the test.
  fs.writeFileSync(executable, 'throw new Error("Version detection must not execute zylos");\n', { mode: 0o700 });
  fs.symlinkSync(executable, path.join(bin, 'zylos'));
  const writeVersion = value => fs.writeFileSync(packageFile, JSON.stringify({ name: 'zylos', version: value }));
  writeVersion(version);
  process.env.HOME = home;
  process.env.ZYLOS_DIR = zylosDir;
  process.env.PATH = bin;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, home, zylosDir, bin, cli, pkg, packageFile, executable, marker, writeVersion };
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function c4Fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c4-options-'));
  const previous = Object.fromEntries(['HOME', 'ZYLOS_DIR'].map(key => [key, process.env[key]]));
  const home = path.join(root, 'home');
  const zylosDir = path.join(root, 'deployment');
  const script = path.join(zylosDir, '.claude/skills/comm-bridge/scripts/c4-receive.js');
  const manifest = path.join(path.dirname(script), 'c4-receive-options.json');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.dirname(script), { recursive: true });
  process.env.HOME = home;
  process.env.ZYLOS_DIR = zylosDir;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });
  const writeOptions = options => fs.writeFileSync(manifest, JSON.stringify({ options }));
  return { root, home, zylosDir, script, manifest, writeOptions };
}

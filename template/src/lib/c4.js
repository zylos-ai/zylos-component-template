import fs from 'node:fs';
import path from 'node:path';

export function getC4ReceivePath() {
  return path.join(process.env.ZYLOS_DIR || path.join(process.env.HOME, 'zylos'),
    '.claude/skills/comm-bridge/scripts/c4-receive.js');
}

export function c4ReceiveSupportsOption(name) {
  try {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(path.dirname(getC4ReceivePath()), 'c4-receive-options.json'), 'utf8'));
    return manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest)
      && manifest.options !== null && typeof manifest.options === 'object'
      && !Array.isArray(manifest.options) && Object.hasOwn(manifest.options, name);
  } catch {
    return false;
  }
}

export function buildC4ReceiveArgs({ source, endpoint, content, sessionGroup }) {
  const args = ['--channel', source, '--endpoint', endpoint, '--json', '--content', content];
  if (sessionGroup !== undefined && c4ReceiveSupportsOption('--session-group')) {
    args.push('--session-group', sessionGroup);
  }
  return args;
}

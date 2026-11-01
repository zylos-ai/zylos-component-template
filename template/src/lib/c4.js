import { supportsCoreFeature } from './core-version.js';

export function buildC4ReceiveArgs({ source, endpoint, content, sessionGroup }) {
  const args = ['--channel', source, '--endpoint', endpoint, '--json', '--content', content];
  if (sessionGroup !== undefined && supportsCoreFeature('sessionGroup')) {
    args.push('--session-group', sessionGroup);
  }
  return args;
}

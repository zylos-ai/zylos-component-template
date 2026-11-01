import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CORE_FEATURE_MIN_VERSIONS = Object.freeze({
  sessionGroup: Object.freeze({ 1: '1.0.0-beta.1' }),
});

function parseSemVer(version) {
  if (typeof version !== 'string') return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(version);
  if (!match || match[0] !== version) return null;
  const prerelease = match[4]?.split('.') || [];
  if (prerelease.some(value => /^\d+$/.test(value) && value.length > 1 && value[0] === '0')) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function compareSemVer(left, right) {
  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return left.core[i] > right.core[i] ? 1 : -1;
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    return Number(!left.prerelease.length) - Number(!right.prerelease.length);
  }
  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    const a = left.prerelease[i], b = right.prerelease[i];
    if (a === b) continue;
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const numericA = /^\d+$/.test(a), numericB = /^\d+$/.test(b);
    if (numericA && numericB) return BigInt(a) > BigInt(b) ? 1 : -1;
    if (numericA !== numericB) return numericA ? -1 : 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

export function getCoreVersion() {
  if (process.env.PATH === undefined) return null;
  let executable;
  for (const directory of process.env.PATH.split(path.delimiter)) {
    const candidate = path.resolve(directory || '.', 'zylos');
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) {
        executable = candidate;
        break;
      }
    } catch { /* Keep PATH executable lookup order. */ }
  }
  if (!executable) return null;
  try {
    let directory = path.dirname(fs.realpathSync(executable));
    for (;;) {
      let pkg;
      try { pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')); }
      catch { /* The executable may be nested below the package root. */ }
      if (pkg?.name === 'zylos') return parseSemVer(pkg.version) ? pkg.version : null;
      const parent = path.dirname(directory);
      if (parent === directory) return null;
      directory = parent;
    }
  } catch { return null; }
}

export function supportsCoreFeature(featureName) {
  const root = process.env.ZYLOS_DIR || path.join(os.homedir(), 'zylos');
  try {
    fs.lstatSync(path.join(root, '.zylos/upgrade/active.json'));
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT') return false;
  }
  if (typeof featureName !== 'string' || !Object.hasOwn(CORE_FEATURE_MIN_VERSIONS, featureName)) return false;
  const version = parseSemVer(getCoreVersion());
  if (!version) return false;
  const thresholds = CORE_FEATURE_MIN_VERSIONS[featureName];
  const minimum = thresholds[version.core[0].toString()];
  if (minimum !== undefined) return compareSemVer(version, parseSemVer(minimum)) >= 0;
  return Object.keys(thresholds).every(major => version.core[0] > BigInt(major));
}

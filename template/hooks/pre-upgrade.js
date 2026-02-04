#!/usr/bin/env node
/**
 * Pre-upgrade hook for zylos-{{COMPONENT_NAME}}
 *
 * Called by zylos CLI BEFORE upgrade steps:
 * - git pull
 * - npm install
 *
 * This hook handles:
 * - Backup critical data before upgrade
 * - Validate upgrade prerequisites
 * - Stop dependent services if needed
 *
 * Exit codes:
 *   0 - Continue with upgrade
 *   1 - Abort upgrade (with error message)
 */

const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/{{COMPONENT_NAME}}');
const configPath = path.join(DATA_DIR, 'config.json');

console.log('[pre-upgrade] Running {{COMPONENT_NAME}} pre-upgrade checks...\n');

// 1. Backup config before upgrade
if (fs.existsSync(configPath)) {
  const backupPath = configPath + '.backup';
  fs.copyFileSync(configPath, backupPath);
  console.log('Config backed up to:', backupPath);
}

// 2. Add any pre-upgrade validations here
// Example: Check if required services are available
// if (!checkDependency()) {
//   console.error('Error: Required dependency not available');
//   process.exit(1);
// }

console.log('\n[pre-upgrade] Checks passed, proceeding with upgrade.');

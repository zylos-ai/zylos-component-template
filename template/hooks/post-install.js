#!/usr/bin/env node
/**
 * Post-install hook for zylos-{{COMPONENT_NAME}}
 *
 * Called by Claude after CLI installation (zylos add --json).
 * CLI handles: download, npm install, manifest, registration.
 * Claude handles: config collection, this hook, service start.
 *
 * This hook handles component-specific setup:
 * - Create subdirectories
 * - Create default config.json
 * - Verify required config fields
 */

import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/{{COMPONENT_NAME}}');

// Minimal initial config - full defaults are in src/lib/config.js
const INITIAL_CONFIG = {
  enabled: true
};

console.log('[post-install] Running {{COMPONENT_NAME}}-specific setup...\n');

// 1. Create subdirectories
console.log('Creating subdirectories...');
fs.mkdirSync(path.join(DATA_DIR, 'logs'), { recursive: true });
// Add more subdirectories as needed
// fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });
console.log('  - logs/');

// 2. Create default config if not exists
const configPath = path.join(DATA_DIR, 'config.json');
if (!fs.existsSync(configPath)) {
  console.log('\nCreating default config.json...');
  fs.writeFileSync(configPath, JSON.stringify(INITIAL_CONFIG, null, 2));
  console.log('  - config.json created');
} else {
  console.log('\nConfig already exists, skipping.');
}

// 3. Verify required config fields (customize as needed)
// Example: Check for required API key in config.json
// const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
// if (!cfg.api_key) {
//   console.log('\n[!] api_key not found in config.json');
// }

// Note: PM2 service is started by Claude after this hook completes.

console.log('\n[post-install] Complete!');

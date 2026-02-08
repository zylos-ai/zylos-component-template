#!/usr/bin/env node
/**
 * Post-install hook for zylos-{{COMPONENT_NAME}}
 *
 * Called by zylos CLI after standard installation steps:
 * - git clone
 * - npm install
 * - create data_dir
 * - register PM2 service (uses ecosystem.config.cjs automatically)
 *
 * This hook handles component-specific setup:
 * - Create subdirectories
 * - Create default config.json
 * - Check for required environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/{{COMPONENT_NAME}}');
const ENV_FILE = path.join(HOME, 'zylos/.env');

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

// 3. Check environment variables (customize as needed)
console.log('\nChecking environment variables...');
let envContent = '';
try {
  envContent = fs.readFileSync(ENV_FILE, 'utf8');
} catch (e) {
  // .env file doesn't exist yet
}

// Example: Check for required API key
// const hasApiKey = envContent.includes('{{COMPONENT_NAME_UPPER}}_API_KEY');
// if (!hasApiKey) {
//   console.log('\n[!] {{COMPONENT_NAME_UPPER}}_API_KEY not found in ' + ENV_FILE);
// }

// Note: PM2 service is configured by zylos CLI's registerService()
// which automatically uses ecosystem.config.cjs when available.

console.log('\n[post-install] Complete!');

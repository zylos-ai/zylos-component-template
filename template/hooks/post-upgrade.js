#!/usr/bin/env node
/**
 * Post-upgrade hook for zylos-{{COMPONENT_NAME}}
 *
 * Called by zylos CLI after standard upgrade steps:
 * - git pull
 * - npm install
 *
 * This hook handles component-specific migrations:
 * - Config schema migrations
 * - Data format updates
 *
 * Note: Service restart is handled by zylos CLI after this hook.
 */

const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/{{COMPONENT_NAME}}');
const configPath = path.join(DATA_DIR, 'config.json');

console.log('[post-upgrade] Running {{COMPONENT_NAME}}-specific migrations...\n');

// Config migrations
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let migrated = false;
    const migrations = [];

    // Migration 1: Ensure enabled field
    if (config.enabled === undefined) {
      config.enabled = true;
      migrated = true;
      migrations.push('Added enabled field');
    }

    // Migration 2: Ensure settings object
    if (!config.settings) {
      config.settings = {};
      migrated = true;
      migrations.push('Added settings object');
    }

    // Add more migrations as needed for future versions
    // Migration N: Example
    // if (config.newField === undefined) {
    //   config.newField = 'default';
    //   migrated = true;
    //   migrations.push('Added newField');
    // }

    // Save if migrated
    if (migrated) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('Config migrations applied:');
      migrations.forEach(m => console.log('  - ' + m));
    } else {
      console.log('No config migrations needed.');
    }
  } catch (err) {
    console.error('Config migration failed:', err.message);
    process.exit(1);
  }
} else {
  console.log('No config file found, skipping migrations.');
}

console.log('\n[post-upgrade] Complete!');

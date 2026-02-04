#!/usr/bin/env node
/**
 * zylos-{{COMPONENT_NAME}}
 *
 * {{COMPONENT_DESCRIPTION}}
 */

require('dotenv').config({ path: require('path').join(process.env.HOME, 'zylos/.env') });

const { getConfig, watchConfig, DATA_DIR } = require('./lib/config');

// Initialize
console.log(`[{{COMPONENT_NAME}}] Starting...`);
console.log(`[{{COMPONENT_NAME}}] Data directory: ${DATA_DIR}`);

// Load configuration
const config = getConfig();
console.log(`[{{COMPONENT_NAME}}] Config loaded, enabled: ${config.enabled}`);

if (!config.enabled) {
  console.log(`[{{COMPONENT_NAME}}] Component disabled in config, exiting.`);
  process.exit(0);
}

// Watch for config changes
watchConfig((newConfig) => {
  console.log(`[{{COMPONENT_NAME}}] Config reloaded`);
  if (!newConfig.enabled) {
    console.log(`[{{COMPONENT_NAME}}] Component disabled, stopping...`);
    shutdown();
  }
});

// Main component logic
async function main() {
  // TODO: Implement your component logic here
  console.log(`[{{COMPONENT_NAME}}] Running...`);

  // Example: Keep process alive for a service
  // setInterval(() => {}, 1000);

  // Example: For one-shot tasks, just run and exit
  // await doSomething();
  // process.exit(0);
}

// Graceful shutdown
function shutdown() {
  console.log(`[{{COMPONENT_NAME}}] Shutting down...`);
  // TODO: Cleanup resources here
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run
main().catch(err => {
  console.error(`[{{COMPONENT_NAME}}] Fatal error:`, err);
  process.exit(1);
});

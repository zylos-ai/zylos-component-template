#!/usr/bin/env node
/**
 * zylos-{{COMPONENT_NAME}}
 *
 * {{COMPONENT_DESCRIPTION}}
 */

import 'dotenv/config';
import { getConfig, watchConfig, DATA_DIR } from './lib/config.js';

// Initialize
console.log(`[{{COMPONENT_NAME}}] Starting...`);
console.log(`[{{COMPONENT_NAME}}] Data directory: ${DATA_DIR}`);

// Load configuration
let config = getConfig();
console.log(`[{{COMPONENT_NAME}}] Config loaded, enabled: ${config.enabled}`);

if (!config.enabled) {
  console.log(`[{{COMPONENT_NAME}}] Component disabled in config, exiting.`);
  process.exit(0);
}

// Watch for config changes
watchConfig((newConfig) => {
  console.log(`[{{COMPONENT_NAME}}] Config reloaded`);
  config = newConfig;
  if (!newConfig.enabled) {
    console.log(`[{{COMPONENT_NAME}}] Component disabled, stopping...`);
    shutdown();
  }
});

// Main component logic
async function main() {
  // TODO: Implement your component logic here
  //
  // Communication components: set up platform SDK, listen for events, forward to C4
  // Capability components: start HTTP server or other service interface
  // Utility components: run task and exit (remove the keepalive below)

  console.log(`[{{COMPONENT_NAME}}] Running`);
}

// Graceful shutdown
function shutdown() {
  console.log(`[{{COMPONENT_NAME}}] Shutting down...`);
  // TODO: Close connections, stop listeners, cleanup
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run
main().catch(err => {
  console.error(`[{{COMPONENT_NAME}}] Fatal error:`, err);
  process.exit(1);
});

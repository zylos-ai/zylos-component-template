/**
 * Configuration loader for zylos-{{COMPONENT_NAME}}
 *
 * Loads config from ~/zylos/components/{{COMPONENT_NAME}}/config.json
 * with hot-reload support via file watcher.
 */

const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/{{COMPONENT_NAME}}');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  settings: {}
};

let config = null;
let configWatcher = null;

/**
 * Load configuration from file
 * @returns {Object} Configuration object
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } else {
      console.warn(`[config] Config file not found: ${CONFIG_PATH}`);
      config = { ...DEFAULT_CONFIG };
    }
  } catch (err) {
    console.error(`[config] Failed to load config: ${err.message}`);
    config = { ...DEFAULT_CONFIG };
  }
  return config;
}

/**
 * Get current configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
  if (!config) {
    loadConfig();
  }
  return config;
}

/**
 * Save configuration to file
 * @param {Object} newConfig - Configuration to save
 */
function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    config = newConfig;
  } catch (err) {
    console.error(`[config] Failed to save config: ${err.message}`);
    throw err;
  }
}

/**
 * Start watching config file for changes
 * @param {Function} onChange - Callback when config changes
 */
function watchConfig(onChange) {
  if (configWatcher) {
    configWatcher.close();
  }

  configWatcher = fs.watch(CONFIG_PATH, (eventType) => {
    if (eventType === 'change') {
      console.log('[config] Config file changed, reloading...');
      loadConfig();
      if (onChange) {
        onChange(config);
      }
    }
  });
}

/**
 * Stop watching config file
 */
function stopWatching() {
  if (configWatcher) {
    configWatcher.close();
    configWatcher = null;
  }
}

module.exports = {
  loadConfig,
  getConfig,
  saveConfig,
  watchConfig,
  stopWatching,
  DEFAULT_CONFIG,
  CONFIG_PATH,
  DATA_DIR
};

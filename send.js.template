#!/usr/bin/env node
/**
 * C4 Communication Bridge Interface for zylos-{{COMPONENT_NAME}}
 *
 * This file provides the standard interface for Claude to send messages
 * through this communication component.
 *
 * Usage:
 *   ./send.js <endpoint_id> "message text"
 *   ./send.js <endpoint_id> "[MEDIA:image] /path/to/image.png"
 *   ./send.js <endpoint_id> "[MEDIA:file] /path/to/document.pdf"
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (message printed to stderr)
 */

require('dotenv').config({ path: require('path').join(process.env.HOME, 'zylos/.env') });

const { getConfig } = require('./src/lib/config');

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: send.js <endpoint_id> <message>');
  console.error('       send.js <endpoint_id> "[MEDIA:image] /path/to/image.png"');
  console.error('       send.js <endpoint_id> "[MEDIA:file] /path/to/file.pdf"');
  process.exit(1);
}

const endpointId = args[0];
const message = args.slice(1).join(' ');

// Check if component is enabled
const config = getConfig();
if (!config.enabled) {
  console.error('Error: {{COMPONENT_NAME}} is disabled in config');
  process.exit(1);
}

// Parse media prefix
const mediaMatch = message.match(/^\[MEDIA:(\w+)\]\s+(.+)$/);

async function send() {
  try {
    if (mediaMatch) {
      const [, mediaType, mediaPath] = mediaMatch;
      await sendMedia(endpointId, mediaType, mediaPath);
    } else {
      await sendText(endpointId, message);
    }
    console.log('Message sent successfully');
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Send a text message
 * @param {string} text - Message text
 */
async function sendText(endpoint, text) {
  // TODO: Implement text sending logic
  // Example:
  // const client = getClient();
  // await client.sendMessage(endpoint, text);
  throw new Error('sendText not implemented');
}

/**
 * Send media (image, file, video, etc.)
 * @param {string} type - Media type (image, file, video, audio)
 * @param {string} filePath - Path to the media file
 */
async function sendMedia(endpoint, type, filePath) {
  // TODO: Implement media sending logic
  // Example:
  // const client = getClient();
  // switch (type) {
  //   case 'image':
  //     await client.sendImage(endpoint, filePath);
  //     break;
  //   case 'file':
  //     await client.sendFile(endpoint, filePath);
  //     break;
  //   default:
  //     throw new Error(`Unsupported media type: ${type}`);
  // }
  throw new Error('sendMedia not implemented');
}

send();

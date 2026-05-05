# Capability & Utility Component Patterns

## Capability Components

Extend the agent's abilities (browser automation, image generation, knowledge base, etc.). Expose tools or services that Claude uses to accomplish tasks.

**Files to implement:**
- `src/index.js` — Main service (long-running or on-demand)
- Delete `scripts/send.js` (not needed)

### Service Pattern

```javascript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.env.HOME, 'zylos/.env') });

import { getConfig, watchConfig } from './lib/config.js';

let config = getConfig();
watchConfig((newConfig) => { config = newConfig; });

import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

server.listen(config.port || 3000, () => {
  console.log(`[component] Listening on port ${config.port || 3000}`);
});

function shutdown() { server.close(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### Browser-Facing HTTP Services

If the service is exposed through Zylos Caddy, declare `http_routes` in `SKILL.md` and keep the app root-internal:

```yaml
http_routes:
  - path: /my-component/*
    type: reverse_proxy
    target: localhost:3000
    strip_prefix: /my-component
```

Zylos Caddy strips `/my-component` before proxying and forwards `X-Forwarded-Prefix: /my-component`. The app should serve `/`, `/login`, `/_assets/...`, and `/api/...` internally.

Use request context to build browser URLs:

```javascript
function normalizeForwardedPrefix(value) {
  if (!value || typeof value !== 'string') return '';
  const prefix = value.split(',')[0].trim();
  if (!prefix.startsWith('/')) return '';
  if (prefix.includes('..') || prefix.includes('//')) return '';
  return prefix === '/' ? '' : prefix.replace(/\/+$/, '');
}

function browserBase(req) {
  return normalizeForwardedPrefix(req.headers['x-forwarded-prefix']);
}

function browserPath(req, pathname) {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const base = browserBase(req);
  return base ? `${base}${cleanPath}` : `.${cleanPath}`;
}
```

Direct local access should use relative URLs (`./login`, `./_assets/app.js`). Caddy access should use the forwarded prefix (`/my-component/login`, `/my-component/_assets/app.js`). Do not hardcode `/my-component` into route handlers or templates.

### CLI Tool Pattern

Some capability components provide CLI tools instead of (or in addition to) a service:

```javascript
#!/usr/bin/env node
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'search': await doSearch(args[1]); break;
  case 'get': await doGet(args[1]); break;
  default:
    console.error('Usage: tool-name.js <search|get> <query>');
    process.exit(1);
}
```

## Utility Components

Helper tools or one-shot scripts. May not need a persistent service.

- Delete `scripts/send.js` (not needed)
- If no persistent service needed, remove `ecosystem.config.cjs` and set `lifecycle.service` to null in SKILL.md

## Reference Implementations

- [zylos-browser](https://github.com/zylos-ai/zylos-browser) — Browser automation (capability)
- [zylos-imagegen](https://github.com/zylos-ai/zylos-imagegen) — Image generation (capability, no service)

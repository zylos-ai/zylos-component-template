# AI Component Development Guide

This document guides AI assistants to create new zylos components using this template.

For the full technical specification, see [COMPONENT-SPEC.md](./COMPONENT-SPEC.md).

## Project Conventions

- **ESM only** — `import`/`export`, never `require()`. `"type": "module"` in package.json
- **Node.js 20+** — Minimum runtime version
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **No `files` in package.json** — Rely on `.gitignore` to exclude
- **All config in `config.json`** — Secrets and runtime config both live in `~/zylos/components/<name>/config.json`. This file is in the data directory (never committed to git). Mark sensitive fields with `sensitive: true` in SKILL.md and declare `lifecycle.hooks.configure` so zylos can collect values and pass them to the component for storage
- **English for code** — Comments, commit messages, PR descriptions, documentation

## Release Process

When releasing a new version, **all four files** must be updated in the same commit:

1. **`package.json`** — Bump `version` field
2. **`package-lock.json`** — Run `npm install` after bumping package.json to sync the lock file
3. **`SKILL.md`** — Update `version` in YAML frontmatter to match package.json
4. **`CHANGELOG.md`** — Add new version entry following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format

Version bump commit message: `chore: bump version to X.Y.Z`

CHANGELOG entry format:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added / Changed / Fixed / Removed / Security
- Description of change (#PR)
```

After merge, create a GitHub Release with tag `vX.Y.Z` from the merge commit.

This rule ships with the scaffold: `template/AGENTS.md` carries it into every
generated component (with `template/CLAUDE.md` pointing there), and
`template/test/release-consistency.test.js` machine-enforces it — the suite
fails whenever package.json, package-lock.json, SKILL.md frontmatter, and the
CHANGELOG's latest released header disagree.

## Quick Start

### Step 1: Copy Template

```bash
cd ~/src
git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone
cp -r temp-clone/template zylos-<name>
rm -rf temp-clone
cd zylos-<name>
```

### Step 2: Gather Component Info

Confirm with user:
- **Name**: lowercase, e.g., `discord`, `slack`, `browser`
- **Description**: one-line description
- **Type**: `communication` | `capability` | `utility`

### Step 3: Replace Placeholders

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `{{COMPONENT_NAME}}` | Component name (lowercase) | `discord` |
| `{{COMPONENT_NAME_UPPER}}` | Component name (uppercase) | `DISCORD` |
| `{{COMPONENT_TITLE}}` | Component title | `Discord` |
| `{{COMPONENT_DESCRIPTION}}` | Component description | `Discord bot integration` |
| `{{COMPONENT_TYPE}}` | Component type | `communication` |
| `{{DATE}}` | Current date | `2026-02-09` |

```bash
find . -type f -exec sed -i "s|{{COMPONENT_NAME}}|$NAME|g" {} \;
# Repeat for all placeholders
```

### Step 4: Handle Component Type

- **communication**: Keep all files as-is
- **capability / utility**: Delete `scripts/send.js`

### Step 5: Implement Component Logic

Read the type-specific guide:
- **Communication**: See [references/communication.md](./references/communication.md) — C4 bridge integration, message format, owner binding, group context. Also see [references/channel-standards.md](./references/channel-standards.md) — security pitfalls, coding standards, and pre-commit checklist
- **Capability / Utility**: See [references/capability.md](./references/capability.md) — service pattern, CLI tool pattern

### Step 6: Update SKILL.md

The SKILL.md `description` field is how Claude decides when to use this component. Write it following create-skill principles:

- Include **what** the component does AND **when** to use it (trigger patterns)
- Put all "when to use" information in the frontmatter `description`, NOT in the body
- Body should contain only concise usage examples — Claude can run `--help` for details

Example description for a discord component:
```
Discord messaging for Zylos agents. Use when the user wants to communicate via
Discord, send messages to Discord channels, or configure Discord bot settings.
```

Fill in `config.required` if the component needs API keys or secrets.

### Step 7: Update README.md

Replace placeholder features with actual features. The template includes centered logo, badge icons, and standard sections — fill in component-specific content.

### Step 8: Initialize Git

```bash
git init && git add . && git commit -m "Initial commit: zylos-<name>"
git branch -M main
git remote add origin git@github.com:zylos-ai/zylos-<name>.git
git push -u origin main
```

## Best Practices

### Config Management

All component configuration lives in one place:

| Location | What goes here | Example |
|----------|---------------|---------|
| `~/zylos/components/<name>/config.json` | All config (secrets + runtime) | `{"bot_token": "xxx", "enabled": true}` |

This file is in the data directory — never committed to git, preserved across upgrades. Declare sensitive fields in SKILL.md frontmatter for future vault integration:

```yaml
config:
  required:
    - name: DISCORD_BOT_TOKEN
      description: Discord bot token
      sensitive: true    # Marks this field for vault migration
```

If the component declares required config, also keep the non-interactive configure hook:

```yaml
lifecycle:
  hooks:
    configure: hooks/configure.js
```

Zylos collects the declared values, masks sensitive fields in user-facing output, then pipes a JSON object to the hook on stdin:

```bash
printf '%s\n' '{"DISCORD_BOT_TOKEN":"xxx"}' | node hooks/configure.js
```

The hook must not prompt. It should validate the JSON, merge it into `~/zylos/components/<name>/config.json`, and exit non-zero if configuration cannot be written. Components without `hooks.configure` are treated as legacy components by zylos-core and may still receive config through `~/zylos/.env`.

### Directory Convention

```
Code:    ~/zylos/.claude/skills/<component>/    # Overwritten on upgrade
Data:    ~/zylos/components/<component>/         # Preserved across upgrades (config.json + data/)
```

**Code is disposable, data is permanent.** Never store user data in the skills directory.

### Logging

Use consistent prefix: `[component-name]`

### Error Handling

- **Startup**: Fail fast on missing credentials (`process.exit(1)`)
- **Runtime**: Log and continue (don't crash the service)
- **Shutdown**: Graceful on SIGINT/SIGTERM

### HTTP Services and Base Paths

For components with a browser-facing HTTP service, make the app root-internal and proxy-aware:

- **Declare Caddy exposure in SKILL.md** with `http_routes` using `path: /<component>/*` and `strip_prefix: /<component>`.
- **Serve internal routes at `/`**. Do not mount the app internally under `/<component>`, and do not hardcode `/<component>` into route handlers.
- **Let Caddy own the external prefix**. Zylos core strips `strip_prefix` before proxying and forwards `X-Forwarded-Prefix: /<component>`.
- **Build browser URLs from request context**. If `X-Forwarded-Prefix` is present, generate absolute-path URLs under that prefix. If it is absent, use relative URLs such as `./login`, `./_assets/app.js`, and `login?next=.%2F` so direct localhost access still works.
- **Treat `X-Forwarded-Prefix` as untrusted input**. Accept only a clean path prefix: no query/fragment, whitespace/control chars, backslashes, protocol-like or protocol-relative strings, dot segments, percent-encoded input, or HTML metacharacters. Invalid values must fall back to direct-local relative URLs.
- **Validate redirect targets by browser base**. `next` and similar redirect params must not accept arbitrary absolute URLs, dot-segment escapes such as `/<component>/../admin`, or paths outside the current browser base.
- **Keep caches keyed and invalidated by browser base**. If rendered HTML includes browser-base-specific links, either avoid caching that HTML across bases or invalidate every browser-base variant when the underlying resource changes.
- **Block search engine indexing by default**. Components are internal tools; enforce isolation at the mechanism level with all three layers: a global middleware adding `X-Robots-Tag: noindex, nofollow` to every response, `<meta name="robots" content="noindex, nofollow">` in every HTML template (including 404/error pages), and a `/robots.txt` that disallows all. Only a component explicitly built for public, indexable content may omit this — and must say so in SKILL.md and README.md. See COMPONENT-SPEC.md §4.5.
- **Test both access modes and hostile inputs**: direct local access (`http://127.0.0.1:<port>/`), proxied access simulated with `X-Forwarded-Prefix: /<component>`, unsafe forwarded prefixes, and unsafe redirect `next` values.

Example SKILL.md route:

```yaml
http_routes:
  - path: /my-component/*
    type: reverse_proxy
    target: localhost:3000
    strip_prefix: /my-component
```

Example URL behavior:

| Request context | Login form action | Asset URL | Redirect from `/` |
|-----------------|-------------------|-----------|-------------------|
| direct localhost | `./login` | `./_assets/app.js` | `login?next=.%2F` |
| Caddy with `X-Forwarded-Prefix: /my-component` | `/my-component/login` | `/my-component/_assets/app.js` | `/my-component/login?next=%2Fmy-component%2F` |

### Hooks

| Hook | When | Purpose |
|------|------|---------|
| `configure.js` | After zylos collects `config.required` | Non-interactively write collected values to config.json |
| `post-install.js` | After `zylos add` | Create data dirs, default config |
| `pre-upgrade.js` | Before `zylos upgrade` | Backup config. Exit 1 to abort |
| `post-upgrade.js` | After `zylos upgrade` | Migrate config schema |

### Upgrade Hook Requirements

**These hooks run on every upgrade path** — including no-op version bumps,
branch installs (`zylos add <name> --branch <b>`), `zylos upgrade <name>`,
and any future automated dispatch zylos-core may add. Treat them as
**user-facing automation that gets re-executed indefinitely**, not as
one-shot migration scripts.

The following requirements apply to `post-upgrade.js` and `post-install.js`
(post-install also runs on every reinstall). `pre-upgrade.js` is held to
the same standards when it touches state.

#### 1. Idempotent by construction

Every state-changing step must be guarded so that re-running the hook on
already-migrated data is a no-op. Two acceptable patterns:

```js
// Pattern A — presence check
if (config.newField === undefined) {
  config.newField = defaultValue;
  migrated = true;
}

// Pattern B — content diff
const next = applyMigration(current);
if (JSON.stringify(next) !== JSON.stringify(current)) {
  migrated = true;
}
```

Anti-pattern: unconditional overwrite. Do **not** rewrite `config.json`
every run "to normalize", since this masks unrelated user edits.

#### 2. Safe migration of removed or renamed fields

Never `delete` a field without preserving its prior value somewhere
recoverable. The convention is `_legacy_<oldName>`:

```js
// Renaming: copy first, then delete
if (config.dmAllowlist !== undefined && config.dmAllowFrom === undefined) {
  config.dmAllowFrom = config.dmAllowlist;
  config._legacy_dmAllowlist = config.dmAllowlist;
  delete config.dmAllowlist;
  migrated = true;
}
```

Anti-pattern: `delete config.bot; delete config.proxy; delete config.webhook_port`
in a single migration with no backup. If the user had hand-tuned values, they
are gone forever. Always preserve under `_legacy_*` even for "obsolete" fields.

#### 3. Hard-fail on real errors, never swallow

Distinguish "expected idle state" (already migrated, no-op) from "real
failure" (unparseable config, fs error, missing dependency). Real failures
must `process.exit(1)`:

```js
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // ... migrations ...
  if (migrated) fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
} catch (err) {
  console.error(`[<name>] post-upgrade failed:`, err.message);
  process.exit(1);  // never `console.warn` and return
}
```

Anti-pattern: `try { ... } catch (e) { console.error(e); }` — this turns a
broken upgrade into a silently-broken service. The zylos upgrade CLI relies
on the hook's exit code to decide whether the upgrade succeeded.

The only acceptable "soft fail" is a **missing optional input** (e.g.
credentials not yet configured): log a warning, return early with a
structured value the caller can inspect, but never crash the rest of the
hook on it.

#### 4. Scope: config + filesystem, nothing else

Post-upgrade hooks must not:

- Install global packages (`npm install -g …`)
- Start long-running daemons (`spawn`, `pm2 start`, `systemctl start …`)
- Make network calls beyond what's required for the migration itself
- `rm -rf` directories without an explicit pre-snapshot
- Exec sibling CLIs that have their own side effects (e.g. opening browsers,
  starting VNC servers)

If your component genuinely needs one of these operations, put it in
`post-install.js` (one-shot during installation) and gate it on a probe so
the install step is itself idempotent. `post-upgrade.js` should be a pure
config/data migration.

#### 5. Re-executable across all directions

A `post-upgrade.js` must handle these scenarios without surprise:

- Same version → same version (no-op rerun)
- v1 → v2 (forward)
- v2 → v2 (idempotent rerun after partial failure)
- v3 → v2 (downgrade — should NOT silently apply v3 migrations again; rely
  on presence checks rather than version comparison, since the user may
  have downgraded deliberately)

Don't gate migrations on `package.json` version comparisons. Gate them on
the actual shape of the data: "does the new field exist? if not, add it."

#### 6. Canonical post-upgrade.js skeleton

```js
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const LOG_PREFIX = '[<component>]';
const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/<component>');
const configPath = path.join(DATA_DIR, 'config.json');

console.log(`${LOG_PREFIX} Running post-upgrade migrations...`);

if (!fs.existsSync(configPath)) {
  console.log(`${LOG_PREFIX} No config file found, nothing to migrate.`);
  process.exit(0);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const migrations = [];
  let migrated = false;

  // Each migration: presence-checked, additive, with _legacy_* backup on removal.
  if (config.enabled === undefined) {
    config.enabled = true;
    migrations.push('Added enabled field');
    migrated = true;
  }

  if (config.dmAllowlist !== undefined && config.dmAllowFrom === undefined) {
    config.dmAllowFrom = config.dmAllowlist;
    config._legacy_dmAllowlist = config.dmAllowlist;
    delete config.dmAllowlist;
    migrations.push('Renamed dmAllowlist → dmAllowFrom (legacy kept under _legacy_dmAllowlist)');
    migrated = true;
  }

  if (migrated) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${LOG_PREFIX} Applied migrations:`);
    migrations.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log(`${LOG_PREFIX} No migrations needed.`);
  }
} catch (err) {
  console.error(`${LOG_PREFIX} post-upgrade failed:`, err.message);
  process.exit(1);
}

console.log(`${LOG_PREFIX} post-upgrade complete.`);
```

## Acceptance Checklist

- [ ] CLAUDE.md and AGENTS.md present (propagated from `template/`; component-localized as needed)
- [ ] `npm test` passes, including `test/release-consistency.test.js` (four version faces agree, negative controls intact)
- [ ] SKILL.md frontmatter complete (name, version, type, lifecycle, upgrade)
- [ ] SKILL.md description includes trigger patterns (what + when to use)
- [ ] SKILL.md body has concise usage examples only
- [ ] README.md has real features, badges, and setup instructions
- [ ] `npm install && npm start` works
- [ ] configure.js accepts stdin JSON and writes required values to config.json
- [ ] post-install.js creates data directory and default config
- [ ] post-upgrade.js handles config migrations
- [ ] post-upgrade.js is idempotent (rerun on already-migrated config is a no-op)
- [ ] post-upgrade.js preserves removed/renamed fields under `_legacy_*`
- [ ] post-upgrade.js exits non-zero on real errors (never silently swallow)
- [ ] post-upgrade.js does not start daemons, install global packages, or `rm -rf` without snapshot
- [ ] (HTTP) Every response carries `X-Robots-Tag: noindex, nofollow`; HTML (incl. error pages) has robots meta; `/robots.txt` disallows all — unless explicitly declared public-indexable
- [ ] PM2 can manage the service (`pm2 start ecosystem.config.cjs`)
- [ ] (communication) scripts/send.js sends text and media
- [ ] (communication) Messages forwarded to C4 in correct format

## Reference Implementations

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) — Telegram communication component
- [zylos-lark](https://github.com/zylos-ai/zylos-lark) — Lark/Feishu communication component
- [zylos-imagegen](https://github.com/zylos-ai/zylos-imagegen) — Image generation capability component

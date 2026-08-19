# AGENTS.md — zylos-{{COMPONENT_NAME}} engineering conventions

This file binds every agent (Claude, Codex, or any other) that develops,
reviews, or releases in this repository. CLAUDE.md points here. Extend it
with component-specific rules as the project grows, but do not remove the
Release Process section below.

## Project Conventions

- **ESM only** — `import`/`export`, never `require()`. `"type": "module"` in package.json
- **Node.js 20+** — Minimum runtime version
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **All config in `~/zylos/components/{{COMPONENT_NAME}}/config.json`** — never committed; code is disposable, data is permanent
- **English for code** — Comments, commit messages, PR descriptions, documentation

## Release Process (hard gate)

Version bumps happen **only in a dedicated release PR** — feature PRs carry
source + tests + CHANGELOG entries under `## [Unreleased]`, never a version
change. The release PR must update **all four files in the same commit**:

1. **`package.json`** — Bump `version`
2. **`package-lock.json`** — Run `npm install` after bumping package.json to sync the lock file
3. **`SKILL.md`** — Update `version` in the YAML frontmatter to match. zylos-core registers the installed version from this field and uses it to decide upgrades; a stale value causes repeated upgrade prompts
4. **`CHANGELOG.md`** — Convert the `## [Unreleased]` section into a `## [X.Y.Z] - YYYY-MM-DD` entry ([Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format)

Version bump commit message: `chore: bump version to X.Y.Z`

After merge, create a GitHub Release with tag `vX.Y.Z` from the merge commit.

This rule is machine-enforced: `test/release-consistency.test.js` fails the
suite whenever the four version faces disagree. Keep that test passing and
keep its negative controls intact — a gate that cannot fail proves nothing.

## Testing

- `npm test` runs `node --test` over `test/*.test.js`
- The release-consistency gate (above) ships with the scaffold and must stay
- When a test guards specific logic, prove it can fail: temporarily break the
  guarded behavior (a known-bad mutant), confirm the test goes red, restore

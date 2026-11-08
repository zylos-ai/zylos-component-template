# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Explicit test-file matching, helpers under `test/helpers/`, and development rules for test naming and discovery.

### Added
- Caller-supplied per-message C4 session groups, omitted when absent or empty and gated by fresh reads of the option manifest beside the receiving script.
- `src/lib/session-group.js` mapping stub with Core's name limits, and `scripts/session-group.js <endpoint>` to look up a reply endpoint's session group.

## [0.1.0] - {{DATE}}

### Added
- Initial release
- Basic functionality

### Upgrade Notes

Initial release. For fresh installation:

```bash
zylos add {{COMPONENT_NAME}}
```

No migration required.

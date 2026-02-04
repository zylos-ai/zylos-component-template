---
name: {{COMPONENT_NAME}}
version: 0.1.0
description: {{COMPONENT_DESCRIPTION}}
type: {{COMPONENT_TYPE}}  # communication | capability | utility

lifecycle:
  npm: true
  service:
    name: zylos-{{COMPONENT_NAME}}
    entry: src/index.js
  data_dir: ~/zylos/components/{{COMPONENT_NAME}}
  hooks:
    post-install: hooks/post-install.js
    pre-upgrade: hooks/pre-upgrade.js
    post-upgrade: hooks/post-upgrade.js

upgrade:
  repo: zylos-ai/zylos-{{COMPONENT_NAME}}
  branch: main

dependencies: []
---

# {{COMPONENT_TITLE}}

{{COMPONENT_DESCRIPTION}}

## Dependencies

- None (or list dependencies)

## When to Use

- Describe when this component should be used

## How to Use

```bash
# Example usage
```

## Config Location

- Config: `~/zylos/components/{{COMPONENT_NAME}}/config.json`
- Logs: `~/zylos/components/{{COMPONENT_NAME}}/logs/`

## Service Management

```bash
pm2 status zylos-{{COMPONENT_NAME}}
pm2 logs zylos-{{COMPONENT_NAME}}
pm2 restart zylos-{{COMPONENT_NAME}}
```

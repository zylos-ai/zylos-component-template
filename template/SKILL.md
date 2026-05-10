---
name: {{COMPONENT_NAME}}
version: 0.1.0
description: >
  {{COMPONENT_DESCRIPTION}}. Use when ...
  (Include trigger patterns: what user requests should activate this component)
type: {{COMPONENT_TYPE}}  # communication | capability | utility

lifecycle:
  npm: true
  service:
    type: pm2
    name: zylos-{{COMPONENT_NAME}}
    entry: src/index.js
  data_dir: ~/zylos/components/{{COMPONENT_NAME}}
  hooks:
    configure: hooks/configure.js
    post-install: hooks/post-install.js
    pre-upgrade: hooks/pre-upgrade.js
    post-upgrade: hooks/post-upgrade.js
  preserve:
    - config.json
    - data/

# For HTTP services exposed through Zylos Caddy, prefer a root-internal app:
# - The component listens on localhost and serves internal routes at /.
# - Caddy exposes it at /{{COMPONENT_NAME}}/*, strips that prefix, and forwards
#   X-Forwarded-Prefix. Browser URLs should be relative by default and should
#   use X-Forwarded-Prefix when present.
# http_routes:
#   - path: /{{COMPONENT_NAME}}/*
#     type: reverse_proxy
#     target: localhost:3000
#     strip_prefix: /{{COMPONENT_NAME}}

upgrade:
  repo: zylos-ai/zylos-{{COMPONENT_NAME}}
  branch: main

config:
  required:
    # Values are collected by zylos and passed to lifecycle.hooks.configure as stdin JSON.
    # The configure hook decides how to store them in config.json.
    # - name: {{COMPONENT_NAME_UPPER}}_API_KEY
    #   description: API key for {{COMPONENT_NAME}}
    #   sensitive: true
  optional:
    # - name: {{COMPONENT_NAME_UPPER}}_DEBUG
    #   description: Enable debug mode
    #   default: "false"

dependencies: []
---

# {{COMPONENT_TITLE}}

```bash
# Example usage commands here
```

Run `node ~/zylos/.claude/skills/{{COMPONENT_NAME}}/scripts/<script>.js --help` for all options.

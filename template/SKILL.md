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
    post-install: hooks/post-install.js
    pre-upgrade: hooks/pre-upgrade.js
    post-upgrade: hooks/post-upgrade.js
  preserve:
    - config.json
    - .env
    - data/

upgrade:
  repo: zylos-ai/zylos-{{COMPONENT_NAME}}
  branch: main

config:
  required:
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

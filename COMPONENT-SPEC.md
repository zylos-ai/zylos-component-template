# Zylos 组件开发规范

**版本**: 1.0.0
**日期**: 2026-02-04
**状态**: 正式发布

本文档定义 Zylos 组件的开发规范，基于 v2 hooks 模式。

---

## 一、组件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **communication** | 通讯组件，与外部平台交互 | telegram, lark, discord |
| **capability** | 能力组件，扩展 Agent 功能 | browser, knowledge-base |
| **utility** | 工具组件，辅助功能 | 自定义工具 |

---

## 二、目录结构

### 2.1 Skills 目录 (代码)

```
~/.claude/skills/<component>/
├── SKILL.md              # 组件元数据 (必须)
├── README.md             # 说明文档 (必须)
├── CHANGELOG.md          # 变更日志 (必须)
├── LICENSE               # 开源协议
├── package.json          # 依赖定义
├── ecosystem.config.js   # PM2 配置 (如有服务)
├── send.js               # C4 发送接口 (仅通讯组件)
├── hooks/                # 生命周期钩子
│   ├── post-install.js   # 安装后钩子
│   └── post-upgrade.js   # 升级后钩子
└── src/                  # 源代码
    ├── index.js          # 主入口 (或 bot.js 等)
    └── lib/              # 模块目录
        └── config.js     # 配置加载
```

### 2.2 Data 目录 (数据)

```
~/zylos/components/<component>/
├── config.json           # 运行时配置
├── media/                # 媒体文件 (如需要)
└── logs/                 # 日志目录
```

### 2.3 关键原则

1. **代码在 Skills**: `~/.claude/skills/<component>/`
2. **数据在 Data**: `~/zylos/components/<component>/`
3. **密钥在 .env**: `~/zylos/.env`
4. **代码可升级覆盖，数据升级保留**

---

## 三、SKILL.md 规范 (v2)

SKILL.md 使用 YAML frontmatter 定义组件元数据：

```yaml
---
name: <component-name>
version: x.y.z
description: 组件描述
type: communication | capability | utility

lifecycle:
  npm: true                              # 是否需要 npm install
  service:
    name: zylos-<component>              # PM2 服务名
    entry: src/index.js                  # 入口文件
  data_dir: ~/zylos/components/<component>
  hooks:
    post-install: hooks/post-install.js
    post-upgrade: hooks/post-upgrade.js

upgrade:
  repo: zylos-ai/zylos-<component>
  branch: main

dependencies:                            # 依赖的其他组件
  - comm-bridge
---

# 组件名称

组件说明文档...
```

### 3.1 字段说明

| 字段 | 必须 | 说明 |
|------|------|------|
| name | 是 | 组件名称 |
| version | 是 | 版本号 (semver) |
| description | 是 | 简短描述 |
| type | 是 | 组件类型 |
| lifecycle.npm | 否 | 是否需要 npm install，默认 true |
| lifecycle.service | 否 | PM2 服务配置 |
| lifecycle.data_dir | 否 | 数据目录路径 |
| lifecycle.hooks | 否 | 生命周期钩子 |
| upgrade.repo | 是 | GitHub 仓库 (org/repo) |
| upgrade.branch | 否 | 跟踪分支，默认 main |
| dependencies | 否 | 依赖的其他组件 |

---

## 四、Hooks 规范

### 4.1 文件格式

- **推荐**: Node.js 脚本 (.js)
- **支持**: Shell 脚本 (.sh 或无扩展名)

### 4.2 post-install.js

安装后执行，用于：
- 创建数据子目录
- 生成默认配置文件
- 检查环境变量
- 配置 PM2 服务

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME;
const DATA_DIR = path.join(HOME, 'zylos/components/<component>');

const DEFAULT_CONFIG = {
  enabled: true,
  // ... 默认配置
};

// 1. 创建子目录
fs.mkdirSync(path.join(DATA_DIR, 'logs'), { recursive: true });

// 2. 创建默认配置
const configPath = path.join(DATA_DIR, 'config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

// 3. 检查环境变量
// ...

console.log('[post-install] Complete!');
```

### 4.3 post-upgrade.js

升级后执行，用于：
- 配置 schema 迁移
- 数据格式更新

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, 'zylos/components/<component>/config.json');

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let migrated = false;

  // Migration: 添加新字段
  if (config.newField === undefined) {
    config.newField = 'default';
    migrated = true;
  }

  if (migrated) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[post-upgrade] Config migrated');
  }
}

console.log('[post-upgrade] Complete!');
```

---

## 五、配置规范

### 5.1 config.json 结构

```json
{
  "enabled": true,
  "feature_flags": {},
  "settings": {}
}
```

### 5.2 环境变量 (~/zylos/.env)

密钥统一放在 .env：

```bash
# 组件名大写 + 下划线
<COMPONENT>_API_KEY=xxx
<COMPONENT>_SECRET=xxx
```

### 5.3 配置加载模块 (src/lib/config.js)

```javascript
const fs = require('fs');
const path = require('path');

// 加载 .env
const envPath = path.join(process.env.HOME, 'zylos', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const CONFIG_PATH = path.join(process.env.HOME, 'zylos/components/<component>/config.json');

const DEFAULT_CONFIG = {
  enabled: true,
  // ...
};

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (err) {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

module.exports = { loadConfig, saveConfig, getEnv, CONFIG_PATH };
```

---

## 六、通讯组件规范

通讯组件需额外实现 C4 接口。

### 6.1 send.js 接口

位置: 组件根目录 `send.js`

```bash
# 调用方式
node send.js <endpoint_id> "<message>"

# 返回
# 0: 成功
# 非0: 失败
```

### 6.2 消息格式

**接收方向** (外部 → Claude):
```
[<SOURCE> <TYPE>] <username> said: <message>

# 示例
[TG DM] howardzhou said: 你好
[TG GROUP:研发群] howardzhou said: @bot 帮我查一下
```

**发送方向** (Claude → 外部):
```bash
# 纯文本
send.js "12345" "Hello"

# 媒体文件 (使用前缀)
send.js "12345" "[MEDIA:image]/path/to/image.jpg"
send.js "12345" "[MEDIA:file]/path/to/document.pdf"
```

### 6.3 媒体文件存储

媒体文件存储在组件数据目录:
```
~/zylos/components/<component>/media/
```

---

## 七、PM2 服务配置

### 7.1 ecosystem.config.js

```javascript
const path = require('path');
const os = require('os');

module.exports = {
  apps: [{
    name: 'zylos-<component>',
    script: 'src/index.js',
    cwd: path.join(os.homedir(), '.claude/skills/<component>'),
    env: {
      NODE_ENV: 'production'
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    error_file: path.join(os.homedir(), 'zylos/components/<component>/logs/error.log'),
    out_file: path.join(os.homedir(), 'zylos/components/<component>/logs/out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

---

## 八、版本管理

### 8.1 版本号规范

使用 [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH
- 例: 1.0.0, 1.1.0, 1.1.1

### 8.2 CHANGELOG.md 规范

```markdown
# Changelog

## [x.y.z] - YYYY-MM-DD

### Added
- 新功能

### Changed
- 变更

### Fixed
- 修复

### Upgrade Notes
升级注意事项
```

---

## 九、验收标准

- [ ] SKILL.md 包含完整元数据
- [ ] README.md 说明清晰
- [ ] CHANGELOG.md 记录版本历史
- [ ] hooks/post-install.js 正确创建数据目录和配置
- [ ] hooks/post-upgrade.js 处理配置迁移
- [ ] 配置与代码分离 (config.json + .env)
- [ ] PM2 可管理启停 (如有服务)
- [ ] `zylos install <component>` 可在全新环境完成安装
- [ ] `zylos upgrade <component>` 保留用户配置

---

## 十、参考实现

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram) - 通讯组件参考实现

---

*文档结束*

# AI 组件开发指南

本文档指导 AI 助手使用此模板创建新的 zylos 组件。

## 快速开始

当用户要求创建新组件时，按以下步骤执行：

### 步骤 1: 复制模板

**快捷命令 (推荐):**
```bash
cd ~/src && git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone && cp -r temp-clone/template zylos-<name> && rm -rf temp-clone && cd zylos-<name>
```

**或分步执行:**
```bash
cd ~/src
git clone https://github.com/zylos-ai/zylos-component-template.git temp-clone
cp -r temp-clone/template zylos-<name>
rm -rf temp-clone
cd zylos-<name>
```

### 步骤 2: 确定组件信息

向用户确认：
- **名称**: 小写，如 `discord`, `slack`
- **描述**: 一句话描述
- **类型**: `communication` | `capability` | `utility`

### 步骤 3: 替换占位符

在所有文件中替换：

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{COMPONENT_NAME}}` | 组件名(小写) | `discord` |
| `{{COMPONENT_NAME_UPPER}}` | 组件名(大写) | `DISCORD` |
| `{{COMPONENT_TITLE}}` | 组件标题 | `Discord` |
| `{{COMPONENT_DESCRIPTION}}` | 组件描述 | `Discord bot integration` |
| `{{COMPONENT_TYPE}}` | 组件类型 | `communication` |
| `{{DATE}}` | 当前日期 | `2026-02-04` |

### 步骤 4: 处理组件类型

如果不是 `communication` 类型，删除 send.js：
```bash
rm -f send.js
```

### 步骤 5: 实现组件逻辑

根据组件类型，实现核心逻辑：

**communication 类型**:
- `src/index.js` - 消息接收服务
- `send.js` - 消息发送接口

**capability 类型**:
- `src/index.js` - 主服务逻辑

**utility 类型**:
- `src/index.js` - 工具逻辑 (可能不需要常驻服务)

### 步骤 6: 初始化 Git

```bash
git init
git add .
git commit -m "Initial commit: zylos-<name>"
git remote add origin git@github.com:zylos-ai/zylos-<name>.git
git push -u origin main
```

## 模板文件结构

```
template/
├── SKILL.md              # 组件元数据，zylos CLI 读取
├── README.md             # 用户文档
├── CHANGELOG.md          # 版本历史
├── package.json          # npm 依赖
├── ecosystem.config.js   # PM2 配置
├── send.js               # C4 发送接口 (仅 communication)
├── hooks/
│   ├── post-install.js   # 安装后钩子
│   ├── pre-upgrade.js    # 升级前钩子
│   └── post-upgrade.js   # 升级后钩子
└── src/
    ├── index.js          # 主入口
    └── lib/
        └── config.js     # 配置加载
```

## 目录规范

```
代码: ~/.claude/skills/<component>/
数据: ~/zylos/components/<component>/
密钥: ~/zylos/.env
```

## send.js 接口 (communication 类型)

```bash
# 发送文本
./send.js <endpoint_id> "消息内容"

# 发送媒体
./send.js <endpoint_id> "[MEDIA:image] /path/to/image.png"
./send.js <endpoint_id> "[MEDIA:file] /path/to/file.pdf"
```

## 验收清单

完成组件后，确认：

- [ ] SKILL.md 元数据完整
- [ ] README.md 说明清晰
- [ ] `npm install && npm start` 可运行
- [ ] post-install.js 创建数据目录和默认配置
- [ ] post-upgrade.js 处理配置迁移
- [ ] PM2 可管理服务
- [ ] (communication) send.js 接口可用

## 参考实现

- [zylos-telegram](https://github.com/zylos-ai/zylos-telegram)

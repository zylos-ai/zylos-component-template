# Zylos Component Template

创建 zylos 组件的标准模板。

## 使用方式

### AI 开发 (推荐)

让 AI 助手阅读 [CLAUDE.md](./CLAUDE.md) 后执行：

> "使用 zylos-component-template 创建一个 xxx 组件"

### 手动开发

```bash
git clone https://github.com/zylos-ai/zylos-component-template.git zylos-mycomponent
cd zylos-mycomponent
./init.sh mycomponent "组件描述" communication
```

## 组件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `communication` | 通讯组件 | telegram, discord |
| `capability` | 能力组件 | browser, knowledge-base |
| `utility` | 工具组件 | 辅助工具 |

## 模板文件

```
├── SKILL.md.template         # 组件元数据
├── README.md.template        # 用户文档
├── CHANGELOG.md.template     # 版本历史
├── package.json.template     # npm 配置
├── ecosystem.config.js.template  # PM2 配置
├── send.js.template          # C4 接口 (仅 communication)
├── hooks/
│   ├── post-install.js.template  # 安装钩子
│   └── post-upgrade.js.template  # 升级钩子
└── src/
    ├── index.js.template     # 主入口
    └── lib/
        └── config.js.template    # 配置加载
```

## 文档

- [CLAUDE.md](./CLAUDE.md) - AI 开发指南
- [COMPONENT-SPEC.md](./COMPONENT-SPEC.md) - 完整开发规范

## 参考实现

[zylos-telegram](https://github.com/zylos-ai/zylos-telegram)

## License

MIT

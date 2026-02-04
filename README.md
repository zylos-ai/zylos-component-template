# Zylos Component Template

创建 zylos 组件的标准模板。

## 使用方式

### AI 开发 (推荐)

让 AI 助手阅读 [CLAUDE.md](./CLAUDE.md) 后执行：

> "使用 zylos-component-template 创建一个 xxx 组件"

### 手动开发

```bash
git clone https://github.com/zylos-ai/zylos-component-template.git temp
cp -r temp/template zylos-mycomponent
rm -rf temp
cd zylos-mycomponent
# 手动替换 {{COMPONENT_NAME}} 等占位符
```

或使用初始化脚本：
```bash
git clone https://github.com/zylos-ai/zylos-component-template.git
cd zylos-component-template
./init.sh mycomponent "组件描述" communication
# 组件创建在 ../zylos-mycomponent/
```

## 组件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `communication` | 通讯组件 | telegram, discord |
| `capability` | 能力组件 | browser, knowledge-base |
| `utility` | 工具组件 | 辅助工具 |

## 项目结构

```
├── CLAUDE.md             # AI 开发指南
├── README.md             # 本文件
├── COMPONENT-SPEC.md     # 完整开发规范
├── init.sh               # 手动初始化脚本
└── template/             # 组件模板文件
    ├── SKILL.md
    ├── README.md
    ├── CHANGELOG.md
    ├── package.json
    ├── ecosystem.config.js
    ├── send.js
    ├── hooks/
    └── src/
```

## 参考实现

[zylos-telegram](https://github.com/zylos-ai/zylos-telegram)

## License

MIT

# RCC项目标准目录架构

## 📁 标准目录结构

```
rcc/
├── .claude/                     # Claude Code配置和文档
│   ├── agents/                  # 代理配置
│   ├── scripts/                 # 脚本工具
│   ├── rules/                   # 规则文件
│   └── scan-reports/            # 扫描报告
├── .git/                        # Git版本控制
├── .codebuddy/                  # CodeBuddy配置
├── .iflow/                      # iFlow配置
├── .rcc/                        # RCC配置（临时保留）
├── archives/                    # 归档文件
├── config/                      # 配置文件目录
│   ├── config.json             # 主配置文件
│   └── provider.json           # 提供商配置
├── dist/                        # 构建输出
├── docs/                        # 项目文档
│   ├── configuration/           # 配置文档
│   ├── design-doc/              # 设计文档
│   └── transformation-tables/   # 转换表
├── examples/                    # 示例代码
├── node_modules/                # Node.js依赖
├── scripts/                     # 构建和工具脚本
├── sharedmodule/                # RCC模块目录
├── src/                         # 源代码目录
├── system-config/               # 内部系统配置
├── tests/                       # 测试文件
├── tools/                       # 工具脚本
├── tmp/                         # 临时文件
├── types/                       # 类型定义
├── package.json                 # 项目配置
├── package-lock.json           # 依赖锁定
├── README.md                   # 主文档
├── CLAUDE.md                   # 开发指引
├── rules.md                    # 规则文档
├── todo.md                     # 任务清单
├── LICENSE                     # 许可证
└── rollup.config.*             # 构建配置
```

## 📋 目录用途说明

### 核心开发目录
- **src/** - 主要源代码
- **sharedmodule/** - RCC模块
- **examples/** - 示例代码
- **tests/** - 测试文件

### 配置和工具
- **config/** - 项目配置文件
- **system-config/** - 内部系统配置
- **scripts/** - 自动化脚本
- **tools/** - 开发工具

### 文档和资源
- **docs/** - 项目文档
- **.claude/** - Claude Code相关
- **types/** - TypeScript定义

### 构建和临时
- **dist/** - 构建输出
- **tmp/** - 临时文件
- **archives/** - 归档文件

## 🚀 文件创建规则

### 允许在根目录创建的文件
- package.json, package-lock.json
- README.md, CLAUDE.md, rules.md, todo.md
- LICENSE
- tsconfig.json, rollup.config.*
- rcc, rcc.mjs (可执行文件)

### 必须在子目录的文件类型
- 测试文件 → tests/
- 示例代码 → examples/
- 工具脚本 → tools/
- 配置文件 → config/ 或 system-config/
- 文档 → docs/
- 构建产物 → dist/

### 特殊目录
- **.rcc/** - 临时保留，计划迁移
- **archives/** - 用于归档旧版本或废弃文件
- **tmp/** - 临时文件，可定期清理

## 📝 维护指南

### 新文件创建
1. 检查是否属于现有目录分类
2. 如需新目录，评估其必要性
3. 更新此架构文档

### 定期清理
- tmp/ 目录可定期清空
- archives/ 目录中的过期文件可删除
- dist/ 目录中的旧版本可清理

### 架构变更
- 重大变更需团队评审
- 保持向后兼容性
- 及时更新文档
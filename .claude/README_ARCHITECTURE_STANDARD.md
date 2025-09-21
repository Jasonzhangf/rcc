# RCC README 文件架构标准化规范

## 概述

本文档定义了RCC项目中README文件的标准格式，用于自动化文件允许系统的架构解析和模块管理。

## 标准架构格式

### 1. 架构部分标识

README文件必须包含一个标准化的架构部分，使用以下标识：

```markdown
## 📁 Module Structure & File Purpose

或者

## 📁 File Architecture & Purpose
```

### 2. 架构格式标准

架构部分必须使用以下结构之一：

#### 格式A：树形结构（推荐）
```markdown
## 📁 Module Structure & File Purpose

```
module-root/
├── directory/                    # Directory purpose description
│   ├── file1.ext                # File purpose (line count)
│   │   ├── Specific feature 1
│   │   ├── Specific feature 2
│   │   └── Specific feature 3
│   ├── file2.ext                # File purpose (line count)
│   ├── subdir/                  # Subdirectory purpose
│   │   └── file3.ext            # File purpose
│   └── file4.ext                # File purpose (line count)
├── directory2/                   # Directory purpose description
│   └── file5.ext                # File purpose
└── config.json                   # Configuration file purpose
```
```

#### 格式B：表格结构
```markdown
## 📁 File Architecture & Purpose

| Path | Type | Purpose | Lines | Description |
|------|------|---------|-------|-------------|
| `src/index.ts` | file | Module entry point | 120 | Main exports and initialization |
| `src/components/` | directory | React components | - | Contains all UI components |
| `src/utils/` | directory | Utility functions | - | Helper functions and utilities |
| `package.json` | file | Dependencies | 45 | Project dependencies and scripts |
```

### 3. 文件描述标准

每个文件/目录必须包含以下信息：

#### 文件描述
```markdown
filename.ext                 # Brief purpose description (line count)
```

#### 目录描述
```markdown
directory/                   # Directory purpose description
```

#### 详细功能描述（可选）
```markdown
filename.ext                # File purpose (line count)
    ├── Specific feature 1 description
    ├── Specific feature 2 description
    └── Specific feature 3 description
```

### 4. 标准化字段

#### 必需字段
- **Path**: 文件/目录路径
- **Type**: `file` 或 `directory`
- **Purpose**: 简洁的功能描述
- **Description**: 详细描述（可选）

#### 可选字段
- **Lines**: 文件行数（仅对文件）
- **Features**: 功能特性列表
- **Dependencies**: 依赖关系
- **Category**: 文件分类（`source`, `config`, `test`, `docs`, `build`）

### 5. 文件分类标准

文件应按照以下标准分类：

| 分类 | 描述 | 示例 |
|------|------|------|
| `source` | 源代码文件 | `.ts`, `.js`, `.tsx`, `.jsx` |
| `config` | 配置文件 | `.json`, `.yaml`, `.toml`, `.env` |
| `test` | 测试文件 | `.test.ts`, `.spec.js`, `__tests__/` |
| `docs` | 文档文件 | `.md`, `.txt`, `.html` |
| `build` | 构建输出 | `dist/`, `build/`, `*.d.ts` |
| `assets` | 资源文件 | `images/`, `styles/`, `fonts/` |
| `scripts` | 脚本文件 | `.sh`, `.py`, `.js` (工具脚本) |
| `data` | 数据文件 | `.csv`, `.json` (数据), `.xml` |

### 6. 解析规则

#### 路径标准化
- 使用相对于模块根目录的路径
- 目录路径以 `/` 结尾
- 文件路径包含扩展名
- 使用正斜杠 `/` 作为路径分隔符

#### 描述标准化
- 描述应该简洁明了
- 避免使用模糊的描述如 "other files"
- 使用动词开头描述功能
- 标点符号统一使用英文标点

#### 示例

**正确的描述：**
```
src/index.ts                 # Module entry point and main exports (120)
src/components/Button.tsx   # Reusable button component with variants (85)
config/default.json          # Default configuration settings (45)
```

**不正确的描述：**
```
index.ts                    # some file
other/                      # other files
stuff.js                    # does something
```

### 7. 特殊标记

#### 必需文件标记
使用 `[REQUIRED]` 标记必需文件：
```markdown
package.json                # [REQUIRED] Project dependencies and scripts
README.md                   # [REQUIRED] Module documentation
```

#### 生成文件标记
使用 `[GENERATED]` 标记自动生成的文件：
```markdown
dist/index.js               # [GENERATED] Compiled JavaScript output
types.d.ts                  # [GENERATED] TypeScript declarations
```

#### 只读文件标记
使用 `[READ-ONLY]` 标记只读文件：
```markdown
node_modules/               # [READ-ONLY] Third-party dependencies
.gitignore                  # [READ-ONLY] Git ignore rules
```

### 8. 架构解析示例

#### 输入README片段
```markdown
## 📁 Module Structure & File Purpose

```
sharedmodule/mymodule/
├── src/                      # Source code directory
│   ├── index.ts             # Module entry point (120)
│   │   ├── Main exports
│   │   ├── Initialization logic
│   │   └── Configuration handling
│   ├── components/          # React components directory
│   │   ├── Button.tsx       # Reusable button component (85)
│   │   ├── Modal.tsx        # Modal dialog component (120)
│   │   └── index.ts         # Component exports (15)
│   ├── utils/               # Utility functions
│   │   ├── helpers.ts       # Helper functions (45)
│   │   └── constants.ts     # Constants and enums (30)
│   └── types/               # TypeScript type definitions
│       └── index.ts         # Type exports (25)
├── tests/                   # Test suite directory
│   ├── index.test.ts        # Main module tests (200)
│   └── components.test.ts   # Component tests (150)
├── docs/                    # Documentation
│   └── API.md              # API documentation (300)
├── package.json            # [REQUIRED] Module configuration (45)
└── README.md               # [REQUIRED] Module documentation (500)
```
```

#### 解析后的JSON结构
```json
{
  "module": "sharedmodule/mymodule",
  "structure": {
    "src/": {
      "type": "directory",
      "purpose": "Source code directory",
      "description": "Source code directory",
      "category": "source",
      "children": {
        "index.ts": {
          "type": "file",
          "purpose": "Module entry point",
          "description": "Module entry point (120)",
          "lines": 120,
          "category": "source",
          "features": ["Main exports", "Initialization logic", "Configuration handling"]
        },
        "components/": {
          "type": "directory",
          "purpose": "React components directory",
          "description": "React components directory",
          "category": "source",
          "children": {
            "Button.tsx": {
              "type": "file",
              "purpose": "Reusable button component",
              "description": "Reusable button component (85)",
              "lines": 85,
              "category": "source"
            },
            "Modal.tsx": {
              "type": "file",
              "purpose": "Modal dialog component",
              "description": "Modal dialog component (120)",
              "lines": 120,
              "category": "source"
            },
            "index.ts": {
              "type": "file",
              "purpose": "Component exports",
              "description": "Component exports (15)",
              "lines": 15,
              "category": "source"
            }
          }
        }
      }
    }
  }
}
```

### 9. 自动化工具支持

本规范设计为与自动化工具兼容，支持：
- 自动解析README架构部分
- 生成文件允许列表JSON
- 验证文件创建权限
- 检测架构变更

### 10. 维护指南

#### 更新架构
- 添加新文件时立即更新README架构
- 删除文件时同步更新架构描述
- 定期验证架构与实际文件的一致性

#### 验证工具
使用提供的验证工具检查README架构格式：
```bash
npm run validate-readme-architecture
```

#### 版本控制
- 架构变更应提交到版本控制
- 重大架构变更需要团队评审
- 保持架构描述的时效性

## 📋 RCC README 标准模板

### 完整模板结构

基于`README_STANDARD_TEMPLATE.md`文件，RCC模块README必须包含以下标准部分：

1. **标题和徽章** - 模块名称、版本徽章、构建状态
2. **🎯 Overview** - 模块概述和主要功能
3. **🏗️ Core Architecture** - 核心架构说明
4. **📁 Module Structure & File Purpose** - 标准架构部分（必需）
5. **📦 Installation** - 安装说明
6. **🚀 Quick Start** - 快速开始
7. **🔧 Configuration** - 配置说明
8. **📚 API Reference** - API参考
9. **🔄 Core Concepts** - 核心概念
10. **🧪 Testing** - 测试说明
11. **📖 Examples** - 示例代码
12. **🔍 Troubleshooting** - 故障排除
13. **🤝 Contributing** - 贡献指南
14. **📄 License** - 许可证
15. **📞 Support** - 支持信息

### 必需的标准架构部分

```markdown
## 📁 Module Structure & File Purpose

```
sharedmodule/[module-name]/
├── src/                          # Source code directory
│   ├── [MainFile].ts            # Main module entry point ([line count] lines)
│   │   ├── Key feature 1 description
│   │   ├── Key feature 2 description
│   │   └── Key feature 3 description
│   ├── components/               # Component modules
│   │   ├── [Component1].ts     # Component description ([line count] lines)
│   │   ├── [Component2].ts     # Component description ([line count] lines)
│   │   └── [Component3].ts     # Component description ([line count] lines)
│   ├── interfaces/              # Type definitions and interfaces
│   │   ├── [Interface1].ts     # Interface description ([line count] lines)
│   │   ├── [Interface2].ts     # Interface description ([line count] lines)
│   │   └── [Interface3].ts     # Interface description ([line count] lines)
│   ├── utils/                   # Utility functions
│   │   ├── [Util1].ts          # Utility description ([line count] lines)
│   │   ├── [Util2].ts          # Utility description ([line count] lines)
│   │   └── [Util3].ts          # Utility description ([line count] lines)
│   └── index.ts                 # Module exports ([line count] lines)
├── __test__/                     # Test suite directory
│   ├── [Module].test.ts         # Main module tests ([line count] lines)
│   ├── [Component].test.ts      # Component tests ([line count] lines)
│   └── integration/             # Integration tests
│       └── [Integration].test.ts # Integration scenarios ([line count] lines)
├── docs/                         # Additional documentation
│   ├── API.md                   # API documentation ([line count] lines)
│   ├── EXAMPLES.md              # Usage examples ([line count] lines)
│   └── TROUBLESHOOTING.md       # Troubleshooting guide ([line count] lines)
├── scripts/                      # Build and utility scripts
│   ├── build.sh                 # Build script ([line count] lines)
│   └── test.sh                  # Test runner script ([line count] lines)
├── dist/                         # Build outputs (CJS, ESM, types)
├── examples/                     # Usage examples
│   └── basic-usage.ts           # Basic usage example ([line count] lines)
├── package.json                  # Module configuration and dependencies
└── README.md                     # This file
```
```

### 模块文件分类标准

| 目录 | 用途 | 文件类型 | 示例 |
|------|------|----------|------|
| `src/` | 源代码 | `.ts`, `.js` | `MainModule.ts`, `components/` |
| `__test__/` | 测试文件 | `.test.ts`, `.spec.ts` | `Module.test.ts` |
| `docs/` | 文档 | `.md` | `API.md`, `EXAMPLES.md` |
| `scripts/` | 构建脚本 | `.sh`, `.js`, `.mjs` | `build.sh`, `test.sh` |
| `examples/` | 示例代码 | `.ts`, `.js` | `basic-usage.ts` |
| `dist/` | 构建输出 | `.js`, `.d.ts` | (构建生成) |

### 文件描述规范

#### 标准格式
```
filename.ext                 # Brief purpose description ([line count] lines)
    ├── Specific feature 1 description
    ├── Specific feature 2 description
    └── Specific feature 3 description
```

#### 目录格式
```
directory/                   # Directory purpose description
```

#### 行数统计
- 所有源代码文件必须包含行数统计
- 格式：`([line count] lines)`
- 行数应为当前文件的准确行数

### 自动化解析支持

本标准设计为与以下工具兼容：
- `.claude/scripts/readme-architecture-parser.sh` - 架构解析脚本
- `.claude/file-architecture.json` - 文件权限控制
- Hook脚本系统 - 文件创建验证

### 验证和部署

#### 验证命令
```bash
# 验证README架构格式
.bash/scripts/readme-architecture-parser.sh --readme sharedmodule/[module]/README.md

# 验证文件权限
.bash/scripts/file-allowlist-validator.sh validate
```

#### 部署流程
1. 使用模板创建README
2. 填写架构部分（必需）
3. 运行验证工具
4. 提交到版本控制
5. 更新文件权限系统
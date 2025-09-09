# JSON 白名单管理系统

## 概述

系统已经升级为使用 JSON 格式的白名单文件，提供更好的可读性和手动管理功能。用户可以直接编辑 JSON 文件或使用命令行工具来管理白名单。

## 文件结构

### JSON 白名单文件
**位置**: `.claude/file-allowlist.json`

```json
{
  "file_creation_allowlist": {
    "meta": {
      "version": "1.0.0",
      "last_updated": "2024-01-15T10:30:00Z",
      "description": "File creation whitelist for RCC project",
      "managed_by": "claude-hooks"
    },
    "directories": [
      {
        "path": "src/",
        "description": "Source code directory",
        "allowed": true,
        "subdirectories": true,
        "notes": "All source code files and modules"
      }
      // ... 其他目录
    ],
    "file_patterns": [
      {
        "pattern": "*.ts",
        "description": "TypeScript source files",
        "allowed": true,
        "notes": "All TypeScript files"
      }
      // ... 其他文件模式
    ],
    "specific_files": [
      {
        "path": "package.json",
        "description": "NPM package configuration",
        "allowed": true,
        "notes": "Node.js package configuration"
      }
      // ... 其他特定文件
    ],
    "temporary_files": {
      "directory": "tmp/",
      "description": "Temporary files directory",
      "allowed": true,
      "auto_cleanup": true,
      "max_age_days": 7,
      "notes": "All temporary and scratch files must be created here"
    },
    "rules": {
      "case_sensitive": false,
      "allow_subdirectories": true,
      "require_explicit_allow": true,
      "block_temp_files_outside_tmp": true,
      "log_all_attempts": true
    }
  }
}
```

## JSON 白名单结构说明

### 1. 元数据 (meta)
```json
"meta": {
  "version": "1.0.0",           // 白名单版本
  "last_updated": "2024-01-15T10:30:00Z",  // 最后更新时间
  "description": "File creation whitelist for RCC project",  // 描述
  "managed_by": "claude-hooks"  // 管理工具
}
```

### 2. 目录配置 (directories)
```json
"directories": [
  {
    "path": "src/",                    // 目录路径
    "description": "Source code directory",  // 描述
    "allowed": true,                    // 是否允许
    "subdirectories": true,              // 是否包含子目录
    "notes": "All source code files and modules"  // 备注
  }
]
```

### 3. 文件模式 (file_patterns)
```json
"file_patterns": [
  {
    "pattern": "*.ts",                // 文件模式
    "description": "TypeScript source files",  // 描述
    "allowed": true,                 // 是否允许
    "notes": "All TypeScript files"   // 备注
  }
]
```

### 4. 特定文件 (specific_files)
```json
"specific_files": [
  {
    "path": "package.json",           // 文件路径
    "description": "NPM package configuration",  // 描述
    "allowed": true,                 // 是否允许
    "notes": "Node.js package configuration"  // 备注
  }
]
```

### 5. 临时文件配置 (temporary_files)
```json
"temporary_files": {
  "directory": "tmp/",               // 临时文件目录
  "description": "Temporary files directory",  // 描述
  "allowed": true,                   // 是否允许
  "auto_cleanup": true,               // 自动清理
  "max_age_days": 7,                 // 最大保存天数
  "notes": "All temporary and scratch files must be created here"  // 备注
}
```

### 6. 规则配置 (rules)
```json
"rules": {
  "case_sensitive": false,           // 大小写敏感
  "allow_subdirectories": true,       // 允许子目录
  "require_explicit_allow": true,    // 明确允许要求
  "block_temp_files_outside_tmp": true,  // 阻止临时文件离开tmp目录
  "log_all_attempts": true           // 记录所有尝试
}
```

## 手动管理白名单

### 1. 直接编辑 JSON 文件
用户可以直接编辑 `.claude/file-allowlist.json` 文件：

```bash
# 使用你喜欢的编辑器
nano .claude/file-allowlist.json
vim .claude/file-allowlist.json
code .claude/file-allowlist.json
```

#### 添加新的目录
```json
{
  "path": "custom/",
  "description": "Custom directory for user files",
  "allowed": true,
  "subdirectories": true,
  "notes": "User-specific files and data"
}
```

#### 添加新的文件模式
```json
{
  "pattern": "*.xml",
  "description": "XML configuration files",
  "allowed": true,
  "notes": "XML data and configuration files"
}
```

#### 添加新的特定文件
```json
{
  "path": "config/custom.json",
  "description": "Custom configuration file",
  "allowed": true,
  "notes": "User-specific configuration"
}
```

### 2. JSON 编辑注意事项
- 确保 JSON 格式正确（可以使用 `jq` 工具验证）
- 每条记录都需要 `allowed: true` 才会被允许
- 路径应该以 `/` 结尾表示目录
- 文件模式应该以 `*.` 开头表示扩展名
- 修改后系统会立即生效

## 命令行工具

### 基础验证命令
```bash
# 验证文件是否允许创建
./file-allowlist-validator.sh validate src/test.ts
./file-allowlist-validator.sh validate unauthorized.txt
```

### 白名单管理命令
```bash
# 显示当前白名单（JSON 格式）
./file-allowlist-validator.sh list

# 添加特定文件到白名单
./file-allowlist-validator.sh add-file "config/custom.json"

# 添加目录到白名单（自动添加尾随斜杠）
./file-allowlist-validator.sh add-dir "custom/"

# 添加文件模式到白名单
./file-allowlist-validator.sh add-pattern "*.xml"

# 使用通用添加命令
./file-allowlist-validator.sh add "config/custom.json" "specific_file"
./file-allowlist-validator.sh add "custom/" "directory"
./file-allowlist-validator.sh add "*.xml" "file_pattern"
```

### 信息查看命令
```bash
# 查看 JSON 白名单信息
./file-allowlist-validator.sh json-info

# 查看访问日志
./file-allowlist-validator.sh logs
```

## 验证优先级

系统按照以下顺序验证文件：

1. **特定文件** (specific_files) - 精确匹配文件路径
2. **目录** (directories) - 检查文件是否在允许的目录中
3. **文件模式** (file_patterns) - 检查文件扩展名
4. **临时文件目录** (temporary_files) - 检查是否在临时文件目录中

## 示例场景

### 场景 1: 允许新的配置文件
```json
{
  "path": "config/database.json",
  "description": "Database configuration file",
  "allowed": true,
  "notes": "Database connection settings"
}
```

### 场景 2: 允许新的文件类型
```json
{
  "pattern": "*.xml",
  "description": "XML configuration files",
  "allowed": true,
  "notes": "XML data and configuration files"
}
```

### 场景 3: 允许新的目录
```json
{
  "path": "data/",
  "description": "Data files directory",
  "allowed": true,
  "subdirectories": true,
  "notes": "User data and configuration files"
}
```

## 错误处理

### 常见错误和解决方案

#### 1. JSON 格式错误
```bash
# 验证 JSON 格式
jq . .claude/file-allowlist.json

# 错误示例
parse error: Expected string key before colon at line 25, column 15
# 解决方案：检查 JSON 语法，确保引号、括号、逗号正确
```

#### 2. 重复条目
```bash
# 系统会使用第一个匹配的条目
# 确保没有冲突的条目定义
```

#### 3. 路径匹配问题
```bash
# 确保目录路径以 / 结尾
# 确保文件路径不包含多余的 / 或 ..
```

## 最佳实践

### 1. 定期备份
```bash
# 手动备份
cp .claude/file-allowlist.json .claude/file-allowlist.json.backup

# 系统会自动创建 .bak 文件
```

### 2. 版本控制
```bash
# 将白名单文件纳入版本控制
git add .claude/file-allowlist.json
git commit -m "Update file allowlist"
```

### 3. 定期审查
- 定期检查白名单中的条目是否仍然需要
- 移除不再需要的条目
- 更新描述和备注以保持准确性

### 4. 测试更改
```bash
# 每次修改后测试
./file-allowlist-validator.sh validate new-file.json
./file-allowlist-validator.sh validate temp_file.txt
```

## 向后兼容性

系统仍然支持旧的文本格式白名单（`.claude/file-allowlist.txt`），但推荐使用 JSON 格式：

- JSON 格式优先级更高
- 如果 JSON 文件存在，会优先使用 JSON 格式
- 旧格式仍然有效，但功能有限

## 故障排除

### jq 工具缺失
如果系统中没有 `jq` 工具，可以安装：

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

或者系统会自动回退到旧的文本格式。

### 权限问题
```bash
# 确保脚本可执行
chmod +x .claude/scripts/file-allowlist-validator.sh

# 确保白名单文件可读可写
chmod 644 .claude/file-allowlist.json
```

这个 JSON 白名单管理系统提供了强大而灵活的文件创建控制，同时保持了易用性和可维护性。
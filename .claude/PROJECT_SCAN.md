# 项目扫描机制架构设计

## 🎯 扫描目标

1. **Mock检测**: 检查代码中是否包含"mock"字样（可能表示测试代码混入生产代码）
2. **硬编码检测**: 检查是否存在硬编码的值（应该使用常量）
3. **API一致性检测**: 验证模块是否符合BaseModule标准和API注册表规范
4. **模块目录结构验证**: 检查模块目录是否符合最新标准，确保遵循模块创建规范
5. **完整性验证**: 确保模块实现与API注册表中的声明保持一致

## 🏗️ 系统架构

```
项目根目录/
├── .claude/
│   ├── PROJECT_SCAN.md                 # 扫描机制文档
│   ├── scripts/
│   │   ├── project-scanner.sh          # 主扫描脚本
│   │   ├── mock-detector.sh            # Mock检测脚本
│   │   ├── hardcode-detector.sh        # 硬编码检测脚本
│   │   ├── api-validator.sh            # API一致性检测脚本
│   │   ├── module-structure-validator.sh # 模块结构验证脚本
│   │   └── scan-report-generator.sh    # 报告生成器
│   ├── config/
│   │   └── api-standards.json          # API标准定义
│   └── scan-reports/                   # 扫描报告目录
└── src/
    ├── modules/                        # 模块目录
    └── core/                          # 核心模块
```

## 🔍 扫描组件说明

### 1. Mock检测器 (mock-detector.sh)
**检测内容**:
- 文件中包含"mock"、"Mock"、"MOCK"等字样
- 排除合法的注释和文档中的使用
- 重点关注实现代码中的mock使用

### 2. 硬编码检测器 (hardcode-detector.sh)
**检测内容**:
- 数字常量（除0, 1, -1外的数字）
- 字符串字面量（URL、路径、配置值等）
- 魔数和魔法字符串
- 应该使用常量定义的地方

### 3. API一致性检测器 (api-validator.sh)
**检测内容**:
- 模块接口方法签名是否符合BaseModule标准
- 模块继承BaseModule的正确性
- API实现与注册表(.claude/module-api-registry.json)的一致性
- 模块必需方法(initialize, destroy, handshake)的实现
- 模块属性(getModuleInfo, moduleConfig)的完整性
- 命名约定(PascalCase类名, camelCase方法名)的遵循情况

### 4. 模块结构验证器 (module-structure-validator.sh)
**检测内容**:
- 模块目录结构是否完整（符合MODULE_API_STANDARDS_IMPLEMENTATION.md规范）
- 必需目录是否存在（src/, __test__/, constants/, interfaces/, types/）
- 必需文件是否存在（README.md, src/index.ts, 测试文件等）
- 文件命名规范是否符合（PascalCase类名, camelCase文件名）
- 模块是否遵循最新的API注册表标准
- README.md文档是否包含必需章节（Description, Installation, API, Usage）

## 📊 报告格式

### 扫描报告结构
```json
{
  "scan_timestamp": "2024-01-15T10:30:00Z",
  "project_path": "/path/to/project",
  "total_files_scanned": 125,
  "violations": {
    "mock_violations": [],
    "hardcode_violations": [],
    "api_violations": [],
    "structure_violations": []
  },
  "summary": {
    "total_violations": 0,
    "critical_violations": 0,
    "warning_violations": 0
  }
}
```

### 违规等级
- **❌ CRITICAL**: 严重违规，必须修复
- **⚠️ WARNING**: 警告级别，建议修复
- **ℹ️ INFO**: 信息提示，仅供参考

## 🚀 使用方式

### 命令行使用
```bash
# 完整扫描（包含API注册表验证）
./project-scanner.sh --full-scan

# 快速扫描（只扫描关键问题）
./project-scanner.sh --quick-scan

# 指定模块扫描
./project-scanner.sh --module ModuleName

# 扫描特定检查类型
./project-scanner.sh --check api,structure

# 生成详细报告
./project-scanner.sh --report detailed

# 验证API注册表一致性
./project-scanner.sh --check api-registry
```

### 模块管理集成

项目扫描机制与模块管理系统深度集成，提供完整的模块生命周期管理：

1. **创建模块时验证**: 确保新模块符合所有标准
2. **更新模块时验证**: 验证修改后的模块仍然符合标准
3. **删除模块时验证**: 确保移除模块不会破坏系统完整性
4. **API注册表同步**: 自动验证模块实现与API注册表的一致性

### 集成到CI/CD
```yaml
# GitHub Actions示例
- name: Project Scan
  run: |
    ./.claude/scripts/project-scanner.sh --full-scan
    if [ $? -ne 0 ]; then
      echo "Project scan found violations"
      exit 1
    fi
```

## 🛡️ 扫描规则配置

### API标准定义 (api-standards.json)
```json
{
  "base_module_standards": {
    "required_methods": ["initialize", "destroy", "handshake"],
    "required_interfaces": ["ModuleInfo", "ConnectionInfo"],
    "lifecycle_methods": ["initialize", "destroy"],
    "required_properties": ["getModuleInfo", "moduleConfig"]
  },
  "module_structure_standards": {
    "required_files": ["README.md", "__test__/", "src/"],
    "required_directories": ["__test__", "constants", "interfaces", "src"],
    "required_sections_in_readme": ["Description", "Installation", "API", "Usage"]
  }
}
```

### API注册表配置 (module-api-registry.json)
```json
{
  "module_apis": {
    "YourModule": {
      "module": {
        "name": "YourModule",
        "description": "模块描述",
        "version": "1.0.0",
        "basePath": "/api/yourmodule"
      },
      "endpoints": [
        {
          "name": "methodName",
          "description": "方法描述",
          "method": "POST",
          "path": "/method",
          "parameters": [
            {
              "name": "paramName",
              "type": "string",
              "description": "参数描述"
            }
          ],
          "returnType": "Promise<string>",
          "access": "public"
        }
      ]
    }
  }
}
```

### 注册表验证规则
- 每个模块必须在注册表中有对应的API定义
- 模块实现中的公共方法必须在注册表中声明
- 注册表中的方法签名必须与实现一致
- 当模块被删除时，对应的API定义也必须移除

## ⚙️ 可配置选项

### 扫描排除规则
```bash
# .claude/scan-exclude.txt
node_modules/
dist/
**/*.test.ts
**/*.spec.ts
.tmp/
```

### 严重等级配置
```bash
# .claude/scan-severity.conf
MOCK_DETECTION=CRITICAL
HARDCODE_DETECTION=WARNING
API_VIOLATION=CRITICAL
STRUCTURE_VIOLATION=WARNING
```

这个扫描机制将提供全面的项目质量控制，确保代码符合项目标准和最佳实践。
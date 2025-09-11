# 项目根目录清理计划报告

## 📊 当前状态分析

### 文件统计
- **根目录文件总数**: 50+ 个主要文件
- **测试文件**: 24 个（test-* 前缀）
- **目录总数**: 25+ 个目录

### 问题识别
1. **大量测试文件** - 根目录散落着 24 个测试文件
2. **重复文档** - 存在多个相似功能的大文档
3. **临时文件** - 存在临时和调试目录
4. **项目文件** - 根目录有过多项目相关文件

## 🗂️ 建议的清理计划

### 1. 测试文件整理（高优先级）
**问题**: 24 个 test-* 文件散落在根目录
**建议**:
```bash
# 移动到适当的测试目录
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p tests/manual

# 移动测试文件
mv test-*.js tests/e2e/
mv test-*.ts tests/integration/
```

### 2. 文档整理（中优先级）
**问题**: 多个大文档文件（ENHANCED_ERROR_RESPONSE_CENTER_*.md）
**建议**:
```bash
# 创建专门的文档目录
mkdir -p docs/architecture
mkdir -p docs/design

# 移动文档
mv ENHANCED_ERROR_RESPONSE_CENTER_*.md docs/architecture/
mv CONFIGURATION_MODULE_*.md docs/configuration/
```

### 3. 临时文件清理（中优先级）
**问题**: 临时和调试文件
**建议**:
```bash
# 清理临时文件
rm -f debug-logs/*.log 2>/dev/null || true
rm -f test-logs/*.log 2>/dev/null || true
rm -f webui-test-report.json

# 保留目录结构但清理内容
> debug-logs/.gitkeep
> test-logs/.gitkeep
```

### 4. 项目文件整理（低优先级）
**问题**: 根目录项目文件过多
**建议**:
```bash
# 移动配置相关文件到 config/
mv generate-final-report.js scripts/

# 移动独立脚本到 scripts/
mv rcc-cli.js scripts/
mv *.config.js config/
```

## 📋 具体清理步骤

### 第一步：测试文件整理
```bash
# 创建测试目录结构
mkdir -p tests/{integration,e2e,manual,unit}

# 移动 JavaScript 测试文件
mv test-qwen-*.js tests/e2e/
mv test-llmswitch.js tests/e2e/
mv test-*.js tests/manual/

# 移动 TypeScript 测试文件
mv test-qwen-*.ts tests/integration/

# 创建测试说明文件
cat > tests/README.md << 'EOF'
# 测试文件目录

## 目录结构
- e2e/ - 端到端测试文件
- integration/ - 集成测试文件
- manual/ - 手动测试脚本
- unit/ - 单元测试文件

## 文件说明
- test-qwen-*: Qwen Provider 相关测试
- test-llmswitch: LLM 切换测试
- test-auth: 认证相关测试
EOF
```

### 第二步：文档整理
```bash
# 创建文档目录结构
mkdir -p docs/{architecture,design,configuration,implementation}

# 移动大文档
mv ENHANCED_ERROR_RESPONSE_CENTER_*.md docs/architecture/
mv CONFIGURATION_MODULE_*.md docs/configuration/

# 创建文档索引
cat > docs/README.md << 'EOF'
# 项目文档

## 文档结构
- architecture/ - 架构设计文档
- design/ - 设计文档
- configuration/ - 配置相关文档
- implementation/ - 实现文档

## 主要文档
- 架构设计: docs/architecture/
- 配置管理: docs/configuration/
- 实现指南: docs/implementation/
EOF
```

### 第三步：临时文件清理
```bash
# 清理日志文件
find debug-logs/ -name "*.log" -delete 2>/dev/null || true
find test-logs/ -name "*.log" -delete 2>/dev/null || true

# 清理临时报告文件
rm -f webui-test-report.json
rm -f test-*-report.*

# 创建占位文件
echo "# Debug logs directory" > debug-logs/.gitkeep
echo "# Test logs directory" > test-logs/.gitkeep
```

### 第四步：项目文件整理
```bash
# 移动脚本文件
mv generate-final-report.js scripts/
mv rcc-cli.js scripts/

# 整理配置文件
mv *.config.js config/ 2>/dev/null || true

# 创建项目根目录 README
cat > PROJECT_STRUCTURE.md << 'EOF'
# 项目结构

## 主要目录
- src/ - 源代码
- tests/ - 测试文件
- docs/ - 文档
- scripts/ - 构建脚本
- config/ - 配置文件
- sharedmodule/ - 共享模块
- .claude/ - Claude 配置

## 测试文件
- tests/e2e/ - 端到端测试
- tests/integration/ - 集成测试
- tests/manual/ - 手动测试
- tests/unit/ - 单元测试

## 文档
- docs/architecture/ - 架构文档
- docs/configuration/ - 配置文档
- docs/design/ - 设计文档
EOF
```

## 📈 预期效果

### 清理后效果
- **根目录文件**: 从 50+ 减少到 15-20 个
- **测试文件**: 全部移至 tests/ 目录
- **文档文件**: 按类别整理到 docs/ 目录
- **临时文件**: 清理并规范管理

### 组织结构
```
rcc/
├── src/                    # 源代码
├── tests/                  # 测试文件
│   ├── e2e/               # 端到端测试
│   ├── integration/       # 集成测试
│   ├── manual/            # 手动测试
│   └── unit/              # 单元测试
├── docs/                   # 文档
│   ├── architecture/      # 架构文档
│   ├── configuration/     # 配置文档
│   └── design/           # 设计文档
├── scripts/               # 构建脚本
├── config/                # 配置文件
├── sharedmodule/          # 共享模块
├── .claude/              # Claude 配置
├── debug-logs/           # 调试日志
└── test-logs/           # 测试日志
```

## ⚠️ 注意事项

1. **备份重要文件**: 清理前备份重要文件
2. **验证功能**: 清理后验证项目功能正常
3. **更新引用**: 更新文档中的文件路径引用
4. **Git 追踪**: 确认清理后的文件结构被正确追踪

## 🔄 实施建议

1. **分阶段实施**: 按优先级分阶段进行清理
2. **测试验证**: 每个阶段完成后进行功能测试
3. **文档更新**: 及时更新相关文档和引用
4. **团队沟通**: 如有团队，提前沟通清理计划
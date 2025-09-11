# Git Hooks 文档

## Git Hooks 是什么？

Git Hooks 是 Git 提供的自动化脚本机制，允许在特定的 Git 事件发生时自动执行自定义脚本。这些脚本可以帮助团队自动化代码检查、测试、格式化等任务。

## 本项目的 Git Hooks

### 已安装的 Hooks

#### 1. Pre-commit Hook
- **位置**: `.git/hooks/pre-commit`
- **作用**: 在代码提交前自动检查 UnderConstruction 模块使用规范
- **触发时机**: 执行 `git commit` 命令时，在创建提交之前
- **检查内容**:
  - 检查暂存的 TypeScript/JavaScript 文件
  - 识别 TODO/FIXME 注释
  - 识别 "Not implemented" 错误
  - 识别 mock 占位符使用
  - 确保使用 UnderConstruction 模块标记未完成功能

### Git Hooks 的工作流程

```
git add .                    # 添加文件到暂存区
git commit -m "feat: xxx"    # 触发 pre-commit hook
    ↓
pre-commit hook 执行
    ↓
检查暂存文件中的违规占位符
    ↓
如果发现问题 → 阻止提交，显示修复建议
如果无问题 → 允许提交继续
```

### Git Hooks 的优势

1. **自动化检查**: 无需手动执行检查命令
2. **即时反馈**: 在代码提交前立即发现问题
3. **团队一致性**: 确保所有团队成员都遵循相同的代码规范
4. **防止违规**: 阻止不符合规范的代码进入代码库
5. **提高代码质量**: 强制使用正确的开发模式

### 使用方法

#### 正常使用
```bash
git add .
git commit -m "你的提交信息"
# Hook 会自动执行检查
```

#### 跳过检查（不推荐）
```bash
git commit --no-verify -m "你的提交信息"
# 跳过所有 hooks 检查
```

#### 查看 Hook 状态
```bash
ls -la .git/hooks/pre-commit
# 查看是否已安装 pre-commit hook
```

#### 重新安装 Hooks
```bash
./.claude/scripts/install-git-hooks.sh
# 重新安装所有 hooks
```

### Hook 的检查内容

#### 1. TODO/FIXME 注释检查
```typescript
// ❌ 错误示例
// TODO: 实现用户认证
// FIXME: 修复这个bug

// ✅ 正确示例
// 使用 UnderConstruction 模块
```

#### 2. Not Implemented 错误检查
```typescript
// ❌ 错误示例
throw new Error('Not implemented');

// ✅ 正确示例
return underConstruction.callUnderConstructionFeature('feature-name', {
  caller: 'functionName',
  purpose: '功能说明'
});
```

#### 3. Mock 占位符检查
```typescript
// ❌ 错误示例
const mockData = { id: 1, name: 'test' };
return mockData;

// ✅ 正确示例
return underConstruction.callUnderConstructionFeature('data-service', {
  caller: 'getData',
  purpose: '获取用户数据服务'
});
```

### Hook 的输出示例

#### 检查通过
```
🔍 检查暂存文件中的UnderConstruction模块使用规范...
📋 检查文件: 3 个
   - src/services/auth.ts
   - src/components/user.tsx
   - src/utils/data.ts
✅ UnderConstruction模块使用规范检查通过
```

#### 检查失败
```
🔍 检查暂存文件中的UnderConstruction模块使用规范...
📋 检查文件: 1 个
   - src/services/auth.ts

🚨 发现违规占位符使用，必须使用UnderConstruction模块替代
=======================================================================

📍 TODO/FIXME 注释:
   文件: src/services/auth.ts:25
   内容:   // TODO: 实现用户认证
   问题: 使用TODO注释而非UnderConstruction模块标记未完成功能

📊 违规统计:
   - TODO/FIXME 注释: 1 处

🔧 修复指导:
1. 删除所有TODO/FIXME注释
2. 使用UnderConstruction模块进行功能标记

🚨 提交被阻止：发现违规的占位符使用！

🔧 请按照上述提示修复问题后重新提交
💡 如需跳过检查，使用: git commit --no-verify
```

### 故障排除

#### 1. Hook 不执行
- 检查 hook 文件是否有执行权限: `chmod +x .git/hooks/pre-commit`
- 检查 hook 脚本是否存在: `ls -la .git/hooks/pre-commit`

#### 2. Hook 执行出错
- 查看 hook 脚本内容: `cat .git/hooks/pre-commit`
- 手动执行检查脚本: `./.claude/scripts/underconstruction-rule-check.sh`

#### 3. 需要临时禁用 Hook
```bash
# 重命名 hook 文件
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled

# 恢复 hook
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

### 最佳实践

1. **不要跳过检查**: 除非紧急情况，不要使用 `--no-verify`
2. **及时修复问题**: 看到 hook 提示后，立即按照指导修复问题
3. **团队协作**: 确保所有团队成员都了解和使用 hooks
4. **定期更新**: 随着项目发展，更新 hook 检查规则

### 相关资源

- [Git Hooks 官方文档](https://git-scm.com/docs/githooks)
- [UnderConstruction 使用规范](./.claude/rules/001-underconstruction.md)
- [UnderConstruction 使用指南](./UNDERCONSTRUCTION_USAGE_GUIDELINES.md)
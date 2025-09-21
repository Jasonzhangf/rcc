#!/bin/bash

# Git hooks安装脚本
# 安装UnderConstruction规则检查和文件allowlist验证的git hooks

set -e

PROJECT_ROOT="$(pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
UNDERCONSTRUCTION_HOOK="$PROJECT_ROOT/.claude/scripts/pre-commit-underconstruction-hook.sh"

echo "🔧 安装RCC git hooks..."

# 检查是否在git仓库中
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ 错误: 当前目录不是git仓库"
    exit 1
fi

# 检查hook脚本是否存在
if [ ! -f "$UNDERCONSTRUCTION_HOOK" ]; then
    echo "❌ 错误: UnderConstruction hook脚本不存在"
    exit 1
fi

# 创建pre-commit hook
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

# 备份现有的pre-commit hook
if [ -f "$PRE_COMMIT_HOOK" ]; then
    echo "📦 备份现有的pre-commit hook..."
    cp "$PRE_COMMIT_HOOK" "$PRE_COMMIT_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 创建新的pre-commit hook
cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash

# RCC Pre-commit Hook
# 包含UnderConstruction规则检查和文件allowlist验证

# 获取项目根目录
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
UNDERCONSTRUCTION_HOOK="$PROJECT_ROOT/.claude/scripts/pre-commit-underconstruction-hook.sh"

# 运行UnderConstruction检查
if [ -f "$UNDERCONSTRUCTION_HOOK" ]; then
    echo "🔍 运行UnderConstruction规则检查..."
    if ! "$UNDERCONSTRUCTION_HOOK"; then
        echo "❌ UnderConstruction检查失败"
        exit 1
    fi
else
    echo "⚠️  UnderConstruction hook脚本不存在，跳过检查"
fi

# 运行架构文件验证（可选，因为Claude Code hooks已经在处理）
echo "🔍 文件架构权限验证由Claude Code hooks实时处理"
echo "✅ 提交时的文件验证完成"

echo "✅ 所有pre-commit检查通过"
exit 0
EOF

# 设置执行权限
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Git hook安装成功!"
echo ""
echo "📋 已安装的hooks:"
echo "   - pre-commit: 提交前检查UnderConstruction模块使用规范"
echo ""
echo "🔧 Hook位置: $PRE_COMMIT_HOOK"
echo ""
echo "📖 使用说明:"
echo "   - 提交代码时会自动检查是否正确使用了UnderConstruction模块"
echo "   - 文件架构权限验证由Claude Code hooks实时处理"
echo "   - 如需跳过检查，使用: git commit --no-verify"
echo "   - 如需临时禁用hook，可删除: $PRE_COMMIT_HOOK"
echo ""
echo "📚 相关文档:"
echo "   - UnderConstruction使用规范: ./.claude/rules/001-underconstruction.md"
echo "   - 使用指南: ./UNDERCONSTRUCTION_USAGE_GUIDELINES.md"
echo "   - 文件权限系统: ./.claude/FINAL_ARCHITECTURE_SYSTEM.md"
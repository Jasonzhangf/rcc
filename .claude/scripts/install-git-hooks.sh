#!/bin/bash

# Git hooks安装脚本
# 安装UnderConstruction规则检查和文件allowlist验证的git hooks

set -e

PROJECT_ROOT="$(pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
UNDERCONSTRUCTION_HOOK="$PROJECT_ROOT/.claude/scripts/pre-commit-underconstruction-hook.sh"
FILE_ALLOWLIST_VALIDATOR="$PROJECT_ROOT/.claude/scripts/file-allowlist-validator.sh"

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
FILE_ALLOWLIST_VALIDATOR="$PROJECT_ROOT/.claude/scripts/file-allowlist-validator.sh"

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

# 运行文件allowlist验证
if [ -f "$FILE_ALLOWLIST_VALIDATOR" ]; then
    echo "🔍 运行文件allowlist验证..."
    # 获取所有新添加或修改的文件
    FILES_TO_CHECK=$(git diff --cached --name-only --diff-filter=ACM)
    if [ -n "$FILES_TO_CHECK" ]; then
        FAILED_FILES=0
        echo "📋 检查文件:"
        for file in $FILES_TO_CHECK; do
            if [ -f "$file" ]; then
                echo "   - $file"
                if ! "$FILE_ALLOWLIST_VALIDATOR" validate "$file"; then
                    echo "❌ 文件 '$file' 未通过allowlist验证"
                    FAILED_FILES=$((FAILED_FILES + 1))
                fi
            fi
        done
        
        if [ $FAILED_FILES -gt 0 ]; then
            echo ""
            echo "🚨 ❌ 有 $FAILED_FILES 个文件未通过allowlist验证"
            echo ""
            echo "💡 解决方案："
            echo "   1. 使用审批脚本：./.claude/scripts/approve-file-allowlist.sh add <文件路径>"
            echo "   2. 或者移动临时文件到 ./tmp/ 目录"
            echo "   3. 或者使用 git commit --no-verify 跳过检查（不推荐）"
            echo ""
            echo "📝 审批日志：.claude/approval-requests.log"
            echo "🔍 监控日志：.claude/allowlist-access.log"
            exit 1
        else
            echo "✅ 所有文件都通过了allowlist验证"
        fi
    else
        echo "✅ 没有需要验证的文件"
    fi
else
    echo "⚠️  文件allowlist验证器不存在，跳过检查"
fi

echo "✅ 所有pre-commit检查通过"
exit 0
EOF

# 设置执行权限
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Git hook安装成功!"
echo ""
echo "📋 已安装的hooks:"
echo "   - pre-commit: 提交前检查UnderConstruction模块使用规范和文件allowlist"
echo ""
echo "🔧 Hook位置: $PRE_COMMIT_HOOK"
echo ""
echo "📖 使用说明:"
echo "   - 提交代码时会自动检查是否正确使用了UnderConstruction模块"
echo "   - 提交代码时会验证文件是否在允许的创建位置"
echo "   - 如需跳过检查，使用: git commit --no-verify"
echo "   - 如需临时禁用hook，可删除: $PRE_COMMIT_HOOK"
echo ""
echo "📚 相关文档:"
echo "   - UnderConstruction使用规范: ./.claude/rules/001-underconstruction.md"
echo "   - 使用指南: ./UNDERCONSTRUCTION_USAGE_GUIDELINES.md"
echo "   - 文件allowlist配置: ./.claude/settings.local.json"
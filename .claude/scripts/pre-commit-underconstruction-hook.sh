#!/bin/bash

# Git pre-commit hook for UnderConstruction rule checking
# 在提交代码前检查是否正确使用了UnderConstruction模块

set -e

# 获取项目根目录
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
UNDERCONSTRUCTION_CHECK_SCRIPT="$PROJECT_ROOT/.claude/scripts/underconstruction-rule-check.sh"

# 检查脚本是否存在
if [ ! -f "$UNDERCONSTRUCTION_CHECK_SCRIPT" ]; then
    echo "⚠️  UnderConstruction检查脚本不存在，跳过检查"
    exit 0
fi

# 检查脚本是否可执行
if [ ! -x "$UNDERCONSTRUCTION_CHECK_SCRIPT" ]; then
    echo "⚠️  UnderConstruction检查脚本不可执行，跳过检查"
    exit 0
fi

echo "🔍 检查UnderConstruction模块使用规范..."

# 获取暂存的文件
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|tsx|jsx)$')

if [ -z "$STAGED_FILES" ]; then
    echo "✅ 没有TypeScript/JavaScript文件需要检查"
    exit 0
fi

echo "🔍 检查暂存文件中的UnderConstruction模块使用规范..."
echo "📋 检查文件: $(echo "$STAGED_FILES" | wc -l | tr -d ' ') 个"
echo "$STAGED_FILES" | sed 's/^/   - /'

# 创建临时文件列表
TEMP_FILE_LIST=$(mktemp)
echo "$STAGED_FILES" > "$TEMP_FILE_LIST"

# 运行检查 - 传入文件列表而非排除列表
if "$UNDERCONSTRUCTION_CHECK_SCRIPT" "$TEMP_FILE_LIST"; then
    echo "✅ UnderConstruction模块使用规范检查通过"
    rm -f "$TEMP_FILE_LIST"
    exit 0
else
    echo ""
    echo "🚨 提交被阻止：发现违规的占位符使用！"
    echo ""
    echo "🔧 请按照上述提示修复问题后重新提交"
    echo "💡 如需跳过检查，使用: git commit --no-verify"
    echo ""
    rm -f "$TEMP_FILE_LIST"
    exit 1
fi
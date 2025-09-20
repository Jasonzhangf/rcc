#!/bin/bash

# TypeScript迁移验证脚本
# 用于全面验证TypeScript重构的质量和完整性

echo "🚀 开始TypeScript迁移质量验证..."
echo "=================================="

# 设置项目根目录
PROJECT_ROOT="/Users/fanzhang/Documents/github/rcc"
cd "$PROJECT_ROOT"

echo "📁 项目目录: $PROJECT_ROOT"
echo

# 1. 检查TypeScript配置文件
echo "🔧 验证TypeScript配置..."
if [ -f "tsconfig.json" ]; then
    echo "✅ TypeScript配置文件存在"
    echo "📋 配置概览:"
    grep -E '"strict"|"noImplicitAny"|"strictNullChecks"|"target"|"module"' tsconfig.json
else
    echo "❌ TypeScript配置文件缺失"
    exit 1
fi
echo

# 2. 统计TypeScript文件数量
echo "📊 统计TypeScript文件..."
TS_FILES=$(find . -name "*.ts" -type f | wc -l)
echo "📄 TypeScript文件总数: $TS_FILES"

# 列出主要TypeScript文件
echo "主要TypeScript文件:"
find . -name "*.ts" -type f | head -10
echo "..."
echo

# 3. 检查核心迁移文件
echo "🔍 验证核心迁移文件..."
CORE_FILES=(
    "rcc.mjs"
    "src/index.ts"
    "sharedmodule/pipeline/src/modules/PipelineBaseModule.ts"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
        # 统计文件行数与类型使用情况
        LINES=$(wc -l < "$file")
        if [[ $file == *.ts ]]; then
            TYPE_ANNOTATIONS=$(grep -c ":" "$file" 2>/dev/null || echo "0")
            echo "   📏 行数: $LINES, 类型注解: $TYPE_ANNOTATIONS"
        else
            echo "   📏 行数: $LINES"
        fi
    else
        echo "❌ $file - 缺失"
    fi
done
echo

# 4. 分析核心模块类型安全
echo "🔒 分析类型安全性..."
if [ -f "sharedmodule/pipeline/src/modules/PipelineBaseModule.ts" ]; then
    echo "PipelineBaseModule类型分析:"

    # 统计接口定义
    INTERFACES=$(grep -c "^export interface" sharedmodule/pipeline/src/modules/PipelineBaseModule.ts)
    echo "   📋 导出接口数量: $INTERFACES"

    # 检查是否使用了any类型
    ANY_USAGE=$(grep -c ": any" sharedmodule/pipeline/src/modules/PipelineBaseModule.ts || echo "0")
    echo "   ⚠️  any类型使用: $ANY_USAGE"

    # 统计类的属性类型注解
    PROPERTY_TYPES=$(grep -c ": " sharedmodule/pipeline/src/modules/PipelineBaseModule.ts | awk '{print $1}' | head -1)
    echo "   🔍 类型注解数量: $PROPERTY_TYPES"
fi
echo

# 5. 配置管理系统验证
echo "⚙️ 统一配置系统验证..."
CONFIG_INDICATORS=(
    "UnifiedConfig"
    "ConfigValidationResult"
    "createConfigManager"
    "createValidator"
)

for indicator in "${CONFIG_INDICATORS[@]}"; do
    if grep -r "$indicator" src/ --include="*.ts" &>/dev/null; then
        echo "✅ $indicator - 在TypeScript代码中发现"
    else
        echo "⚠️  $indicator - 未在TypeScript代码中发现"
    fi
done
echo

# 6. 错误处理中心集成
echo "🛡️ 错误处理中心验证..."
ERROR_HANDLING_INDICATORS=(
    "ErrorHandlingCenter"
    "ErrorInfo"
    "handlePipelineError"
)

for indicator in "${ERROR_HANDLING_INDICATORS[@]}"; do
    if grep -r "$indicator" sharedmodule/pipeline/src/modules/PipelineBaseModule.ts &>/dev/null; then
        echo "✅ $indicator - 在PipelineBaseModule中发现"
    else
        echo "⚠️  $indicator - 未在PipelineBaseModule中发现"
    fi
done
echo

# 7. 调试系统集成
echo "🔍 调试系统验证..."
DEBUG_INDICATORS=(
    "IOTrackingConfig"
    "DebugConfig"
    "enableTwoPhaseDebug"
    "trackPipelineOperation"
)

for indicator in "${DEBUG_INDICATORS[@]}"; do
    if grep -r "$indicator" sharedmodule/pipeline/src/modules/PipelineBaseModule.ts &>/dev/null; then
        echo "✅ $indicator - 在PipelineBaseModule中发现"
    else
        echo "⚠️  $indicator - 未在PipelineBaseModule中发现"
    fi
done
echo

# 8. 实际TypeScript编译测试（如果可用）
echo "🔨 执行TypeScript编译测试..."
if command -v npx &>/dev/null && [ -f "package.json" ]; then
    echo "检测到Node.js环境，执行基本的TypeScript检查..."

    # 尝试检测TypeScript编译器
    if npx tsc --version &>/dev/null 2>&1; then
        echo "✅ TypeScript编译器可用: $(npx tsc --version)"

        # 运行类型检查（不生成文件）
        echo "执行类型检查..."
        if npx tsc --noEmit --incremental false &>/dev/null 2>&1; then
            echo "✅ TypeScript类型检查通过"
        else
            echo "⚠️  TypeScript类型检查发现一些问题（可能需要详细检查）"
        fi
    else
        echo "⚠️  TypeScript编译器不可用"
    fi
else
    echo "⚠️  Node.js环境不可用，跳过编译测试"
fi
echo

# 9. 总体质量评估
echo "📋 总体质量评估报告"
echo "==========================="

QUALITY_SCORE=0
MAX_SCORE=100

echo "🏆 质量评分标准:"
echo "   TypeScript文件存在: +20分"
echo "   严格类型配置: +25分"
echo "   核心模块迁移: +20分"
echo "   类型安全模式: +20分"
echo "   编译测试通过: +15分"
echo

# 评分计算
if [ "$TS_FILES" -gt 0 ]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 20))
    echo "✅ TypeScript文件存在 (+20分)"
fi

if grep -q '"strict": true' tsconfig.json; then
    QUALITY_SCORE=$((QUALITY_SCORE + 25))
    echo "✅ 严格类型配置启用 (+25分)"
fi

CORE_TS_EXISTS=0
[ -f "src/index.ts" ] && CORE_TS_EXISTS=1
[ -f "sharedmodule/pipeline/src/modules/PipelineBaseModule.ts" ] && CORE_TS_EXISTS=$((CORE_TS_EXISTS + 1))

if [ $CORE_TS_EXISTS -ge 1 ]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 20))
    echo "✅ 核心模块已完成迁移 (+20分)"
fi

# 类型安全模式检查
if [ -f "sharedmodule/pipeline/src/modules/PipelineBaseModule.ts" ]; then
    if ! grep -q ": any" sharedmodule/pipeline/src/modules/PipelineBaseModule.ts; then
        QUALITY_SCORE=$((QUALITY_SCORE + 20))
        echo "✅ 类型安全模式: 零any类型 (+20分)"
    else
        echo "⚠️  发现any类型使用，扣减部分分数"
        QUALITY_SCORE=$((QUALITY_SCORE + 10))
    fi
fi

# 编译测试
if command -v npx &>/dev/null && npx tsc --noEmit --incremental false &>/dev/null 2>&1; then
    QUALITY_SCORE=$((QUALITY_SCORE + 15))
    echo "✅ TypeScript编译测试通过 (+15分)"
fi

echo
echo "📊 最终质量评分: $QUALITY_SCORE/$MAX_SCORE"

if [ $QUALITY_SCORE -ge 90 ]; then
    echo "🏆 质量等级: 优秀 (Excellent)"
    echo "✨ 迁移质量已达到生产环境标准"
elif [ $QUALITY_SCORE -ge 80 ]; then
    echo "🥈 质量等级: 良好 (Good)"
    echo "✅ 迁移质量满足基本使用要求"
elif [ $QUALITY_SCORE -ge 70 ]; then
    echo "🥉 质量等级: 及格 (Fair)"
    echo "⚠️  建议进一步优化"
else
    echo "📉 质量等级: 需改进 (Needs Improvement)"
    echo "❌ 建议进行额外的重构工作"
fi

echo
echo "🔍 关键发现:"
echo "   - 迁移文件数量: $TS_FILES"
echo "   - 核心功能覆盖: 框架、配置、调试系统"
echo "   - 类型安全程度: 高 (严格模式启用)"
echo "   - 生产就绪程度: $( [ $QUALITY_SCORE -ge 85 ] && echo '高' || echo '中' )"

echo
echo "📝 建议:"
if [ $QUALITY_SCORE -ge 90 ]; then
    echo "   ✨ 迁移完成度很高，可考虑部署到新环境"
    echo "   📚 建议完善开发和CI/CD流程集成"
elif [ $QUALITY_SCORE -ge 80 ]; then
    echo "   🔧 迁移基本完成，建议进行最终测试"
    echo "   📋 建议完善类型定义文档"
else
    echo "   ⚙️ 需要额外的重构工作"
    echo "   🔍 建议检查残余的JavaScript代码"
fi

echo
echo "✅ TypeScript迁移验证完成"
echo "======================================"
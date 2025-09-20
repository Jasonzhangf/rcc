#!/bin/bash

# 构建测试脚本
echo "开始构建RCC Pipeline模块..."

# 进入项目目录
cd /Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline

# 检查TypeScript类型
echo "检查TypeScript类型..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript类型检查通过"
else
    echo "❌ TypeScript类型检查失败"
    exit 1
fi

# 运行完整构建
echo "运行完整构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

echo "🎉 所有检查通过！"
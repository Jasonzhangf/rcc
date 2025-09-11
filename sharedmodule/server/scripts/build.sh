#!/bin/bash

# RCC Server 构建脚本 - 确保在正确的目录进行构建

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 构建RCC Server模块: $MODULE_DIR"
echo "📁 进入目录: $MODULE_DIR"

# 进入模块目录
cd "$MODULE_DIR"

echo "🧹 清理旧构建..."
npm run clean

echo "📦 构建类型声明..."
npm run build:types

echo "📦 构建CommonJS..."
npm run build:cjs

echo "📦 构建ESM..."
npm run build:esm

echo "✅ 构建完成！"
echo "📂 构建输出: $MODULE_DIR/dist"
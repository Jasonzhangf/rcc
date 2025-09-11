#!/bin/bash

# 发布脚本 - 确保在正确的目录进行发布

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 发布模块: $MODULE_DIR"
echo "📁 进入目录: $MODULE_DIR"

# 进入模块目录
cd "$MODULE_DIR"

# 清理旧的包
echo "🧹 清理旧包..."
rm -f *.tgz

# 打包
echo "📦 打包..."
npm pack

# 获取包文件名
PACKAGE_FILE=$(ls *.tgz)
if [ -z "$PACKAGE_FILE" ]; then
    echo "❌ 打包失败，未找到包文件"
    exit 1
fi

echo "📦 包文件: $PACKAGE_FILE"

# 发布
echo "🚀 发布到npm..."
npm publish "$PACKAGE_FILE"

echo "✅ 发布完成！"
echo "📂 包路径: $MODULE_DIR/$PACKAGE_FILE"
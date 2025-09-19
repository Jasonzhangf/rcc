#!/bin/bash

# RCC 快速安装脚本
# 简化版本，只做必要的编译和安装

set -e

echo "🚀 RCC 快速安装脚本"
echo "========================================="

# 检查是否在正确的目录
if [ ! -f "rcc.mjs" ] || [ ! -f "package.json" ]; then
    echo "❌ 错误: 请确保在 RCC 项目根目录运行此脚本"
    exit 1
fi

# 安装根目录依赖
echo "📦 安装根目录依赖..."
npm install

# 编译本地模块
echo "🔨 编译本地模块..."
modules=("sharedmodule/basemodule" "sharedmodule/server" "sharedmodule/bootstrap")

for module in "${modules[@]}"; do
    if [ -d "$module" ]; then
        echo "  编译 $module..."
        cd "$module"
        rm -rf node_modules dist 2>/dev/null || true
        npm install
        npm run build
        cd - > /dev/null
    fi
done

# 编译主项目
echo "🔨 编译主项目..."
npm run clean 2>/dev/null || true
npm run build

# 全局安装
echo "🌍 全局安装..."
npm install -g .

# 验证安装
echo "✅ 验证安装..."
if command -v rcc &> /dev/null; then
    echo "  RCC 命令已可用"
    rcc --version
else
    echo "  ⚠️  RCC 命令未找到，请重新加载 shell"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "使用方法："
echo "  rcc start --config ~/.rcc/rcc-config-lmstudio.json --port 5506"
echo ""
echo "如果命令不可用，请运行："
echo "  source ~/.bashrc  # 或 source ~/.zshrc"
echo ""
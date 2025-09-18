#!/bin/bash

# CLI框架编译脚本
echo "=== CLI框架编译脚本 ==="
echo "当前工作目录: $(pwd)"
echo "切换到CLI框架目录..."

cd /Users/fanzhang/Documents/github/rcc/sharedmodule/cli-framework

echo "当前目录: $(pwd)"
echo "清理旧的构建文件..."

rm -rf dist

echo "开始编译CLI框架..."

# 使用本地TypeScript编译器
./node_modules/.bin/tsc

if [ $? -eq 0 ]; then
    echo "✓ CLI框架编译成功！"
    echo "构建文件:"
    ls -la dist/
    echo "核心模块文件:"
    if [ -d "dist/core" ]; then
        ls -la dist/core/
    else
        echo "⚠ 核心模块目录不存在"
    fi
else
    echo "✗ CLI框架编译失败"
    exit 1
fi
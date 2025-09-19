#!/bin/bash

# CLI框架编译和安装脚本
echo "=== CLI框架编译和安装脚本 ==="

# 确保在正确的目录中
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "脚本目录: $SCRIPT_DIR"
cd "$SCRIPT_DIR"
echo "当前工作目录: $(pwd)"

# 检查文件是否存在
echo "检查核心文件..."
if [ -f "src/core/CLIEngine.ts" ]; then
    echo "✓ CLIEngine.ts 存在"
else
    echo "✗ CLIEngine.ts 不存在"
    exit 1
fi

if [ -f "src/types/index.ts" ]; then
    echo "✓ types/index.ts 存在"
else
    echo "✗ types/index.ts 不存在"
    exit 1
fi

if [ -f "src/commands/start/StartCommand.ts" ]; then
    echo "✓ StartCommand.ts 存在"
else
    echo "✗ StartCommand.ts 不存在"
    exit 1
fi

# 清理旧的构建文件
echo "清理旧的构建文件..."
rm -rf dist

# 编译CLI框架
echo "编译CLI框架..."
./node_modules/.bin/tsc

if [ $? -eq 0 ]; then
    echo "✓ CLI框架编译成功！"

    # 检查构建文件
    echo "构建文件:"
    ls -la dist/

    # 全局安装
    echo "全局安装CLI框架..."
    npm install -g .

    if [ $? -eq 0 ]; then
        echo "✓ CLI框架全局安装成功！"

        # 测试CLI框架
        echo "测试CLI框架..."
        rcc --help

        if [ $? -eq 0 ]; then
            echo "✓ CLI框架测试成功！"
        else
            echo "✗ CLI框架测试失败"
            exit 1
        fi
    else
        echo "✗ CLI框架全局安装失败"
        exit 1
    fi
else
    echo "✗ CLI框架编译失败"
    exit 1
fi
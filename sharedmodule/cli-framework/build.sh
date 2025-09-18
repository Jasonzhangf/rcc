#!/bin/bash

# CLI框架编译脚本
# 在CLI框架目录中执行编译操作
echo "=== CLI框架编译脚本 ==="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "脚本目录: $SCRIPT_DIR"

# 切换到脚本所在目录（CLI框架根目录）
cd "$SCRIPT_DIR"
echo "当前工作目录: $(pwd)"

# 检查关键文件是否存在
echo "检查核心文件..."
if [ -f "src/index.ts" ]; then
    echo "✓ src/index.ts 存在"
else
    echo "✗ src/index.ts 不存在"
    exit 1
fi

if [ -f "src/core/CLIEngine.ts" ]; then
    echo "✓ src/core/CLIEngine.ts 存在"
else
    echo "✗ src/core/CLIEngine.ts 不存在"
    exit 1
fi

if [ -f "tsconfig.json" ]; then
    echo "✓ tsconfig.json 存在"
else
    echo "✗ tsconfig.json 不存在"
    exit 1
fi

# 清理旧的构建文件
echo "清理旧的构建文件..."
rm -rf dist

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 编译TypeScript
echo "编译TypeScript..."
./node_modules/.bin/tsc

if [ $? -eq 0 ]; then
    echo "✓ CLI框架编译成功！"

    # 修复ES模块扩展名问题
    echo "修复ES模块扩展名..."
    find dist -name "*.js" -exec sed -i '' 's/from "\(\.\/[^"]*\)";/from "\1.js";/g' {} \;
    find dist -name "*.js" -exec sed -i '' 's/from "\(\.\/[^"]*\)";/from "\1.js";/g' {} \;

    # 检查构建文件
    echo "构建文件:"
    ls -la dist/

    # 本地安装测试
    echo "本地安装测试..."
    npm pack

    if [ $? -eq 0 ]; then
        echo "✓ CLI框架打包成功！"
        echo "包文件: $(ls -la *.tgz)"
    else
        echo "✗ CLI框架打包失败"
        exit 1
    fi
else
    echo "✗ CLI框架编译失败"
    exit 1
fi
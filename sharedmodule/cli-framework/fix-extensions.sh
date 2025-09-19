#!/bin/bash

# 修复ES模块扩展名问题
echo "修复ES模块扩展名..."

# 使用更精确的sed命令
find dist -name "*.js" -exec sed -i '' 's/from '\''\(\.\/[^"'\'']*\)'\'';/from '\''\1.js'\'';/g' {} \;

# 修复types导入问题
echo "修复types导入问题..."
sed -i '' 's/export \* from '\''\.\/types\.js'\'';/export * from '\''\.\/types\/index\.js'\'';/g' dist/index.js

echo "扩展名修复完成"
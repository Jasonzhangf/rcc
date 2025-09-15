#!/bin/bash
# 启动配置模块API服务器的脚本

echo "🚀 启动配置模块API服务器..."
echo "📂 服务器将在 http://localhost:5001 上运行"
echo "📄 WebUI可在 http://localhost:5001/ 访问"
echo "📄 API接口可在 http://localhost:5001/api/ 访问"
echo "🛑 按 Ctrl+C 停止服务器"

# 进入配置模块目录并启动服务器
cd /Users/fanzhang/Documents/github/rcc/sharedmodule/Configuration && node server.cjs
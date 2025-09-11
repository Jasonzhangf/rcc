#!/bin/bash
# 启动配置模块WebUI的脚本

echo "🚀 启动配置模块WebUI..."
echo "📂 服务器将在 http://localhost:8082 上运行"
echo "📄 WebUI可在 http://localhost:8082/simple-config-ui.html 访问"
echo "🛑 按 Ctrl+C 停止服务器"

# 进入配置模块目录并启动HTTP服务器
cd /Users/fanzhang/Documents/github/rcc/sharedmodule/Configuration && npx http-server . -p 8082
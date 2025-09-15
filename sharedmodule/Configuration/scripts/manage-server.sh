#!/bin/bash

# 服务器管理脚本 - 安全地启动配置模块服务器

PORT=5001
PROCESS_NAME="server.cjs"

echo "🚀 配置模块服务器管理脚本"
echo "📂 目标端口: $PORT"

# 检查端口是否被占用
check_port() {
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "⚠️  端口 $PORT 已被占用"
        return 0
    else
        echo "✅ 端口 $PORT 可用"
        return 1
    fi
}

# 优雅地停止使用指定端口的进程
stop_process_on_port() {
    local port=$1
    echo "🛑 正在检查端口 $port..."
    
    # 查找使用该端口的进程
    local pids=$(lsof -ti :$port)
    
    if [ -n "$pids" ]; then
        echo "⚠️  发现占用端口 $port 的进程: $pids"
        for pid in $pids; do
            # 检查进程名称是否匹配我们的服务器
            local cmd=$(ps -p $pid -o command= 2>/dev/null | grep "$PROCESS_NAME" | wc -l)
            if [ "$cmd" -gt 0 ]; then
                echo "🎯 停止配置模块服务器进程 $pid"
                kill -TERM $pid 2>/dev/null
                sleep 2
                # 如果进程仍然存在，强制杀死
                if kill -0 $pid 2>/dev/null; then
                    echo "⚠️  强制终止进程 $pid"
                    kill -9 $pid 2>/dev/null
                fi
            else
                echo "ℹ️  进程 $pid 不是配置模块服务器，跳过"
            fi
        done
    else
        echo "✅ 端口 $port 未被占用"
    fi
}

# 更新HTML文件中的端口引用
update_html_port() {
    local html_file="simple-config-ui.html"
    if [ -f "$html_file" ]; then
        echo "📝 更新HTML文件中的端口引用"
        sed -i '' "s/http:\/\/localhost:3001/http:\/\/localhost:$PORT/g" "$html_file"
        echo "✅ HTML文件端口更新完成"
    else
        echo "⚠️  HTML文件不存在: $html_file"
    fi
}

# 更新启动脚本中的端口引用
update_script_port() {
    local script_file="start-api-server.sh"
    if [ -f "$script_file" ]; then
        echo "📝 更新启动脚本中的端口引用"
        sed -i '' "s/3001/$PORT/g" "$script_file"
        echo "✅ 启动脚本端口更新完成"
    else
        echo "⚠️  启动脚本不存在: $script_file"
    fi
}

# 启动服务器
start_server() {
    echo "🚀 启动配置模块API服务器..."
    echo "📂 服务器将在 http://localhost:$PORT 上运行"
    echo "📄 WebUI可在 http://localhost:$PORT/ 访问"
    echo "📄 API接口可在 http://localhost:$PORT/api/ 访问"
    echo "🛑 按 Ctrl+C 停止服务器"
    
    # 进入配置模块目录并启动服务器
    cd /Users/fanzhang/Documents/github/rcc/sharedmodule/Configuration && node server.cjs
}

# 主函数
main() {
    case "$1" in
        start)
            echo "🔧 准备启动服务器..."
            # 停止可能正在运行的进程
            stop_process_on_port $PORT
            # 更新文件中的端口引用
            update_html_port
            update_script_port
            # 启动服务器
            start_server
            ;;
        stop)
            echo "🛑 停止服务器..."
            stop_process_on_port $PORT
            ;;
        update)
            echo "📝 更新端口引用..."
            update_html_port
            update_script_port
            ;;
        status)
            echo "🔍 检查服务器状态..."
            check_port
            ;;
        *)
            echo "使用方法: $0 {start|stop|update|status}"
            echo "  start   - 启动服务器"
            echo "  stop    - 停止服务器"
            echo "  update  - 更新端口引用"
            echo "  status  - 检查服务器状态"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
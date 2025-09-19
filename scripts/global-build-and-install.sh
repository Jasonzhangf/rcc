#!/bin/bash

# RCC 全局编译和安装脚本
# 这个脚本会编译所有本地模块并全局安装 RCC CLI 框架

set -e  # 遇到错误时退出

echo "🚀 RCC 全局编译和安装脚本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 错误处理函数
error_exit() {
    echo -e "${RED}❌ 错误: $1${NC}" >&2
    exit 1
}

# 成功信息函数
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 信息函数
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 警告函数
warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "rcc.mjs" ] || [ ! -f "package.json" ]; then
        error_exit "请确保在 RCC 项目根目录运行此脚本"
    fi
}

# 清理函数
cleanup() {
    info_msg "清理临时文件..."
    rm -f /tmp/rcc-build-*.log 2>/dev/null || true
}

# 注册清理函数
trap cleanup EXIT

# 1. 检查系统依赖
check_dependencies() {
    info_msg "检查系统依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js 未安装，请先安装 Node.js"
    fi

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm 未安装，请先安装 npm"
    fi

    # 检查 TypeScript
    if ! command -v tsc &> /dev/null; then
        warning_msg "TypeScript 未全局安装，尝试使用本地版本..."
        if [ ! -f "node_modules/.bin/tsc" ]; then
            error_exit "TypeScript 未安装，请运行: npm install -g typescript"
        fi
    fi

    success_msg "系统依赖检查通过"
}

# 2. 安装根目录依赖
install_root_dependencies() {
    info_msg "安装根目录依赖..."
    npm install || error_exit "根目录依赖安装失败"
    success_msg "根目录依赖安装完成"
}

# 3. 编译所有本地模块
compile_local_modules() {
    info_msg "编译所有本地模块..."

    modules=("sharedmodule/basemodule" "sharedmodule/server" "sharedmodule/bootstrap")

    for module in "${modules[@]}"; do
        if [ -d "$module" ]; then
            info_msg "编译模块: $module"
            cd "$module"

            # 清理旧的依赖和构建文件
            rm -rf node_modules dist 2>/dev/null || true

            # 安装依赖
            npm install || error_exit "模块 $module 依赖安装失败"

            # 编译模块
            npm run build || error_exit "模块 $module 编译失败"

            success_msg "模块 $module 编译完成"
            cd - > /dev/null
        else
            warning_msg "模块目录不存在: $module"
        fi
    done

    success_msg "所有本地模块编译完成"
}

# 4. 编译主项目
compile_main_project() {
    info_msg "编译主项目..."

    # 清理旧的构建文件
    npm run clean 2>/dev/null || true

    # 编译主项目
    npm run build || error_exit "主项目编译失败"

    success_msg "主项目编译完成"
}

# 5. 全局安装
global_install() {
    info_msg "全局安装 RCC CLI 框架..."

    # 先卸载旧版本（如果存在）
    if npm list -g rcc-cli-framework &> /dev/null; then
        info_msg "卸载旧版本..."
        npm uninstall -g rcc-cli-framework || warning_msg "卸载旧版本失败"
    fi

    # 全局安装
    npm install -g . || error_exit "全局安装失败"

    success_msg "RCC CLI 框架全局安装完成"
}

# 6. 验证安装
verify_installation() {
    info_msg "验证安装..."

    # 检查是否可以找到 rcc 命令
    if command -v rcc &> /dev/null; then
        success_msg "RCC 命令已可用"

        # 检查版本
        rcc_version=$(rcc --version 2>/dev/null || echo "未知版本")
        info_msg "RCC 版本: $rcc_version"
    else
        warning_msg "RCC 命令未找到，可能需要重新加载 shell"
    fi

    # 检查全局安装的文件
    global_rcc_path=$(npm list -g rcc-cli-framework --depth=0 2>/dev/null | grep rcc-cli-framework || echo "")
    if [ -n "$global_rcc_path" ]; then
        success_msg "全局包已正确安装"
    else
        warning_msg "全局包验证失败"
    fi
}

# 7. 运行测试
run_tests() {
    info_msg "运行基本测试..."

    # 测试 rcc 命令
    if command -v rcc &> /dev/null; then
        info_msg "测试 rcc 帮助命令..."
        rcc --help > /dev/null 2>&1 || warning_msg "rcc --help 命令失败"

        info_msg "测试 rcc 版本命令..."
        rcc --version > /dev/null 2>&1 || warning_msg "rcc --version 命令失败"

        success_msg "基本测试完成"
    else
        warning_msg "跳过测试（rcc 命令不可用）"
    fi
}

# 8. 显示使用说明
show_usage_info() {
    echo ""
    echo "🎉 安装完成！使用说明："
    echo "========================================="
    echo ""
    echo "📋 基本命令："
    echo "  rcc --help                    # 显示帮助信息"
    echo "  rcc --version                 # 显示版本信息"
    echo ""
    echo "🚀 启动服务器："
    echo "  rcc start --config ~/.rcc/rcc-config.json"
    echo "  rcc start --config ~/.rcc/rcc-config-lmstudio.json --port 5506"
    echo ""
    echo "🔧 其他选项："
    echo "  --debug <path>                # 启用调试日志"
    echo "  --port <number>               # 指定端口"
    echo ""
    echo "📝 配置文件："
    echo "  ~/.rcc/rcc-config.json        # 默认配置"
    echo "  ~/.rcc/rcc-config-lmstudio.json # LM Studio 配置"
    echo ""
    echo "⚠️  注意："
    echo "  - 确保 LM Studio 在端口 1234 运行"
    echo "  - 根据需要调整配置文件中的 API 端点"
    echo "  - 如果命令不可用，请重新加载 shell 或重启终端"
    echo ""
}

# 主执行函数
main() {
    echo -e "${BLUE}🚀 开始 RCC 全局编译和安装...${NC}"
    echo "========================================="

    # 检查目录
    check_directory

    # 执行安装步骤
    check_dependencies
    install_root_dependencies
    compile_local_modules
    compile_main_project
    global_install
    verify_installation
    run_tests

    # 显示使用说明
    show_usage_info

    echo -e "${GREEN}🎉 RCC 全局编译和安装完成！${NC}"
    echo ""
    echo "🔄 如果遇到命令找不到的问题，请运行："
    echo "   source ~/.bashrc  # 或 source ~/.zshrc (取决于你的 shell)"
    echo ""
}

# 如果脚本被直接执行（而不是被 source），则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
#!/bin/bash

# RCC 构建和安装脚本
# 完整流程：卸载 -> 清理 -> 构建 -> 安装

set -e

echo "🚀 RCC 构建和安装脚本"
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
if [ ! -f "rcc.mjs" ] || [ ! -f "package.json" ]; then
    error_exit "请确保在 RCC 项目根目录运行此脚本"
fi

# 1. 停止所有运行中的 RCC 进程
info_msg "停止所有运行中的 RCC 进程..."
pkill -f "rcc.mjs" 2>/dev/null || true
pkill -f "rcc start" 2>/dev/null || true
sleep 2
success_msg "已停止所有 RCC 进程"

# 2. 卸载全局安装的 RCC
info_msg "卸载全局安装的 RCC..."
if npm list -g rcc-cli-framework &> /dev/null; then
    npm uninstall -g rcc-cli-framework || warning_msg "卸载全局包失败"
    success_msg "已卸载全局 RCC 包"
else
    info_msg "未找到全局安装的 RCC 包"
fi

# 3. 清理所有构建文件
info_msg "清理所有构建文件..."
rm -rf dist 2>/dev/null || true
rm -rf node_modules 2>/dev/null || true
rm -rf sharedmodule/*/dist 2>/dev/null || true
rm -rf sharedmodule/*/node_modules 2>/dev/null || true
success_msg "已清理所有构建文件"

# 4. 安装根目录依赖
info_msg "安装根目录依赖..."
npm install || error_exit "根目录依赖安装失败"
success_msg "根目录依赖安装完成"

# 5. 编译所有本地模块
info_msg "编译所有本地模块..."
modules=("sharedmodule/basemodule" "sharedmodule/underconstruction" "sharedmodule/debugcenter" "sharedmodule/server" "sharedmodule/bootstrap")

for module in "${modules[@]}"; do
    if [ -d "$module" ]; then
        info_msg "编译模块: $module"
        cd "$module"

        # 清理旧的构建文件
        rm -rf node_modules dist 2>/dev/null || true

        # 安装依赖
        npm install --legacy-peer-deps || error_exit "模块 $module 依赖安装失败"

        # 编译模块
        npm run build || error_exit "模块 $module 编译失败"

        success_msg "模块 $module 编译完成"
        cd - > /dev/null
    else
        warning_msg "模块目录不存在: $module"
    fi
done

# 6. 编译主项目
info_msg "编译主项目..."
npm run clean 2>/dev/null || true
# 安装所有已发布的模块作为全局依赖
info_msg "全局安装所有 RCC 模块..."
npm install -g rcc-basemodule rcc-underconstruction rcc-debugcenter rcc-server rcc-bootstrap rcc-config-parser rcc-errorhandling rcc-pipeline rcc-dynamic-routing-classification || warning_msg "部分模块全局安装失败"
npm run build || error_exit "主项目编译失败"
success_msg "主项目编译完成"

# 7. 全局安装
info_msg "全局安装 RCC CLI 框架..."
npm install -g . || error_exit "全局安装失败"
success_msg "RCC CLI 框架全局安装完成"

# 8. 验证安装
info_msg "验证安装..."
if command -v rcc &> /dev/null; then
    success_msg "RCC 命令已可用"

    # 检查版本
    rcc_version=$(rcc --version 2>/dev/null || echo "未知版本")
    info_msg "RCC 版本: $rcc_version"

    # 测试基本命令
    if rcc --help > /dev/null 2>&1; then
        success_msg "RCC 帮助命令正常"
    else
        warning_msg "RCC 帮助命令测试失败"
    fi
else
    warning_msg "RCC 命令未找到，可能需要重新加载 shell"
fi

# 9. 显示使用说明
echo ""
echo "🎉 构建和安装完成！使用说明："
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

echo -e "${GREEN}🎉 RCC 构建和安装完成！${NC}"
echo ""
echo "🔄 如果遇到命令找不到的问题，请运行："
echo "   source ~/.bashrc  # 或 source ~/.zshrc (取决于你的 shell)"
echo ""
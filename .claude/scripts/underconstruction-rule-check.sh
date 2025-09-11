#!/bin/bash

# UnderConstruction规则检查脚本
# 检测项目中是否使用了mock占位符而非UnderConstruction模块

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/underconstruction-check.log"
EXCLUDE_FILE="${PROJECT_ROOT}/.claude/scan-exclude.txt"

# 创建必要的目录
mkdir -p "$SCAN_REPORT_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log_message() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# 显示使用说明
show_usage() {
    echo "UnderConstruction Rule Check Script"
    echo "=================================="
    echo "检查项目中是否使用了mock占位符而非UnderConstruction模块"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>     Scan specific path (default: current directory)"
    echo "  --exclude <file>  Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --report          Generate detailed report"
    echo "  --help            Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - No violations found (所有未完成功能都使用UnderConstruction模块)"
    echo "  1 - Violations found (发现mock占位符或TODO注释)"
    echo "  2 - Script error"
}

# 检查排除列表
is_excluded() {
    local file_path="$1"
    local relative_path="${file_path#$PROJECT_ROOT/}"
    
    # 检查标准排除模式
    if [[ "$relative_path" == node_modules/* ]] || \
       [[ "$relative_path" == dist/* ]] || \
       [[ "$relative_path" == .git/* ]] || \
       [[ "$relative_path" == *.test.ts ]] || \
       [[ "$relative_path" == *.spec.ts ]] || \
       [[ "$relative_path" == tmp/* ]] || \
       [[ "$relative_path" == .tmp/* ]]; then
        return 0
    fi
    
    # 检查自定义排除文件
    if [ -f "$EXCLUDE_FILE" ]; then
        while IFS= read -r pattern; do
            # 跳过注释和空行
            [[ "$pattern" =~ ^#.*$ ]] && continue
            [[ -z "$pattern" ]] && continue
            
            # 移除前后空格
            pattern=$(echo "$pattern" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            # 检查是否匹配
            if [[ "$relative_path" == $pattern ]] || \
               [[ "$relative_path" == $pattern* ]] || \
               [[ "$relative_path" == */$pattern ]] || \
               [[ "$relative_path" == */$pattern/* ]]; then
                return 0
            fi
        done < "$EXCLUDE_FILE"
    fi
    
    return 1
}

# 检测违规的占位符使用
detect_placeholder_violations() {
    local scan_path="${1:-$PROJECT_ROOT}"
    local violations_found=0
    local total_files=0
    
    log_message "INFO" "Starting UnderConstruction rule check in $scan_path"
    
    # 查找源代码文件 - 支持文件列表或目录扫描
    local source_files
    if [ -f "$scan_path" ] && [[ "$scan_path" =~ \.(ts|js|tsx|jsx)$ ]]; then
        # 如果是单个文件，直接使用
        source_files="$scan_path"
    elif [ -f "$scan_path" ] && [ -r "$scan_path" ]; then
        # 如果是文件列表（来自git暂存）
        source_files=$(cat "$scan_path" | grep -E '\.(ts|js|tsx|jsx)$' || true)
    else
        # 如果是目录，查找所有源代码文件
        source_files=$(find "$scan_path" -type f \( \
            -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \
        \) 2>/dev/null || true)
    fi
    
    # 创建临时文件存储结果
    local temp_results
    temp_results=$(mktemp)
    
    # 检查每个文件
    while IFS= read -r file; do
        # 跳过排除的文件
        if is_excluded "$file"; then
            continue
        fi
        
        total_files=$((total_files + 1))
        
        # 检查文件中是否包含违规的占位符模式
        # 1. 检查TODO/FIXME注释
        if grep -n -E "TODO|FIXME" "$file" 2>/dev/null | grep -v -E "^\s*\/\/.*[Uu]nder[Cc]onstruction|^\s*\*.*[Uu]nder[Cc]onstruction" > /dev/null 2>&1; then
            while IFS=: read -r line_num content; do
                # 检查是否不是UnderConstruction相关的TODO
                if [[ "$content" =~ TODO|FIXME ]] && [[ ! "$content" =~ [Uu]nder[Cc]onstruction ]]; then
                    echo "$file:$line_num:$content" >> "$temp_results"
                    violations_found=1
                fi
            done < <(grep -n -E "TODO|FIXME" "$file" 2>/dev/null)
        fi
        
        # 2. 检查Not implemented错误
        if grep -n -i "not implemented" "$file" 2>/dev/null | grep -v -E "^\s*\/\/|^\s*\*|^\s*\/\*|\*\/\s*$" > /dev/null 2>&1; then
            while IFS=: read -r line_num content; do
                if [[ "$content" =~ [Nn]ot[[:space:]]*implemented ]] || [[ "$content" =~ [Nn]ot[[:space:]]*implement ]]; then
                    echo "$file:$line_num:$content" >> "$temp_results"
                    violations_found=1
                fi
            done < <(grep -n -i "not implemented" "$file" 2>/dev/null)
        fi
        
        # 3. 检查mock相关字样（非测试文件）
        local file_relative="${file#$PROJECT_ROOT/}"
        if [[ "$file_relative" != *test* ]] && [[ "$file_relative" != *spec* ]]; then
            if grep -n -i "mock" "$file" 2>/dev/null | grep -v -E "^\s*\/\/|^\s*\*|^\s*\/\*|\*\/\s*$|@param|@return" > /dev/null 2>&1; then
                while IFS=: read -r line_num content; do
                    # 检查是否是真正的代码中的mock使用
                    if [[ "$content" =~ [a-zA-Z0-9_]*mock[a-zA-Z0-9_]* ]] || \
                       [[ "$content" =~ \"[^\"]*mock[^\"]*\" ]] || \
                       [[ "$content" =~ mock[A-Z] ]] || \
                       [[ "$content" =~ new[[:space:]]+Mock ]]; then
                        echo "$file:$line_num:$content" >> "$temp_results"
                        violations_found=1
                    fi
                done < <(grep -n -i "mock" "$file" 2>/dev/null)
            fi
        fi
    done <<< "$source_files"
    
    # 输出结果
    if [ -s "$temp_results" ]; then
        echo ""
        echo "🚨 发现违规占位符使用，必须使用UnderConstruction模块替代"
        echo "="$(printf "%*s" 70 | tr ' ' '=')""
        echo ""
        
        # 按违规类型分组显示
        local todo_count=0
        local not_implemented_count=0
        local mock_count=0
        
        while IFS= read -r violation; do
            local file=$(echo "$violation" | cut -d: -f1)
            local line=$(echo "$violation" | cut -d: -f2)
            local content=$(echo "$violation" | cut -d: -f3-)
            
            # 统计违规类型
            if [[ "$content" =~ TODO|FIXME ]]; then
                todo_count=$((todo_count + 1))
                echo "📍 TODO/FIXME 注释:"
                echo "   文件: $file:$line"
                echo "   内容: $content"
                echo "   问题: 使用TODO注释而非UnderConstruction模块标记未完成功能"
                echo ""
            elif [[ "$content" =~ [Nn]ot[[:space:]]*implement ]]; then
                not_implemented_count=$((not_implemented_count + 1))
                echo "📍 Not Implemented 错误:"
                echo "   文件: $file:$line"
                echo "   内容: $content"
                echo "   问题: 抛出'Not implemented'错误而非使用UnderConstruction模块"
                echo ""
            elif [[ "$content" =~ [a-zA-Z0-9_]*mock[a-zA-Z0-9_]* ]] || [[ "$content" =~ mock[A-Z] ]]; then
                mock_count=$((mock_count + 1))
                echo "📍 Mock 占位符:"
                echo "   文件: $file:$line"
                echo "   内容: $content"
                echo "   问题: 使用mock占位符而非UnderConstruction模块处理未完成功能"
                echo ""
            fi
        done < "$temp_results"
        
        # 统计汇总
        echo "📊 违规统计:"
        echo "   - TODO/FIXME 注释: $todo_count 处"
        echo "   - Not Implemented 错误: $not_implemented_count 处"
        echo "   - Mock 占位符: $mock_count 处"
        echo ""
        
        # 提供详细的修复指导
        echo "🔧 修复指导:"
        echo "1. 删除所有TODO/FIXME注释"
        echo "2. 替换'Not implemented'错误抛出"
        echo "3. 移除mock占位符和临时返回值"
        echo "4. 使用UnderConstruction模块进行功能标记"
        echo ""
        
        # 修复示例
        echo "✅ 修复示例:"
        echo ""
        echo "❌ 错误示例:"
        echo "   // TODO: 实现用户认证"
        echo "   function authenticateUser() {"
        echo "     throw new Error('Not implemented');"
        echo "   }"
        echo ""
        echo "✅ 正确示例:"
        echo "   import { underConstruction } from './utils/underConstructionIntegration';"
        echo "   function authenticateUser() {"
        echo "     return underConstruction.callUnderConstructionFeature('user-authentication', {"
        echo "       caller: 'authenticateUser',"
        echo "       purpose: '用户身份认证功能，验证用户名和密码并返回认证令牌'"
        echo "     });"
        echo "   }"
        echo ""
        
        echo "📖 参考文档:"
        echo "   - 使用规范: ./.claude/rules/001-underconstruction.md"
        echo "   - 使用指南: ./UNDERCONSTRUCTION_USAGE_GUIDELINES.md"
        echo "   - API文档: ./sharedmodule/underconstruction/README.md"
        echo ""
        
        log_message "CRITICAL" "发现 $((todo_count + not_implemented_count + mock_count)) 处违规占位符使用"
    else
        echo "✅ 所有未完成功能都正确使用了UnderConstruction模块 (扫描了 $total_files 个文件)"
        log_message "INFO" "✅ 所有未完成功能都正确使用了UnderConstruction模块 (扫描了 $total_files 个文件)"
    fi
    
    # 清理临时文件
    rm -f "$temp_results"
    
    return $violations_found
}

# 主函数
main() {
    local scan_path="$PROJECT_ROOT"
    local generate_report=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --path)
                scan_path="$2"
                shift 2
                ;;
            --exclude)
                EXCLUDE_FILE="$2"
                shift 2
                ;;
            --report)
                generate_report=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            -*)
                echo "Unknown option: $1"
                show_usage
                exit 2
                ;;
            *)
                # 如果不是选项参数，且是第一个位置参数，则作为扫描路径
                if [ "$scan_path" = "$PROJECT_ROOT" ]; then
                    scan_path="$1"
                    shift
                else
                    echo "Unknown option: $1"
                    show_usage
                    exit 2
                fi
                ;;
        esac
    done
    
    # 验证扫描路径
    if [ ! -e "$scan_path" ]; then
        log_message "ERROR" "Scan path does not exist: $scan_path"
        exit 2
    fi
    
    # 执行扫描
    if detect_placeholder_violations "$scan_path"; then
        log_message "INFO" "UnderConstruction rule check completed successfully"
        exit 0
    else
        log_message "CRITICAL" "发现违规占位符使用，请使用UnderConstruction模块"
        exit 1
    fi
}

# 执行主函数
main "$@"
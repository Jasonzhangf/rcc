#!/bin/bash

# Mock检测脚本
# 检测项目中是否包含mock相关字样

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/mock-detection.log"
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
    echo "Mock Detection Script"
    echo "===================="
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>     Scan specific path (default: current directory)"
    echo "  --exclude <file>  Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --report          Generate detailed report"
    echo "  --help            Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - No mock violations found"
    echo "  1 - Mock violations found"
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

# 检测mock相关字样
detect_mock_violations() {
    local scan_path="${1:-$PROJECT_ROOT}"
    local violations_found=0
    local total_files=0
    
    log_message "INFO" "Starting mock detection scan in $scan_path"
    
    # 查找所有源代码文件
    local source_files
    source_files=$(find "$scan_path" -type f \( \
        -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \
    \) 2>/dev/null || true)
    
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
        
        # 检查文件中是否包含mock相关字样
        # 使用grep查找但排除注释和文档中的合法使用
        if grep -n -i "mock" "$file" 2>/dev/null | grep -v -E "^\s*\/\/|^\s*\*|^\s*\/\*|\*\/\s*$|@param|@return|TODO|FIXME" > /dev/null 2>&1; then
            # 找到可能的违规，详细检查
            while IFS=: read -r line_num content; do
                # 跳过注释行
                if [[ "$content" =~ ^[[:space:]]*\/\/ ]] || \
                   [[ "$content" =~ ^[[:space:]]*\* ]] || \
                   [[ "$content" =~ ^[[:space:]]*\/\* ]] || \
                   [[ "$content" =~ \*\/[[:space:]]*$ ]] || \
                   [[ "$content" =~ ^[[:space:]]*\*[[:space:]]*.*mock ]]; then
                    continue
                fi
                
                # 检查是否是真正的代码中的mock使用
                if [[ "$content" =~ [a-zA-Z0-9_]*mock[a-zA-Z0-9_]* ]] || \
                   [[ "$content" =~ \"[^\"]*mock[^\"]*\" ]] || \
                   [[ "$content" =~ \//[^\/*]*mock ]] || \
                   [[ "$content" =~ mock[A-Z] ]] || \
                   [[ "$content" =~ new[[:space:]]+Mock ]]; then
                    
                    # 检查上下文，排除测试文件中的合法使用
                    local file_relative="${file#$PROJECT_ROOT/}"
                    if [[ "$file_relative" != *test* ]] && [[ "$file_relative" != *spec* ]]; then
                        echo "$file:$line_num:$content" >> "$temp_results"
                        violations_found=1
                    fi
                fi
            done < <(grep -n -i "mock" "$file" 2>/dev/null)
        fi
    done <<< "$source_files"
    
    # 输出结果
    if [ -s "$temp_results" ]; then
        log_message "CRITICAL" "Mock violations found:"
        while IFS= read -r violation; do
            log_message "CRITICAL" "  $violation"
            echo "$violation"
        done < "$temp_results"
    else
        log_message "INFO" "No mock violations found in $total_files files"
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
            *)
                echo "Unknown option: $1"
                show_usage
                exit 2
                ;;
        esac
    done
    
    # 验证扫描路径
    if [ ! -d "$scan_path" ]; then
        log_message "ERROR" "Scan path does not exist: $scan_path"
        exit 2
    fi
    
    # 执行扫描
    if detect_mock_violations "$scan_path"; then
        log_message "INFO" "Mock detection completed successfully"
        exit 0
    else
        log_message "CRITICAL" "Mock violations detected"
        exit 1
    fi
}

# 执行主函数
main "$@"
#!/bin/bash

# 硬编码检测脚本
# 检测项目中是否存在硬编码的值

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/hardcode-detection.log"
EXCLUDE_FILE="${PROJECT_ROOT}/.claude/scan-exclude.txt"
HARDCODE_RULES_FILE="${PROJECT_ROOT}/.claude/hardcode-rules.json"

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
    echo "Hardcode Detection Script"
    echo "========================="
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>     Scan specific path (default: current directory)"
    echo "  --exclude <file>  Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --rules <file>    Custom rules file (default: .claude/hardcode-rules.json)"
    echo "  --report          Generate detailed report"
    echo "  --severity <level> Minimum severity level (DEBUG, INFO, WARNING, CRITICAL)"
    echo "  --help            Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - No hardcoded violations found"
    echo "  1 - Hardcoded violations found"
    echo "  2 - Script error"
}

# 初始化默认规则
init_default_rules() {
    cat > "$HARDCODE_RULES_FILE" << 'EOF'
{
  "rules": {
    "numeric_literals": {
      "description": "数字常量检测（除0, 1, -1外的数字）",
      "severity": "WARNING",
      "exceptions": ["0", "1", "-1", "100", "1000", "3600", "60", "24"],
      "patterns": [
        "\\b[0-9]{2,}\\b"
      ]
    },
    "string_literals": {
      "description": "字符串字面量检测",
      "severity": "WARNING",
      "exceptions": [
        "", "[]", "{}", "true", "false", "null", "undefined",
        "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS",
        "application/json", "text/plain", "text/html"
      ],
      "patterns": [
        "\"[^\"]{3,}\"",
        "'[^']{3,}'"
      ]
    },
    "url_literals": {
      "description": "URL硬编码检测",
      "severity": "CRITICAL",
      "patterns": [
        "https?://[^\\s\"']{5,}",
        "ftp://[^\\s\"']{5,}",
        "ws://[^\\s\"']{5,}",
        "wss://[^\\s\"']{5,}"
      ]
    },
    "file_path_literals": {
      "description": "文件路径硬编码检测",
      "severity": "CRITICAL",
      "exceptions": [
        "/tmp", "/dev", "/proc", "/sys", "/var", "/usr", "/bin", "/etc"
      ],
      "patterns": [
        "\\/[^\\s\"']*\\.(json|xml|yaml|yml|txt|log|conf|cfg)",
        "\\/[^\\s\"']*\\/(src|lib|bin|config|data)"
      ]
    },
    "ip_address_literals": {
      "description": "IP地址硬编码检测",
      "severity": "CRITICAL",
      "patterns": [
        "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b",
        "\\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\\b"
      ]
    },
    "port_literals": {
      "description": "端口号硬编码检测",
      "severity": "WARNING",
      "exceptions": ["80", "443", "8080", "3000", "5000", "8000", "9000"],
      "patterns": [
        "\\b(?:port|PORT)[^\\d]*:\\s*[0-9]{4,}",
        "\\:[0-9]{4,}"
      ]
    },
    "magic_strings": {
      "description": "魔法字符串检测",
      "severity": "WARNING",
      "patterns": [
        "\\b[A-Z][A-Z_]*[A-Z_0-9]\\b",
        "\\b[A-Z]{2,}\\b"
      ]
    },
    "hex_literals": {
      "description": "十六进制硬编码检测",
      "severity": "WARNING",
      "patterns": [
        "\\b0x[0-9A-Fa-f]{8,}\\b",
        "\\b#[0-9A-Fa-f]{6,8}\\b"
      ]
    },
    "database_connection": {
      "description": "数据库连接硬编码检测",
      "severity": "CRITICAL",
      "patterns": [
        "mongodb://[^\\s\"']+",
        "mysql://[^\\s\"']+",
        "postgres://[^\\s\"']+",
        "redis://[^\\s\"']+",
        "@[^\\s\"']*:[^\\s\"']*@"
      ]
    }
  },
  "file_exceptions": [
    "*.test.ts",
    "*.spec.ts",
    "*.mock.ts",
    "*.fixture.ts",
    "config/defaults.ts",
    "constants.ts",
    "*.config.js",
    "*.config.ts"
  ]
}
EOF
    log_message "INFO" "Created default hardcode rules file at: $HARDCODE_RULES_FILE"
}

# 加载规则文件
load_rules() {
    if [ ! -f "$HARDCODE_RULES_FILE" ]; then
        log_message "INFO" "No hardcode rules file found, creating default rules"
        init_default_rules
    fi

    # 检查是否有jq工具来解析JSON
    if ! command -v jq &> /dev/null; then
        log_message "WARNING" "jq command not found, will use basic pattern matching"
        return 1
    fi

    return 0
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
    
    # 检查规则文件中的异常
    if command -v jq &> /dev/null && [ -f "$HARDCODE_RULES_FILE" ]; then
        local file_exceptions=$(jq -r '.file_exceptions[]' "$HARDCODE_RULES_FILE" 2>/dev/null)
        while IFS= read -r pattern; do
            [ -n "$pattern" ] && [[ "$relative_path" == $pattern ]] && return 0
        done <<< "$file_exceptions"
    fi
    
    # 检查自定义排除文件
    if [ -f "$EXCLUDE_FILE" ]; then
        while IFS= read -r pattern; do
            [[ "$pattern" =~ ^#.*$ ]] && continue
            [[ -z "$pattern" ]] && continue
            
            pattern=$(echo "$pattern" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
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

# 检查字符串是否在异常列表中
is_exception() {
    local value="$1"
    local rule_name="$2"
    
    if command -v jq &> /dev/null && [ -f "$HARDCODE_RULES_FILE" ]; then
        local exceptions=$(jq -r ".rules.${rule_name}.exceptions[]" "$HARDCODE_RULES_FILE" 2>/dev/null)
        while IFS= read -r exception; do
            [ -n "$exception" ] && [ "$value" = "$exception" ] && return 0
        done <<< "$exceptions"
    fi
    
    return 1
}

# 检测硬编码违规
detect_hardcode_violations() {
    local scan_path="${1:-$PROJECT_ROOT}"
    local violations_found=0
    local total_files=0
    local min_severity="${2:-INFO}"
    
    log_message "INFO" "Starting hardcode detection scan in $scan_path"
    
    # 查找所有源代码文件
    local source_files
    source_files=$(find "$scan_path" -type f \( \
        -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \
        -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \
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
        
        # 只在jq可用时使用JSON规则
        if command -v jq &> /dev/null && [ -f "$HARDCODE_RULES_FILE" ]; then
            process_file_with_rules "$file" "$temp_results" "$min_severity"
        else
            process_file_basic "$file" "$temp_results"
        fi
    done <<< "$source_files"
    
    # 输出结果
    if [ -s "$temp_results" ]; then
        log_message "CRITICAL" "Hardcoded violations found:"
        while IFS= read -r violation; do
            log_message "CRITICAL" "  $violation"
            echo "$violation"
        done < "$temp_results"
        violations_found=1
    else
        log_message "INFO" "No hardcoded violations found in $total_files files"
    fi
    
    # 清理临时文件
    rm -f "$temp_results"
    
    return $violations_found
}

# 使用JSON规则处理文件
process_file_with_rules() {
    local file="$1"
    local results_file="$2"
    local min_severity="$3"
    
    # 获取规则列表
    local rules=$(jq -r '.rules | keys[]' "$HARDCODE_RULES_FILE" 2>/dev/null)
    
    while IFS= read -r rule_name; do
        [ -n "$rule_name" ] || continue
        
        local rule_info=$(jq -r ".rules.${rule_name}" "$HARDCODE_RULES_FILE" 2>/dev/null)
        local severity=$(echo "$rule_info" | jq -r '.severity')
        local description=$(echo "$rule_info" | jq -r '.description')
        
        # 检查严重级别
        if ! is_severity_matched "$severity" "$min_severity"; then
            continue
        fi
        
        # 获取模式
        local patterns=$(echo "$rule_info" | jq -r '.patterns[]')
        
        while IFS= read -r pattern; do
            [ -n "$pattern" ] || continue
            
            # 搜索文件中的模式
            if grep -n -E "$pattern" "$file" 2>/dev/null > /dev/null 2>&1; then
                local matches=$(grep -n -E "$pattern" "$file" 2>/dev/null)
                while IFS=: read -r line_num content; do
                    # 跳过注释行
                    if [[ "$content" =~ ^[[:space:]]*\/\/ ]] || \
                       [[ "$content" =~ ^[[:space:]]*\* ]] || \
                       [[ "$content" =~ ^[[:space:]]*\/\* ]] || \
                       [[ "$content" =~ \*\/[[:space:]]*$ ]]; then
                        continue
                    fi
                    
                    # 提取匹配的值
                    local matched_value=$(echo "$content" | grep -o -E "$pattern" | head -1)
                    
                    if [ -n "$matched_value" ]; then
                        # 检查是否在异常列表中
                        if ! is_exception "$matched_value" "$rule_name"; then
                            local file_relative="${file#$PROJECT_ROOT/}"
                            echo "[$severity] $file_relative:$line_num - $description: $matched_value" >> "$results_file"
                        fi
                    fi
                done <<< "$matches"
            fi
        done <<< "$patterns"
    done <<< "$rules"
}

# 使用基本模式处理文件
process_file_basic() {
    local file="$1"
    local results_file="$2"
    
    local file_relative="${file#$PROJECT_ROOT/}"
    
    # 检查URL
    if grep -n -E "https?://[^\\s\"']{5,}" "$file" 2>/dev/null > /dev/null 2>&1; then
        while IFS=: read -r line_num content; do
            local urls=$(echo "$content" | grep -o -E "https?://[^\\s\"']{5,}")
            for url in $urls; do
                echo "[CRITICAL] $file_relative:$line_num - Hardcoded URL: $url" >> "$results_file"
            done
        done < <(grep -n -E "https?://[^\\s\"']{5,}" "$file" 2>/dev/null)
    fi
    
    # 检查IP地址
    if grep -n -E "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b" "$file" 2>/dev/null > /dev/null 2>&1; then
        while IFS=: read -r line_num content; do
            local ips=$(echo "$content" | grep -o -E "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b")
            for ip in $ips; do
                # 排除常见IP地址
                if [[ "$ip" != "127.0.0.1" ]] && [[ "$ip" != "0.0.0.0" ]]; then
                    echo "[CRITICAL] $file_relative:$line_num - Hardcoded IP: $ip" >> "$results_file"
                fi
            done
        done < <(grep -n -E "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b" "$file" 2>/dev/null)
    fi
}

# 检查严重级别是否匹配
is_severity_matched() {
    local rule_severity="$1"
    local min_severity="$2"
    
    case "$rule_severity" in
        "DEBUG")    return 0 ;;
        "INFO")     [[ "$min_severity" != "DEBUG" ]] && return 0 ;;
        "WARNING")  [[ "$min_severity" == "WARNING" || "$min_severity" == "CRITICAL" ]] && return 0 ;;
        "CRITICAL") [[ "$min_severity" == "CRITICAL" ]] && return 0 ;;
    esac
    
    return 1
}

# 主函数
main() {
    local scan_path="$PROJECT_ROOT"
    local generate_report=false
    local min_severity="INFO"
    local custom_rules=""
    
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
            --rules)
                custom_rules="$2"
                shift 2
                ;;
            --report)
                generate_report=true
                shift
                ;;
            --severity)
                min_severity="$2"
                shift 2
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
    
    # 验证严重级别
    if [[ "$min_severity" != "DEBUG" && "$min_severity" != "INFO" && "$min_severity" != "WARNING" && "$min_severity" != "CRITICAL" ]]; then
        log_message "ERROR" "Invalid severity level: $min_severity"
        exit 2
    fi
    
    # 使用自定义规则文件
    if [ -n "$custom_rules" ]; then
        if [ -f "$custom_rules" ]; then
            HARDCODE_RULES_FILE="$custom_rules"
            log_message "INFO" "Using custom rules file: $custom_rules"
        else
            log_message "ERROR" "Custom rules file not found: $custom_rules"
            exit 2
        fi
    fi
    
    # 加载规则
    load_rules
    
    # 执行扫描
    if detect_hardcode_violations "$scan_path" "$min_severity"; then
        log_message "INFO" "Hardcode detection completed successfully"
        exit 0
    else
        log_message "CRITICAL" "Hardcoded violations detected"
        exit 1
    fi
}

# 执行主函数
main "$@"
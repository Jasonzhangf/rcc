#!/bin/bash

# 项目扫描主脚本
# 协调所有检测脚本，执行全面的项目扫描

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCRIPT_DIR="${PROJECT_ROOT}/.claude/scripts"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/project-scanner.log"
EXCLUDE_FILE="${PROJECT_ROOT}/.claude/scan-exclude.txt"
COMBINED_REPORT_FILE="${SCAN_REPORT_DIR}/combined-report.json"
SUMMARY_REPORT_FILE="${SCAN_REPORT_DIR}/summary-report.json"

# 扫描脚本路径
MOCK_DETECTOR="${SCRIPT_DIR}/mock-detector.sh"
HARDCODE_DETECTOR="${SCRIPT_DIR}/hardcode-detector.sh"
API_VALIDATOR="${SCRIPT_DIR}/api-validator.sh"
MODULE_VALIDATOR="${SCRIPT_DIR}/module-structure-validator.sh"

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
    echo "Project Scanner Script"
    echo "======================"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>            Scan specific path (default: current directory)"
    echo "  --exclude <file>         Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --check <types>          Comma-separated check types (default: all)"
    echo "                             Types: mock,hardcode,api,structure"
    echo "  --module <name>          Scan specific module only"
    echo "  --severity <level>       Minimum severity level (DEBUG, INFO, WARNING, CRITICAL)"
    echo "  --report <format>        Report format: simple, detailed, json (default: simple)"
    echo "  --output <file>          Output file for combined report"
    echo "  --strict                 Enable strict validation mode"
    echo "  --fail-fast              Stop on first error"
    echo "  --parallel               Run checks in parallel"
    echo "  --help                   Show this help"
    echo ""
    echo "Scan Modes:"
    echo "  --full-scan              Full scan with all checks (default)"
    echo "  --quick-scan             Quick scan (only critical checks)"
    echo "  --custom-scan            Custom scan with specified checks"
    echo ""
    echo "Exit codes:"
    echo "  0 - No violations found"
    echo "  1 - Violations found"
    echo "  2 - Script error"
    echo "  3 - Configuration error"
    echo ""
    echo "Examples:"
    echo "  $0 --full-scan                          # Full scan"
    echo "  $0 --quick-scan                         # Quick scan"
    echo "  $0 --check mock,hardcode                # Only mock and hardcode checks"
    echo "  $0 --module user-module --full-scan     # Scan specific module"
    echo "  $0 --severity CRITICAL --report json    # Only critical violations, JSON report"
}

# 检查脚本权限和可用性
check_script_availability() {
    local scripts=("$MOCK_DETECTOR" "$HARDCODE_DETECTOR" "$API_VALIDATOR" "$MODULE_VALIDATOR")
    local missing_scripts=()
    
    for script in "${scripts[@]}"; do
        if [ ! -f "$script" ]; then
            missing_scripts+=("$script")
        elif [ ! -x "$script" ]; then
            chmod +x "$script"
            log_message "INFO" "Made script executable: $script"
        fi
    done
    
    if [ ${#missing_scripts[@]} -gt 0 ]; then
        log_message "ERROR" "Missing required scripts:"
        for script in "${missing_scripts[@]}"; do
            echo "  - $script"
        done
        exit 2
    fi
}

# 初始化扫描报告
initialize_scan_report() {
    local scan_type="$1"
    local scan_path="$2"
    
    cat > "$COMBINED_REPORT_FILE" << EOF
{
  "scan_info": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "scan_type": "$scan_type",
    "project_path": "$scan_path",
    "scanner_version": "1.0.0"
  },
  "summary": {
    "total_files_scanned": 0,
    "total_violations": 0,
    "critical_violations": 0,
    "warning_violations": 0,
    "info_violations": 0
  },
  "results": {
    "mock_detection": {
      "status": "not_run",
      "violations": [],
      "summary": {}
    },
    "hardcode_detection": {
      "status": "not_run",
      "violations": [],
      "summary": {}
    },
    "api_validation": {
      "status": "not_run",
      "violations": [],
      "summary": {}
    },
    "module_structure_validation": {
      "status": "not_run",
      "violations": [],
      "summary": {}
    }
  },
  "recommendations": []
}
EOF
}

# 运行Mock检测
run_mock_detection() {
    local scan_path="$1"
    local module_name="$2"
    local severity_level="${3:-INFO}"
    local output_file="${SCAN_REPORT_DIR}/mock-detection-result.json"
    
    log_message "INFO" "Starting Mock detection..."
    
    local cmd=("$MOCK_DETECTOR" "--path" "$scan_path")
    
    if [ -n "$module_name" ]; then
        cmd+=("--module" "$module_name")
    fi
    
    # 捕获输出和退出码
    local output
    local exit_code
    output=$( "${cmd[@]}" 2>&1 )
    exit_code=$?
    
    # 解析输出
    local violations=()
    local summary_file="${SCAN_REPORT_DIR}/mock-summary.txt"
    
    if [ $exit_code -eq 1 ]; then
        # 发现违规
        while IFS= read -r line; do
            if [[ "$line" =~ \[CRITICAL\] ]]; then
                violations+=("$line")
            fi
        done <<< "$output"
    fi
    
    # 保存结果
    cat > "$output_file" << EOF
{
  "scan_type": "mock_detection",
  "exit_code": $exit_code,
  "violations_count": ${#violations[@]},
  "violations": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .),
  "raw_output": $(echo "$output" | jq -R . | jq -s .)
}
EOF
    
    # 更新综合报告
    update_combined_report "mock_detection" $exit_code "$output_file" ${#violations[@]}
    
    log_message "INFO" "Mock detection completed with ${#violations[@]} violations found"
    return $exit_code
}

# 运行硬编码检测
run_hardcode_detection() {
    local scan_path="$1"
    local module_name="$2"
    local severity_level="${3:-INFO}"
    local output_file="${SCAN_REPORT_DIR}/hardcode-detection-result.json"
    
    log_message "INFO" "Starting Hardcode detection..."
    
    local cmd=("$HARDCODE_DETECTOR" "--path" "$scan_path" "--severity" "$severity_level")
    
    if [ -n "$module_name" ]; then
        cmd+=("--module" "$module_name")
    fi
    
    # 捕获输出和退出码
    local output
    local exit_code
    output=$( "${cmd[@]}" 2>&1 )
    exit_code=$?
    
    # 解析输出
    local violations=()
    
    if [ $exit_code -eq 1 ]; then
        while IFS= read -r line; do
            if [[ "$line" =~ \[(CRITICAL|WARNING|INFO)\] ]]; then
                violations+=("$line")
            fi
        done <<< "$output"
    fi
    
    # 保存结果
    cat > "$output_file" << EOF
{
  "scan_type": "hardcode_detection",
  "exit_code": $exit_code,
  "violations_count": ${#violations[@]},
  "violations": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .),
  "raw_output": $(echo "$output" | jq -R . | jq -s .)
}
EOF
    
    # 更新综合报告
    update_combined_report "hardcode_detection" $exit_code "$output_file" ${#violations[@]}
    
    log_message "INFO" "Hardcode detection completed with ${#violations[@]} violations found"
    return $exit_code
}

# 运行API验证
run_api_validation() {
    local scan_path="$1"
    local module_name="$2"
    local strict_mode="${3:-false}"
    local output_file="${SCAN_REPORT_DIR}/api-validation-result.json"
    
    log_message "INFO" "Starting API validation..."
    
    local cmd=("$API_VALIDATOR" "--path" "$scan_path")
    
    if [ -n "$module_name" ]; then
        cmd+=("--module" "$module_name")
    fi
    
    if [ "$strict_mode" = "true" ]; then
        cmd+=("--strict")
    fi
    
    # 捕获输出和退出码
    local output
    local exit_code
    output=$( "${cmd[@]}" 2>&1 )
    exit_code=$?
    
    # 解析输出
    local violations=()
    
    if [ $exit_code -eq 1 ]; then
        while IFS= read -r line; do
            if [[ "$line" =~ \[(CRITICAL|WARNING|INFO)\] ]]; then
                violations+=("$line")
            fi
        done <<< "$output"
    fi
    
    # 保存结果
    cat > "$output_file" << EOF
{
  "scan_type": "api_validation",
  "exit_code": $exit_code,
  "violations_count": ${#violations[@]},
  "violations": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .),
  "raw_output": $(echo "$output" | jq -R . | jq -s .)
}
EOF
    
    # 更新综合报告
    update_combined_report "api_validation" $exit_code "$output_file" ${#violations[@]}
    
    log_message "INFO" "API validation completed with ${#violations[@]} violations found"
    return $exit_code
}

# 运行模块结构验证
run_module_structure_validation() {
    local scan_path="$1"
    local module_name="$2"
    local strict_mode="${3:-false}"
    local output_file="${SCAN_REPORT_DIR}/module-structure-result.json"
    
    log_message "INFO" "Starting Module Structure validation..."
    
    local cmd=("$MODULE_VALIDATOR" "--path" "$scan_path")
    
    if [ -n "$module_name" ]; then
        cmd+=("--module" "$module_name")
    fi
    
    if [ "$strict_mode" = "true" ]; then
        cmd+=("--strict")
    fi
    
    # 捕获输出和退出码
    local output
    local exit_code
    output=$( "${cmd[@]}" 2>&1 )
    exit_code=$?
    
    # 解析输出
    local violations=()
    
    if [ $exit_code -eq 1 ]; then
        while IFS= read -r line; do
            if [[ "$line" =~ \[(CRITICAL|WARNING|INFO)\] ]]; then
                violations+=("$line")
            fi
        done <<< "$output"
    fi
    
    # 保存结果
    cat > "$output_file" << EOF
{
  "scan_type": "module_structure_validation",
  "exit_code": $exit_code,
  "violations_count": ${#violations[@]},
  "violations": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .),
  "raw_output": $(echo "$output" | jq -R . | jq -s .)
}
EOF
    
    # 更新综合报告
    update_combined_report "module_structure_validation" $exit_code "$output_file" ${#violations[@]}
    
    log_message "INFO" "Module structure validation completed with ${#violations[@]} violations found"
    return $exit_code
}

# 更新综合报告
update_combined_report() {
    local scan_type="$1"
    local exit_code="$2"
    local result_file="$3"
    local violations_count="$4"
    
    # 检查jq是否可用
    if ! command -v jq &> /dev/null; then
        log_message "WARNING" "jq not available, cannot update combined report"
        return
    fi
    
    # 更新状态
    local status="passed"
    if [ $exit_code -eq 1 ]; then
        status="failed"
    elif [ $exit_code -eq 2 ]; then
        status="error"
    fi
    
    # 更新综合报告
    jq --arg scan_type "$scan_type" \
       --arg status "$status" \
       --argjson violations_count "$violations_count" \
       --arg result_file "$result_file" \
       '.results[$scan_type].status = $status |
        .results[$scan_type].violations_count = $violations_count |
        .results[$scan_type].result_file = $result_file' \
       "$COMBINED_REPORT_FILE" > "${COMBINED_REPORT_FILE}.tmp"
    
    mv "${COMBINED_REPORT_FILE}.tmp" "$COMBINED_REPORT_FILE"
}

# 生成摘要报告
generate_summary_report() {
    local report_format="${1:-simple}"
    
    if [ "$report_format" = "json" ]; then
        # 生成JSON摘要
        if command -v jq &> /dev/null; then
            # 计算总数
            local total_files=0
            local total_violations=0
            local critical_violations=0
            local warning_violations=0
            local info_violations=0
            
            # 从各个结果文件中统计
            for result_file in "${SCAN_REPORT_DIR}"/*-result.json; do
                if [ -f "$result_file" ]; then
                    local violations=$(jq '.violations_count' "$result_file")
                    total_violations=$((total_violations + violations))
                    
                    # 统计严重程度
                    local critical_count=$(jq '.violations | map(select(. | ascii_downcase | contains("critical"))) | length' "$result_file")
                    local warning_count=$(jq '.violations | map(select(. | ascii_downcase | contains("warning"))) | length' "$result_file")
                    local info_count=$(jq '.violations | map(select(. | ascii_downcase | contains("info"))) | length' "$result_file")
                    
                    critical_violations=$((critical_violations + critical_count))
                    warning_violations=$((warning_violations + warning_count))
                    info_violations=$((info_violations + info_count))
                fi
            done
            
            # 生成摘要
            cat > "$SUMMARY_REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_violations": $total_violations,
  "critical_violations": $critical_violations,
  "warning_violations": $warning_violations,
  "info_violations": $info_violations,
  "overall_status": "$([ $total_violations -gt 0 ] && echo "failed" || echo "passed")"
}
EOF
        fi
    fi
    
    # 生成文本摘要
    generate_text_summary
}

# 生成文本摘要
generate_text_summary() {
    local summary_file="${SCAN_REPORT_DIR}/scan-summary.txt"
    
    cat > "$summary_file" << EOF
Project Scan Summary
===================

Scan Time: $(date '+%Y-%m-%d %H:%M:%S')
Project: $PROJECT_ROOT

Scan Results:
------------

EOF
    
    # 添加各个扫描的结果
    local scan_types=("mock_detection" "hardcode_detection" "api_validation" "module_structure_validation")
    
    for scan_type in "${scan_types[@]}"; do
        local result_file="${SCAN_REPORT_DIR}/${scan_type//-/}-result.json"
        
        if [ -f "$result_file" ]; then
            local status=$(jq -r '.status' "$result_file" 2>/dev/null || echo "unknown")
            local count=$(jq '.violations_count' "$result_file" 2>/dev/null || echo "0")
            
            local type_name="${scan_type//_/ }"
            type_name="${type_name^}"
            
            echo "$type_name: $status ($count violations)" >> "$summary_file"
        fi
    done
    
    # 添加总体状态
    echo "" >> "$summary_file"
    echo "Configuration:" >> "$summary_file"
    echo "  Scan Path: $scan_path" >> "$summary_file"
    echo "  Module Filter: $([ -n "$module_name" ] && echo "$module_name" || echo "All modules")" >> "$summary_file"
    echo "  Severity Level: $severity_level" >> "$summary_file"
    echo "  Strict Mode: $strict_mode" >> "$summary_file"
    
    log_message "INFO" "Summary report generated: $summary_file"
}

# 显示扫描结果
display_results() {
    local report_format="${1:-simple}"
    
    if [ "$report_format" = "json" ] && [ -f "$SUMMARY_REPORT_FILE" ]; then
        cat "$SUMMARY_REPORT_FILE"
    elif [ -f "${SCAN_REPORT_DIR}/scan-summary.txt" ]; then
        cat "${SCAN_REPORT_DIR}/scan-summary.txt"
    else
        echo "Scan completed. Check ${SCAN_REPORT_DIR}/ for detailed results."
    fi
}

# 主扫描函数
run_scan() {
    local scan_path="$1"
    local check_types="$2"
    local module_name="$3"
    local severity_level="$4"
    local strict_mode="$5"
    local parallel_mode="$6"
    local fail_fast="$7"
    
    log_message "INFO" "Starting project scan in $scan_path"
    log_message "INFO" "Check types: $check_types"
    log_message "INFO" "Module filter: $([ -n "$module_name" ] && echo "$module_name" || echo "All modules")"
    
    # 初始化报告
    initialize_scan_report "custom" "$scan_path"
    
    local overall_exit_code=0
    local failed_checks=()
    
    # 转换检查类型为数组
    IFS=',' read -ra types_array <<< "$check_types"
    
    # 运行各类型的检测
    for check_type in "${types_array[@]}"; do
        check_type=$(echo "$check_type" | xargs) # 去除前后空格
        
        local exit_code=0
        
        case "$check_type" in
            "mock")
                run_mock_detection "$scan_path" "$module_name" "$severity_level"
                exit_code=$?
                ;;
            "hardcode")
                run_hardcode_detection "$scan_path" "$module_name" "$severity_level"
                exit_code=$?
                ;;
            "api")
                run_api_validation "$scan_path" "$module_name" "$strict_mode"
                exit_code=$?
                ;;
            "structure")
                run_module_structure_validation "$scan_path" "$module_name" "$strict_mode"
                exit_code=$?
                ;;
            *)
                log_message "WARNING" "Unknown check type: $check_type"
                continue
                ;;
        esac
        
        if [ $exit_code -eq 1 ]; then
            failed_checks+=("$check_type")
            overall_exit_code=1
            
            if [ "$fail_fast" = "true" ]; then
                log_message "CRITICAL" "Fail-fast enabled, stopping scan"
                break
            fi
        elif [ $exit_code -eq 2 ]; then
            log_message "ERROR" "Script error in $check_type detection"
            overall_exit_code=2
            break
        fi
    done
    
    # 生成报告
    generate_summary_report "simple"
    
    # 显示结果
    display_results "simple"
    
    if [ ${#failed_checks[@]} -gt 0 ]; then
        log_message "CRITICAL" "Failed checks: ${failed_checks[*]}"
    fi
    
    return $overall_exit_code
}

# 主函数
main() {
    local scan_path="$PROJECT_ROOT"
    local check_types="mock,hardcode,api,structure"
    local module_name=""
    local severity_level="INFO"
    local report_format="simple"
    local strict_mode="false"
    local fail_fast="false"
    local parallel_mode="false"
    local custom_output=""
    local scan_mode="custom"
    
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
            --check)
                check_types="$2"
                scan_mode="custom"
                shift 2
                ;;
            --module)
                module_name="$2"
                shift 2
                ;;
            --severity)
                severity_level="$2"
                shift 2
                ;;
            --report)
                report_format="$2"
                shift 2
                ;;
            --output)
                custom_output="$2"
                shift 2
                ;;
            --strict)
                strict_mode="true"
                shift
                ;;
            --fail-fast)
                fail_fast="true"
                shift
                ;;
            --parallel)
                parallel_mode="true"
                shift
                ;;
            --full-scan)
                check_types="mock,hardcode,api,structure"
                severity_level="INFO"
                scan_mode="full"
                shift
                ;;
            --quick-scan)
                check_types="mock,hardcode,api"
                severity_level="CRITICAL"
                scan_mode="quick"
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
    
    # 验证参数
    if [ ! -d "$scan_path" ]; then
        log_message "ERROR" "Scan path does not exist: $scan_path"
        exit 2
    fi
    
    # 验证严重级别
    if [[ "$severity_level" != "DEBUG" && "$severity_level" != "INFO" && "$severity_level" != "WARNING" && "$severity_level" != "CRITICAL" ]]; then
        log_message "ERROR" "Invalid severity level: $severity_level"
        exit 2
    fi
    
    # 检查脚本可用性
    check_script_availability
    
    # 运行扫描
    if run_scan "$scan_path" "$check_types" "$module_name" "$severity_level" "$strict_mode" "$parallel_mode" "$fail_fast"; then
        log_message "INFO" "Project scan completed successfully"
        exit 0
    else
        log_message "CRITICAL" "Project scan completed with violations"
        exit 1
    fi
}

# 执行主函数
main "$@"
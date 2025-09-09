#!/bin/bash

# 扫描报告生成器
# 从各个扫描结果生成详细的综合报告

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/report-generator.log"
TEMPLATES_DIR="${PROJECT_ROOT}/.claude/templates"

# 模板文件
HTML_TEMPLATE="${TEMPLATES_DIR}/report-template.html"
MARKDOWN_TEMPLATE="${TEMPLATES_DIR}/report-template.md"
JSON_TEMPLATE="${TEMPLATES_DIR}/report-template.json"

# 创建必要的目录
mkdir -p "$SCAN_REPORT_DIR"
mkdir -p "$TEMPLATES_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log_message() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# 显示使用说明
show_usage() {
    echo "Scan Report Generator"
    echo "====================="
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --input <dir>          Input scan results directory (default: .claude/scan-reports)"
    echo "  --output <file>        Output report file"
    echo "  --format <format>      Report format: html, markdown, json (default: html)"
    echo "  --template <file>      Custom template file"
    echo "  --include-raw          Include raw output in report"
    echo "  --include-stats        Include detailed statistics"
    echo "  --include-charts       Include charts/graphs (HTML only)"
    echo "  --sort-by <field>      Sort violations by: severity, type, file (default: severity)"
    echo "  --filter <filter>      Filter violations by severity or type"
    echo "  --help                Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --format html                          # HTML report"
    echo "  $0 --format markdown --output report.md  # Markdown report"
    echo "  $0 --format json --include-raw           # JSON report with raw output"
    echo "  $0 --filter CRITICAL                     # Only critical violations"
    echo ""
    echo "Exit codes:"
    echo "  0 - Report generated successfully"
    echo "  1 - Report generation failed"
    echo "  2 - Configuration error"
}

# 初始化模板文件
init_templates() {
    # HTML模板
    cat > "$HTML_TEMPLATE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Scan Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #007acc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007acc;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 1.1em;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #007acc;
        }
        .summary-card.critical {
            border-left-color: #dc3545;
        }
        .summary-card.warning {
            border-left-color: #ffc107;
        }
        .summary-card.info {
            border-left-color: #17a2b8;
        }
        .summary-card.passed {
            border-left-color: #28a745;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        .summary-card.critical .number {
            color: #dc3545;
        }
        .summary-card.warning .number {
            color: #ffc107;
        }
        .summary-card.info .number {
            color: #17a2b8;
        }
        .summary-card.passed .number {
            color: #28a745;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #007acc;
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .violation {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        .violation.critical {
            border-left: 4px solid #dc3545;
        }
        .violation.warning {
            border-left: 4px solid #ffc107;
        }
        .violation.info {
            border-left: 4px solid #17a2b8;
        }
        .violation-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
        }
        .violation-content {
            padding: 15px;
        }
        .violation-meta {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge.critical {
            background: #dc3545;
            color: white;
        }
        .badge.warning {
            background: #ffc107;
            color: #333;
        }
        .badge.info {
            background: #17a2b8;
            color: white;
        }
        .raw-output {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart {
            display: inline-block;
            margin: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        .collapsible:hover {
            background: #e9ecef;
        }
        .content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .content.active {
            max-height: 1000px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Project Scan Report</h1>
            <div class="subtitle">
                <div>Generated: {{TIMESTAMP}}</div>
                <div>Project: {{PROJECT_PATH}}</div>
                <div>Scanner Version: {{SCANNER_VERSION}}</div>
            </div>
        </div>

        <div class="summary">
            {{SUMMARY_CARDS}}
        </div>

        <div class="section">
            <h2>Executive Summary</h2>
            <div class="executive-summary">
                {{EXECUTIVE_SUMMARY}}
            </div>
        </div>

        <div class="section">
            <h2>Scan Results</h2>
            {{SCAN_RESULTS}}
        </div>

        {{CHARTS_SECTION}}

        {{RAW_OUTPUT_SECTION}}

        <div class="footer">
            <p>Generated by Project Scanner v{{SCANNER_VERSION}} on {{TIMESTAMP}}</p>
        </div>
    </div>

    <script>
        // Collapsible functionality
        document.querySelectorAll('.collapsible').forEach(item => {
            item.addEventListener('click', () => {
                const content = item.nextElementSibling;
                content.classList.toggle('active');
            });
        });
    </script>
</body>
</html>
EOF

    # Markdown模板
    cat > "$MARKDOWN_TEMPLATE" << 'EOF'
# Project Scan Report

**Generated:** {{TIMESTAMP}}  
**Project:** {{PROJECT_PATH}}  
**Scanner Version:** {{SCANNER_VERSION}}

## Executive Summary

{{EXECUTIVE_SUMMARY}}

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Files Scanned | {{TOTAL_FILES_SCANNED}} |
| Total Violations | {{TOTAL_VIOLATIONS}} |
| Critical Violations | {{CRITICAL_VIOLATIONS}} |
| Warning Violations | {{WARNING_VIOLATIONS}} |
| Info Violations | {{INFO_VIOLATIONS}} |
| Overall Status | {{OVERALL_STATUS}} |

## Scan Results

{{SCAN_RESULTS}}

{{RAW_OUTPUT_SECTION}}

---
*Generated by Project Scanner v{{SCANNER_VERSION}}*
EOF

    # JSON模板
    cat > "$JSON_TEMPLATE" << 'EOF'
{
  "report_info": {
    "timestamp": "{{TIMESTAMP}}",
    "project_path": "{{PROJECT_PATH}}",
    "scanner_version": "{{SCANNER_VERSION}}",
    "report_format": "json"
  },
  "summary": {
    "total_files_scanned": {{TOTAL_FILES_SCANNED}},
    "total_violations": {{TOTAL_VIOLATIONS}},
    "critical_violations": {{CRITICAL_VIOLATIONS}},
    "warning_violations": {{WARNING_VIOLATIONS}},
    "info_violations": {{INFO_VIOLATIONS}},
    "overall_status": "{{OVERALL_STATUS}}"
  },
  "executive_summary": "{{EXECUTIVE_SUMMARY}}",
  "scan_results": {{SCAN_RESULTS_JSON}},
  "raw_output": {{RAW_OUTPUT_JSON}}
}
EOF

    log_message "INFO" "Templates initialized in $TEMPLATES_DIR"
}

# 收集扫描结果文件
collect_scan_results() {
    local input_dir="$1"
    
    local result_files=()
    
    # 查找所有结果文件
    for file in "$input_dir"/*-result.json; do
        if [ -f "$file" ]; then
            result_files+=("$file")
        fi
    done
    
    printf '%s\n' "${result_files[@]}"
}

# 解析扫描结果
parse_scan_results() {
    local result_files=("$@")
    
    local all_violations=()
    local total_violations=0
    local critical_violations=0
    local warning_violations=0
    local info_violations=0
    local total_files_scanned=0
    
    for result_file in "${result_files[@]}"; do
        if [ ! -f "$result_file" ]; then
            continue
        fi
        
        local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
        
        # 检查jq是否可用
        if command -v jq &> /dev/null; then
            local violations_count=$(jq '.violations_count' "$result_file")
            local violations=$(jq -r '.violations[]' "$result_file")
            
            total_violations=$((total_violations + violations_count))
            
            # 解析违规记录
            while IFS= read -r violation; do
                if [ -n "$violation" ]; then
                    # 确定严重程度
                    local severity="INFO"
                    if [[ "$violation" =~ [Cc][Rr][Ii][Tt][Ii][Cc][Aa][Ll] ]]; then
                        severity="CRITICAL"
                        critical_violations=$((critical_violations + 1))
                    elif [[ "$violation" =~ [Ww][Aa][Rr][Nn][Ii][Nn][Gg] ]]; then
                        severity="WARNING"
                        warning_violations=$((warning_violations + 1))
                    else
                        info_violations=$((info_violations + 1))
                    fi
                    
                    all_violations+=("$scan_type|$severity|$violation")
                fi
            done <<< "$(jq -r '.violations[]?' "$result_file")"
        else
            # 如果没有jq，使用简单的文本解析
            local violations_count=$(grep -c '"violations_count":' "$result_file" | cut -d':' -f2 | tr -d ' ,')
            total_violations=$((total_violations + violations_count))
        fi
    done
    
    # 返回结果
    echo "$total_violations|$critical_violations|$warning_violations|$info_violations|${#all_violations[@]}"
}

# 生成HTML报告
generate_html_report() {
    local output_file="$1"
    local scan_data="$2"
    local include_raw="$3"
    local include_charts="$4"
    
    # 解析数据
    IFS='|' read -r total_violations critical_violations warning_violations info_violations violations_count <<< "$scan_data"
    
    # 生成摘要卡片
    local summary_cards=""
    summary_cards+="<div class=\"summary-card critical\"><h3>Critical</h3><div class=\"number\">$critical_violations</div></div>"
    summary_cards+="<div class=\"summary-card warning\"><h3>Warning</h3><div class=\"number\">$warning_violations</div></div>"
    summary_cards+="<div class=\"summary-card info\"><h3>Info</h3><div class=\"number\">$info_violations</div></div>"
    
    local overall_status="Passed"
    local status_class="passed"
    if [ $total_violations -gt 0 ]; then
        overall_status="Failed"
        status_class="critical"
    fi
    summary_cards+="<div class=\"summary-card $status_class\"><h3>Total</h3><div class=\"number\">$total_violations</div><div>Status: $overall_status</div></div>"
    
    # 生成执行摘要
    local executive_summary=""
    if [ $total_violations -eq 0 ]; then
        executive_summary="<p>✅ <strong>Excellent!</strong> No violations found in the project scan. All quality checks passed successfully.</p>"
    elif [ $critical_violations -gt 0 ]; then
        executive_summary="<p>⚠️ <strong>Attention Required!</strong> Found $critical_violations critical violations that need immediate attention. Please review and fix these issues as soon as possible.</p>"
    elif [ $warning_violations -gt 0 ]; then
        executive_summary="<p>⚠️ <strong>Improvements Needed.</strong> Found $warning_violations warning(s) that should be addressed to improve code quality.</p>"
    else
        executive_summary="<p>ℹ️ <strong>Minor Issues.</strong> Found $info_violations information item(s) that may need attention for optimal code quality.</p>"
    fi
    
    # 生成扫描结果
    local scan_results=""
    local result_files=($(collect_scan_results "$SCAN_REPORT_DIR"))
    
    for result_file in "${result_files[@]}"; do
        if [ ! -f "$result_file" ]; then
            continue
        fi
        
        local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
        local type_name="${scan_type//_/ }"
        type_name=$(echo "$type_name" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2)}1')
        
        scan_results+="<div class=\"violation-section\">"
        scan_results+="<h3>$type_name</h3>"
        
        if command -v jq &> /dev/null; then
            local violations=$(jq -r '.violations[]?' "$result_file")
            
            if [ -n "$violations" ]; then
                while IFS= read -r violation; do
                    if [ -n "$violation" ]; then
                        local violation_class="info"
                        local badge_class="info"
                        local severity="Info"
                        
                        if [[ "$violation" =~ [Cc][Rr][Ii][Tt][Ii][Cc][Aa][Ll] ]]; then
                            violation_class="critical"
                            badge_class="critical"
                            severity="Critical"
                        elif [[ "$violation" =~ [Ww][Aa][Rr][Nn][Ii][Nn][Gg] ]]; then
                            violation_class="warning"
                            badge_class="warning"
                            severity="Warning"
                        fi
                        
                        scan_results+="<div class=\"violation $violation_class\">"
                        scan_results+="<div class=\"violation-header collapsible\">"
                        scan_results+="<span class=\"badge $badge_class\">$severity</span> $violation"
                        scan_results+="</div>"
                        scan_results+="<div class=\"content\">"
                        scan_results+="<div class=\"violation-meta\">Type: $type_name</div>"
                        scan_results+="</div>"
                        scan_results+="</div>"
                    fi
                done <<< "$violations"
            else
                scan_results+="<p>No violations found.</p>"
            fi
        fi
        
        scan_results+="</div>"
    done
    
    # 生成原始输出部分
    local raw_output_section=""
    if [ "$include_raw" = "true" ]; then
        raw_output_section="<div class=\"section\"><h2>Raw Output</h2>"
        
        for result_file in "${result_files[@]}"; do
            if [ -f "$result_file" ]; then
                local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
                local type_name="${scan_type//_/ }"
                type_name="${type_name^}"
                
                raw_output_section+="<h3>$type_name Raw Output</h3>"
                
                if command -v jq &> /dev/null; then
                    local raw_output=$(jq -r '.raw_output[]?' "$result_file")
                    raw_output_section+="<div class=\"raw-output\">$raw_output</div>"
                fi
            fi
        done
        
        raw_output_section+="</div>"
    fi
    
    # 生成图表部分
    local charts_section=""
    if [ "$include_charts" = "true" ]; then
        charts_section="<div class=\"section\"><h2>Statistics</h2>"
        charts_section+="<div class=\"chart-container\">"
        # 简单的文本图表 (可以扩展为真正的图表)
        charts_section+="<div class=\"chart\">"
        charts_section+="<h4>Violation Distribution</h4>"
        charts_section+="<p>Critical: $critical_violations<br>Warning: $warning_violations<br>Info: $info_violations</p>"
        charts_section+="</div>"
        charts_section+="</div>"
        charts_section+="</div>"
    fi
    
    # 读取模板并替换占位符
    if [ -f "$HTML_TEMPLATE" ]; then
        sed -e "s/{{TIMESTAMP}}/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" \
            -e "s/{{PROJECT_PATH}}/$(echo "$PROJECT_ROOT" | sed 's/\//\\\//g')/g" \
            -e "s/{{SCANNER_VERSION}}/1.0.0/g" \
            -e "s/{{SUMMARY_CARDS}}/$(echo "$summary_cards" | sed 's/\//\\\//g')/g" \
            -e "s/{{EXECUTIVE_SUMMARY}}/$(echo "$executive_summary" | sed 's/\//\\\//g')/g" \
            -e "s/{{SCAN_RESULTS}}/$(echo "$scan_results" | sed 's/\//\\\//g')/g" \
            -e "s/{{RAW_OUTPUT_SECTION}}/$(echo "$raw_output_section" | sed 's/\//\\\//g')/g" \
            -e "s/{{CHARTS_SECTION}}/$(echo "$charts_section" | sed 's/\//\\\//g')/g" \
            "$HTML_TEMPLATE" > "$output_file"
    else
        log_message "ERROR" "HTML template not found"
        return 1
    fi
    
    log_message "INFO" "HTML report generated: $output_file"
}

# 生成Markdown报告
generate_markdown_report() {
    local output_file="$1"
    local scan_data="$2"
    local include_raw="$3"
    
    # 解析数据
    IFS='|' read -r total_violations critical_violations warning_violations info_violations violations_count <<< "$scan_data"
    
    # 确定状态
    local overall_status="Passed"
    if [ $total_violations -gt 0 ]; then
        overall_status="Failed"
    fi
    
    # 生成执行摘要
    local executive_summary=""
    if [ $total_violations -eq 0 ]; then
        executive_summary="✅ **Excellent!** No violations found in the project scan. All quality checks passed successfully."
    elif [ $critical_violations -gt 0 ]; then
        executive_summary="⚠️ **Attention Required!** Found $critical_violations critical violations that need immediate attention. Please review and fix these issues as soon as possible."
    elif [ $warning_violations -gt 0 ]; then
        executive_summary="⚠️ **Improvements Needed.** Found $warning_violations warning(s) that should be addressed to improve code quality."
    else
        executive_summary="ℹ️ **Minor Issues.** Found $info_violations information item(s) that may need attention for optimal code quality."
    fi
    
    # 生成扫描结果
    local scan_results=""
    local result_files=($(collect_scan_results "$SCAN_REPORT_DIR"))
    
    for result_file in "${result_files[@]}"; do
        if [ ! -f "$result_file" ]; then
            continue
        fi
        
        local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
        local type_name="${scan_type//_/ }"
        type_name=$(echo "$type_name" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2)}1')
        
        scan_results+="### $type_name\n\n"
        
        if command -v jq &> /dev/null; then
            local violations=$(jq -r '.violations[]?' "$result_file")
            
            if [ -n "$violations" ]; then
                while IFS= read -r violation; do
                    if [ -n "$violation" ]; then
                        scan_results+="- $violation\n"
                    fi
                done <<< "$violations"
            else
                scan_results+="No violations found.\n\n"
            fi
        fi
    done
    
    # 生成原始输出部分
    local raw_output_section=""
    if [ "$include_raw" = "true" ]; then
        raw_output_section="## Raw Output\n\n"
        
        for result_file in "${result_files[@]}"; do
            if [ -f "$result_file" ]; then
                local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
                local type_name="${scan_type//_/ }"
                type_name="${type_name^}"
                
                raw_output_section+="### $type_name Raw Output\n\n"
                raw_output_section+="\`\`\`\n"
                
                if command -v jq &> /dev/null; then
                    local raw_output=$(jq -r '.raw_output[]?' "$result_file")
                    raw_output_section+="$raw_output\n"
                fi
                
                raw_output_section+="\`\`\`\n\n"
            fi
        done
    fi
    
    # 读取模板并替换占位符
    if [ -f "$MARKDOWN_TEMPLATE" ]; then
        sed -e "s/{{TIMESTAMP}}/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" \
            -e "s/{{PROJECT_PATH}}/$(echo "$PROJECT_ROOT" | sed 's/\//\\\//g')/g" \
            -e "s/{{SCANNER_VERSION}}/1.0.0/g" \
            -e "s/{{EXECUTIVE_SUMMARY}}/$(echo "$executive_summary" | sed 's/\//\\\//g')/g" \
            -e "s/{{TOTAL_FILES_SCANNED}}/${violations_count:-0}/g" \
            -e "s/{{TOTAL_VIOLATIONS}}/$total_violations/g" \
            -e "s/{{CRITICAL_VIOLATIONS}}/$critical_violations/g" \
            -e "s/{{WARNING_VIOLATIONS}}/$warning_violations/g" \
            -e "s/{{INFO_VIOLATIONS}}/$info_violations/g" \
            -e "s/{{OVERALL_STATUS}}/$overall_status/g" \
            -e "s/{{SCAN_RESULTS}}/$(echo "$scan_results" | sed 's/\//\\\//g')/g" \
            -e "s/{{RAW_OUTPUT_SECTION}}/$(echo "$raw_output_section" | sed 's/\//\\\//g')/g" \
            "$MARKDOWN_TEMPLATE" > "$output_file"
    else
        log_message "ERROR" "Markdown template not found"
        return 1
    fi
    
    log_message "INFO" "Markdown report generated: $output_file"
}

# 生成JSON报告
generate_json_report() {
    local output_file="$1"
    local scan_data="$2"
    local include_raw="$3"
    
    # 解析数据
    IFS='|' read -r total_violations critical_violations warning_violations info_violations violations_count <<< "$scan_data"
    
    # 确定状态
    local overall_status="Passed"
    if [ $total_violations -gt 0 ]; then
        overall_status="Failed"
    fi
    
    # 生成执行摘要
    local executive_summary=""
    if [ $total_violations -eq 0 ]; then
        executive_summary="Excellent! No violations found in the project scan. All quality checks passed successfully."
    elif [ $critical_violations -gt 0 ]; then
        executive_summary="Attention Required! Found $critical_violations critical violations that need immediate attention. Please review and fix these issues as soon as possible."
    elif [ $warning_violations -gt 0 ]; then
        executive_summary="Improvements Needed. Found $warning_violations warning(s) that should be addressed to improve code quality."
    else
        executive_summary="Minor Issues. Found $info_violations information item(s) that may need attention for optimal code quality."
    fi
    
    # 收集扫描结果
    local scan_results_json="[]"
    local result_files=($(collect_scan_results "$SCAN_REPORT_DIR"))
    
    if command -v jq &> /dev/null; then
        local temp_results=$(mktemp)
        
        for result_file in "${result_files[@]}"; do
            if [ -f "$result_file" ]; then
                local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
                jq --arg scan_type "$scan_type" \
                   '. + [{"scan_type": $scan_type, "violations": .violations}]' \
                   "$result_file" >> "$temp_results"
            fi
        done
        
        if [ -f "$temp_results" ]; then
            scan_results_json=$(jq -s '.[0].violations' "$temp_results" 2>/dev/null || echo "[]")
            rm -f "$temp_results"
        fi
    fi
    
    # 收集原始输出
    local raw_output_json="[]"
    if [ "$include_raw" = "true" ] && command -v jq &> /dev/null; then
        local temp_raw=$(mktemp)
        
        for result_file in "${result_files[@]}"; do
            if [ -f "$result_file" ]; then
                local scan_type=$(basename "$result_file" | sed 's/-result.json$//')
                jq --arg scan_type "$scan_type" \
                   '. + [{"scan_type": $scan_type, "raw_output": .raw_output}]' \
                   "$result_file" >> "$temp_raw"
            fi
        done
        
        if [ -f "$temp_raw" ]; then
            raw_output_json=$(jq -s '.[0].raw_output' "$temp_raw" 2>/dev/null || echo "[]")
            rm -f "$temp_raw"
        fi
    fi
    
    # 读取模板并替换占位符
    if [ -f "$JSON_TEMPLATE" ]; then
        sed -e "s/{{TIMESTAMP}}/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" \
            -e "s/{{PROJECT_PATH}}/$(echo "$PROJECT_ROOT" | sed 's/\//\\\//g')/g" \
            -e "s/{{SCANNER_VERSION}}/1.0.0/g" \
            -e "s/{{EXECUTIVE_SUMMARY}}/$(echo "$executive_summary" | sed 's/\//\\\//g')/g" \
            -e "s/{{TOTAL_FILES_SCANNED}}/${violations_count:-0}/g" \
            -e "s/{{TOTAL_VIOLATIONS}}/$total_violations/g" \
            -e "s/{{CRITICAL_VIOLATIONS}}/$critical_violations/g" \
            -e "s/{{WARNING_VIOLATIONS}}/$warning_violations/g" \
            -e "s/{{INFO_VIOLATIONS}}/$info_violations/g" \
            -e "s/{{OVERALL_STATUS}}/$overall_status/g" \
            -e "s/{{SCAN_RESULTS_JSON}}/$scan_results_json/g" \
            -e "s/{{RAW_OUTPUT_JSON}}/$raw_output_json/g" \
            "$JSON_TEMPLATE" > "$output_file"
    else
        log_message "ERROR" "JSON template not found"
        return 1
    fi
    
    log_message "INFO" "JSON report generated: $output_file"
}

# 主函数
main() {
    local input_dir="$SCAN_REPORT_DIR"
    local output_file=""
    local report_format="html"
    local custom_template=""
    local include_raw="false"
    local include_stats="false"
    local include_charts="false"
    local sort_by="severity"
    local filter=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --input)
                input_dir="$2"
                shift 2
                ;;
            --output)
                output_file="$2"
                shift 2
                ;;
            --format)
                report_format="$2"
                shift 2
                ;;
            --template)
                custom_template="$2"
                shift 2
                ;;
            --include-raw)
                include_raw="true"
                shift
                ;;
            --include-stats)
                include_stats="true"
                shift
                ;;
            --include-charts)
                include_charts="true"
                shift
                ;;
            --sort-by)
                sort_by="$2"
                shift 2
                ;;
            --filter)
                filter="$2"
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
    
    # 验证输入目录
    if [ ! -d "$input_dir" ]; then
        log_message "ERROR" "Input directory does not exist: $input_dir"
        exit 2
    fi
    
    # 验证格式
    case "$report_format" in
        "html"|"markdown"|"json")
            # 有效格式
            ;;
        *)
            log_message "ERROR" "Invalid format: $report_format"
            exit 2
            ;;
    esac
    
    # 设置默认输出文件
    if [ -z "$output_file" ]; then
        output_file="${input_dir}/scan-report.${report_format}"
        # 转换markdown为md
        if [ "$report_format" = "markdown" ]; then
            output_file="${input_dir}/scan-report.md"
        fi
    fi
    
    # 初始化模板
    if [ ! -f "$HTML_TEMPLATE" ] || [ ! -f "$MARKDOWN_TEMPLATE" ] || [ ! -f "$JSON_TEMPLATE" ]; then
        init_templates
    fi
    
    # 收集结果文件
    local result_files=($(collect_scan_results "$input_dir"))
    
    if [ ${#result_files[@]} -eq 0 ]; then
        log_message "ERROR" "No scan result files found in $input_dir"
        exit 1
    fi
    
    # 解析扫描结果
    local scan_data
    scan_data=$(parse_scan_results "${result_files[@]}")
    
    # 生成报告
    case "$report_format" in
        "html")
            generate_html_report "$output_file" "$scan_data" "$include_raw" "$include_charts"
            ;;
        "markdown")
            generate_markdown_report "$output_file" "$scan_data" "$include_raw"
            ;;
        "json")
            generate_json_report "$output_file" "$scan_data" "$include_raw"
            ;;
    esac
    
    # 显示成功消息
    echo "✅ Report generated successfully: $output_file"
    
    # 如果是HTML格式，尝试打开它
    if [ "$report_format" = "html" ] && command -v open &> /dev/null; then
        echo "📂 Opening report in browser..."
        open "$output_file"
    elif [ "$report_format" = "html" ] && command -v xdg-open &> /dev/null; then
        echo "📂 Opening report in browser..."
        xdg-open "$output_file"
    fi
}

# 执行主函数
main "$@"
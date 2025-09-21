#!/bin/bash

# README Architecture Parser
# 解析README文件中的架构部分并生成JSON文件允许列表

set -e

# 配置
PROJECT_ROOT="${PWD}"
ARCHITECTURE_JSON="${PROJECT_ROOT}/.claude/file-architecture.json"
LOG_FILE="${PROJECT_ROOT}/.claude/logs/architecture-parser.log"

# 创建必要的目录
mkdir -p "$(dirname "$ARCHITECTURE_JSON")"
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log_message() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# 显示使用说明
show_usage() {
    echo "README Architecture Parser"
    echo "=========================="
    echo "解析README文件中的架构部分并生成JSON文件允许列表"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --readme <path>     README文件路径 (default: ./README.md)"
    echo "  --module <name>     模块名称 (default: 从路径推导)"
    echo "  --output <path>     输出JSON文件路径"
    echo "  --validate          验证现有架构文件"
    echo "  --help              显示此帮助"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --readme sharedmodule/basemodule/README.md"
    echo "  $0 --module basemodule --validate"
}

# 解析树形结构
parse_tree_structure() {
    local readme_path="$1"
    local module_name="$2"

    if [ ! -f "$readme_path" ]; then
        log_message "ERROR" "README文件不存在: $readme_path"
        return 1
    fi

    log_message "INFO" "解析README架构: $readme_path"

    # 查找架构部分
    local architecture_section=""
    local in_section=false
    local in_code_block=false
    local indent_level=""

    while IFS= read -r line; do
        # 检测架构部分开始
        if [[ "$line" =~ ^##\ 📁\ .*Architecture\ \&\ Purpose$ ]] || [[ "$line" =~ ^##\ 📁\ Module\ Structure\ \&\ File\ Purpose$ ]]; then
            in_section=true
            continue
        fi

        # 检测架构部分结束
        if [ "$in_section" = true ] && [[ "$line" =~ ^##\  ]]; then
            break
        fi

        # 检测代码块开始/结束
        if [[ "$line" =~ ^\`\`\`$ ]]; then
            if [ "$in_code_block" = false ]; then
                in_code_block=true
                continue
            else
                in_code_block=false
                break
            fi
        fi

        # 收集架构内容
        if [ "$in_section" = true ] && [ "$in_code_block" = true ]; then
            architecture_section+="$line"$'\n'
        fi
    done < "$readme_path"

    if [ -z "$architecture_section" ]; then
        log_message "WARNING" "未找到架构部分"
        return 1
    fi

    # 解析架构
    parse_tree_lines "$architecture_section" "$module_name"
}

# 解析树形行
parse_tree_lines() {
    local content="$1"
    local module_name="$2"
    local current_path=""
    local json_output="{"

    json_output+="\"module\": \"$module_name\","
    json_output+="\"sourceReadme\": \"$1\","
    json_output+="\"lastUpdated\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    json_output+="\"structure\": {"

    local first_entry=true
    local path_stack=()
    local stack_index=0

    while IFS= read -r line; do
        # 跳过空行和模块根目录行
        if [[ -z "$line" ]] || [[ "$line" =~ ^module-root/ ]]; then
            continue
        fi

        # 解析缩进级别
        local indent=$(echo "$line" | sed 's/[^ \t].*//' | wc -c)
        local clean_line=$(echo "$line" | sed 's/^[ \t]*//')

        # 跳过注释行和分隔线
        if [[ "$clean_line" =~ ^# ]] || [[ "$clean_line" =~ ^┌ ]] || [[ "$clean_line" =~ ^├ ]] || [[ "$clean_line" =~ ^└ ]] || [[ "$clean_line" =~ ^│ ]]; then
            continue
        fi

        # 解析路径和描述
        if [[ "$clean_line" =~ ^([a-zA-Z0-9_\-/.]+)[[:space:]]*#(.*)$ ]]; then
            local path="${BASH_REMATCH[1]}"
            local description="${BASH_REMATCH[2]}"

            # 清理路径和描述
            path=$(echo "$path" | sed 's/[ \t]*$//')
            description=$(echo "$description" | sed 's/^[ \t]*//;s/[ \t]*$//')

            # 确定文件类型
            local file_type="file"
            if [[ "$path" == */ ]]; then
                file_type="directory"
            fi

            # 构建JSON路径
            local json_path="\"$path\": {"
            json_path+="\"type\": \"$file_type\","
            json_path+="\"purpose\": \"$(extract_purpose "$description")\","
            json_path+="\"description\": \"$description\","

            # 提取额外信息
            local lines=$(extract_lines "$description")
            local category=$(determine_category "$path")
            local required=$(extract_required "$description")
            local generated=$(extract_generated "$description")

            json_path+="\"category\": \"$category\","
            if [ -n "$lines" ]; then
                json_path+="\"lines\": $lines,"
            fi
            if [ "$required" = "true" ]; then
                json_path+="\"required\": true,"
            fi
            if [ "$generated" = "true" ]; then
                json_path+="\"generated\": true,"
            fi

            # 关闭当前对象
            json_path+="\"allowed\": true"
            json_path+="}"

            # 处理嵌套结构
            if [ $indent -gt 0 ]; then
                # 计算层级
                local level=$((indent / 2))

                # 调整栈
                while [ $stack_index -gt $level ]; do
                    json_output+="},"
                    ((stack_index--))
                done

                # 添加到当前层级
                if [ $stack_index -eq $level ]; then
                    json_output+="},"
                fi

                json_output+="$json_path,"
                path_stack[$stack_index]="$path"
                ((stack_index++))
            else
                # 根级别
                if [ "$first_entry" = false ]; then
                    json_output+=","
                fi
                json_output+="$json_path"
                first_entry=false
                stack_index=0
            fi
        fi
    done <<< "$content"

    # 关闭所有嵌套对象
    while [ $stack_index -gt 0 ]; do
        json_output+="}"
        ((stack_index--))
    done

    json_output+="}}"

    # 输出JSON
    echo "$json_output"
}

# 提取目的描述
extract_purpose() {
    local description="$1"
    # 移除行数和特殊标记
    echo "$description" | sed 's/([0-9]\+ lines\?)$//' | sed 's/\[REQUIRED\]//' | sed 's/\[GENERATED\]//' | sed 's/^[ \t]*//;s/[ \t]*$//'
}

# 提取行数
extract_lines() {
    local description="$1"
    if [[ "$description" =~ \(([0-9]+)\) ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

# 确定文件分类
determine_category() {
    local path="$1"

    case "$path" in
        *.ts|*.js|*.tsx|*.jsx)
            echo "source"
            ;;
        *.json|*.yaml|*.yml|*.toml|*.env|*.config.*)
            echo "config"
            ;;
        *.test.*|*.spec.*|__tests__/*)
            echo "test"
            ;;
        *.md|*.txt|*.html|*.rst)
            echo "docs"
            ;;
        dist/*|build/*|*.d.ts|*.min.*)
            echo "build"
            ;;
        *images/*|*styles/*|*fonts/*|*.css|*.scss|*.png|*.jpg|*.jpeg|*.gif|*.svg)
            echo "assets"
            ;;
        *.sh|*.py|*.ps1|*.bat)
            echo "scripts"
            ;;
        *)
            echo "data"
            ;;
    esac
}

# 提取必需标记
extract_required() {
    local description="$1"
    if [[ "$description" =~ \[REQUIRED\] ]]; then
        echo "true"
    fi
}

# 提取生成标记
extract_generated() {
    local description="$1"
    if [[ "$description" =~ \[GENERATED\] ]]; then
        echo "true"
    fi
}

# 验证架构文件
validate_architecture() {
    local architecture_file="$1"

    if [ ! -f "$architecture_file" ]; then
        log_message "ERROR" "架构文件不存在: $architecture_file"
        return 1
    fi

    log_message "INFO" "验证架构文件: $architecture_file"

    # 验证JSON格式
    if ! command -v jq &> /dev/null; then
        log_message "WARNING" "jq未安装，跳过JSON格式验证"
        return 0
    fi

    if ! jq empty "$architecture_file" 2>/dev/null; then
        log_message "ERROR" "JSON格式无效"
        return 1
    fi

    log_message "INFO" "架构文件验证通过"
    return 0
}

# 主函数
main() {
    local readme_path="./README.md"
    local module_name=""
    local output_path="$ARCHITECTURE_JSON"
    local validate_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --readme)
                readme_path="$2"
                shift 2
                ;;
            --module)
                module_name="$2"
                shift 2
                ;;
            --output)
                output_path="$2"
                shift 2
                ;;
            --validate)
                validate_only=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            -*)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                echo "Unknown argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # 推导模块名称
    if [ -z "$module_name" ]; then
        if [[ "$readme_path" =~ sharedmodule/([^/]+)/ ]]; then
            module_name="${BASH_REMATCH[1]}"
        else
            module_name="root"
        fi
    fi

    # 验证模式
    if [ "$validate_only" = true ]; then
        validate_architecture "$output_path"
        exit $?
    fi

    log_message "INFO" "开始解析README架构"
    log_message "INFO" "README文件: $readme_path"
    log_message "INFO" "模块名称: $module_name"
    log_message "INFO" "输出文件: $output_path"

    # 解析架构
    local architecture_json
    architecture_json=$(parse_tree_structure "$readme_path" "$module_name")

    if [ $? -ne 0 ]; then
        log_message "ERROR" "解析失败"
        exit 1
    fi

    # 对于模块README，输出到正确的模块架构目录
    if [[ "$output_path" == *".claude/file-architecture.json" ]]; then
        # 检查是否是模块README，如果是则重定向输出路径
        local current_dir=$(pwd)
        if [[ "$current_dir" == *sharedmodule/* ]]; then
            local module_name=$(basename "$current_dir")
            local module_output_path=".claude/modules/$module_name/file-architecture.json"

            # 创建模块架构目录
            mkdir -p "$(dirname "$module_output_path")"

            # 更新JSON中的module字段
            architecture_json=$(echo "$architecture_json" | sed "s/\"module\": \"[^\"]*\"/\"module\": \"$module_name\"/")

            # 输出到模块架构文件
            echo "$architecture_json" > "$module_output_path"

            log_message "INFO" "模块架构解析完成"
            log_message "INFO" "模块架构文件: $module_output_path"
        else
            # 根项目架构文件
            echo "$architecture_json" > "$output_path"
            log_message "INFO" "架构解析完成"
            log_message "INFO" "输出文件: $output_path"
        fi
    else
        # 自定义输出路径
        echo "$architecture_json" > "$output_path"
        log_message "INFO" "架构解析完成"
        log_message "INFO" "输出文件: $output_path"
    fi

    # 显示统计信息
    if command -v jq &> /dev/null; then
        local file_count=$(jq '.structure | keys | length' "$output_path" 2>/dev/null || echo "unknown")
        log_message "INFO" "解析的文件/目录数量: $file_count"
    fi
}

# 执行主函数
main "$@"
#!/bin/bash

# API一致性检测脚本
# 检测模块是否使用最新API规范和实现

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/api-validation.log"
EXCLUDE_FILE="${PROJECT_ROOT}/.claude/scan-exclude.txt"
API_STANDARDS_FILE="${PROJECT_ROOT}/.claude/api-standards.json"

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
    echo "API Validation Script"
    echo "====================="
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>       Scan specific path (default: current directory)"
    echo "  --exclude <file>    Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --standards <file>  API standards file (default: .claude/api-standards.json)"
    echo "  --module <name>     Validate specific module only"
    echo "  --report            Generate detailed report"
    echo "  --strict            Enable strict validation mode"
    echo "  --help              Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - No API violations found"
    echo "  1 - API violations found"
    echo "  2 - Script error"
}

# 初始化默认API标准
init_default_standards() {
    cat > "$API_STANDARDS_FILE" << 'EOF'
{
  "api_standards": {
    "version": "1.0.0",
    "updated": "2024-01-15",
    "base_module_requirements": {
      "required_methods": [
        {
          "name": "initialize",
          "description": "Module initialization method",
          "parameters": ["config"],
          "return_type": "Promise<void>",
          "required": true
        },
        {
          "name": "destroy",
          "description": "Module cleanup method",
          "parameters": [],
          "return_type": "Promise<void>",
          "required": true
        },
        {
          "name": "handshake",
          "description": "Module handshake method",
          "parameters": ["moduleInfo", "connectionInfo"],
          "return_type": "Promise<void>",
          "required": true
        }
      ],
      "required_properties": [
        {
          "name": "getModuleInfo",
          "description": "Module information getter",
          "type": "function",
          "required": true
        },
        {
          "name": "moduleConfig",
          "description": "Module configuration",
          "type": "object",
          "required": true
        }
      ],
      "required_interfaces": [
        {
          "name": "ModuleInfo",
          "description": "Module information interface",
          "properties": ["name", "version", "description", "dependencies"],
          "required": true
        },
        {
          "name": "ConnectionInfo",
          "description": "Connection information interface",
          "properties": ["hostname", "port", "protocol", "path"],
          "required": true
        }
      ]
    },
    "module_structure_standards": {
      "required_files": [
        {
          "path": "README.md",
          "description": "Module documentation",
          "required": true
        },
        {
          "path": "__test__",
          "description": "Test directory",
          "required": true,
          "is_directory": true
        },
        {
          "path": "src",
          "description": "Source directory",
          "required": true,
          "is_directory": true
        }
      ],
      "required_directories": [
        "src",
        "__test__",
        "constants",
        "interfaces",
        "types"
      ]
    },
    "lifecycle_methods": [
      {
        "name": "initialize",
        "phase": "startup",
        "required": true
      },
      {
        "name": "handshake",
        "phase": "connection",
        "required": true
      },
      {
        "name": "destroy",
        "phase": "shutdown",
        "required": true
      }
    ],
    "naming_conventions": {
      "class_names": {
        "pattern": "^[A-Z][a-zA-Z0-9]*$",
        "description": "PascalCase for class names",
        "example": "UserModule"
      },
      "method_names": {
        "pattern": "^[a-z][a-zA-Z0-9]*$",
        "description": "camelCase for method names",
        "example": "initializeModule"
      },
      "interface_names": {
        "pattern": "^[A-Z][a-zA-Z0-9]*$",
        "description": "PascalCase for interface names",
        "example": "ModuleConfig"
      },
      "constant_names": {
        "pattern": "^[A-Z][A-Z0-9_]*$",
        "description": "UPPER_SNAKE_CASE for constants",
        "example": "MAX_CONNECTIONS"
      }
    },
    "export_standards": {
      "default_export": {
        "required": true,
        "description": "Module should have a default export"
      },
      "named_exports": {
        "optional": true,
        "description": "Named exports are optional"
      },
      "type_exports": {
        "required": true,
        "description": "Types and interfaces should be exported"
      }
    }
  }
}
EOF
    log_message "INFO" "Created default API standards file at: $API_STANDARDS_FILE"
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

# 检测API违规
detect_api_violations() {
    local scan_path="${1:-$PROJECT_ROOT}"
    local specific_module="${2:-}"
    local violations_found=0
    local strict_mode="${3:-false}"
    
    log_message "INFO" "Starting API validation scan in $scan_path"
    
    # 检查API标准文件
    if [ ! -f "$API_STANDARDS_FILE" ]; then
        log_message "INFO" "No API standards file found, creating default standards"
        init_default_standards
    fi
    
    # 创建临时文件存储结果
    local temp_results
    temp_results=$(mktemp)
    
    # 查找模块目录 - 改进的模块识别逻辑
    if [ -n "$specific_module" ]; then
        local module_dirs="$scan_path/$specific_module"
    else
        # 改进的模块识别：查找包含 BaseModule 继承的目录或符合模块结构的目录
        local module_dirs=""
        
        # 方法1: 查找有 BaseModule 继承的目录
        local potential_modules=$(find "$scan_path/src" -type f -name "*.ts" -exec grep -l "extends BaseModule" {} \; 2>/dev/null | head -10)
        
        # 提取这些文件的所在目录
        for file in $potential_modules; do
            local dir=$(dirname "$file")
            # 获取模块根目录（找到模块根目录，通常是包含src/的上一层）
            while [[ "$dir" != "$scan_path" && "$dir" != "/" ]]; do
                # 检查是否是模块根目录（包含README.md或特定的模块结构）
                if [ -f "$dir/README.md" ] || [ -d "$dir/src" ] || [ -d "$dir/__test__" ]; then
                    # 确保不是BaseModule本身（BaseModule是基础类，不是模块）
                    if [[ "$dir" != *"BaseModule"* ]]; then
                        module_dirs="$module_dirs$dir"$'\n'
                    fi
                    break
                fi
                # 如果在modules目录下，且父目录有README，则使用父目录
                if [[ "$dir" == *"modules"* ]] && [ -f "$(dirname "$dir")/README.md" ]; then
                    local parent_dir=$(dirname "$dir")
                    if [[ "$parent_dir" != *"BaseModule"* ]]; then
                        module_dirs="$module_dirs$parent_dir"$'\n'
                    fi
                    break
                fi
                dir=$(dirname "$dir")
            done
        done
        
        # 方法2: 查找符合模块结构的标准目录
        local standard_modules=$(find "$scan_path/src/modules" -maxdepth 3 -type d \
            \( -name "Configuration" -o -name "ExampleModule" -o -name "RouterModule" -o -name "Debug" \) \
            2>/dev/null | head -10)
        
        # 添加标准模块（如果还没有被包含）
        for module in $standard_modules; do
            if [[ "$module_dirs" != *"$module"* ]]; then
                module_dirs="$module_dirs$module"$'\n'
            fi
        done
        
        # 去重并过滤掉排除的目录
        module_dirs=$(echo "$module_dirs" | sort | uniq | while read dir; do
            if [ -n "$dir" ] && [ -d "$dir" ]; then
                # 检查是否应该被排除
                local gitignore_parser="${PROJECT_ROOT}/.claude/scripts/gitignore-parser.sh"
                if [ -f "$gitignore_parser" ]; then
                    if ! "$gitignore_parser" check "$dir" 2>/dev/null | grep -q "EXCLUDE"; then
                        echo "$dir"
                    fi
                else
                    # 回退到基本检查
                    local relative_dir="${dir#$scan_path/}"
                    if [[ "$relative_dir" != node_modules/* && "$relative_dir" != dist/* && "$relative_dir" != .git/* ]]; then
                        echo "$dir"
                    fi
                fi
            fi
        done)
    fi
    
    # 检查每个模块
    while IFS= read -r module_dir; do
        if [ -z "$module_dir" ]; then
            continue
        fi
        
        if [ ! -d "$module_dir" ]; then
            continue
        fi
        
        log_message "INFO" "Validating module: $module_dir"
        
        # 验证模块结构
        validate_module_structure "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证BaseModule继承
        validate_base_module_inheritance "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证API方法实现
        validate_api_methods "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证命名约定
        validate_naming_conventions "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证导出标准
        validate_export_standards "$module_dir" "$temp_results" "$strict_mode"
        
    done <<< "$module_dirs"
    
    # 输出结果
    if [ -s "$temp_results" ]; then
        log_message "CRITICAL" "API violations found:"
        while IFS= read -r violation; do
            log_message "CRITICAL" "  $violation"
            echo "$violation"
        done < "$temp_results"
        violations_found=1
    else
        log_message "INFO" "No API violations found in modules"
    fi
    
    # 清理临时文件
    rm -f "$temp_results"
    
    return $violations_found
}

# 验证模块结构
validate_module_structure() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_name=$(basename "$module_dir")
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 检查必需的目录
    if [ ! -d "$module_dir/src" ]; then
        echo "[CRITICAL] $module_relative - Missing src directory" >> "$results_file"
    fi
    
    if [ ! -d "$module_dir/__test__" ]; then
        echo "[WARNING] $module_relative - Missing __test__ directory" >> "$results_file"
    fi
    
    # 检查必需的文件
    if [ ! -f "$module_dir/README.md" ]; then
        echo "[WARNING] $module_relative - Missing README.md" >> "$results_file"
    fi
    
    # 检查源文件
    local main_source_file=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | head -1)
    if [ -z "$main_source_file" ]; then
        echo "[CRITICAL] $module_relative - No source files found in src directory" >> "$results_file"
    fi
    
    # 检查测试文件
    local test_files=$(find "$module_dir/__test__" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null)
    if [ -z "$test_files" ]; then
        echo "[WARNING] $module_relative - No test files found" >> "$results_file"
    fi
}

# 验证BaseModule继承
validate_base_module_inheritance() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 查找TypeScript源文件
    local source_files=$(find "$module_dir/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null)
    
    while IFS= read -r source_file; do
        [ -f "$source_file" ] || continue
        
        # 检查是否导入BaseModule
        if ! grep -q "import.*BaseModule" "$source_file" 2>/dev/null; then
            # 检查是否有类定义
            if grep -q "class.*{" "$source_file" 2>/dev/null; then
                echo "[WARNING] $module_relative - Missing BaseModule import in $(basename "$source_file")" >> "$results_file"
            fi
        fi
        
        # 检查是否继承BaseModule
        if grep -q "class.*extends BaseModule" "$source_file" 2>/dev/null; then
            # 找到继承类，检查是否正确实现
            local class_name=$(grep -o "class \([A-Za-z0-9_]*\) extends BaseModule" "$source_file" | head -1 | sed 's/class \([A-Za-z0-9_]*\) extends BaseModule/\1/')
            
            if [ -n "$class_name" ]; then
                log_message "INFO" "Found BaseModule inheritance: $class_name"
            fi
        elif grep -q "class.*{" "$source_file" 2>/dev/null; then
            # 有类定义但没有继承BaseModule
            echo "[WARNING] $module_relative - Class does not extend BaseModule in $(basename "$source_file")" >> "$results_file"
        fi
        
    done <<< "$source_files"
}

# 验证API方法实现
validate_api_methods() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 查找TypeScript源文件
    local source_files=$(find "$module_dir/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null)
    
    while IFS= read -r source_file; do
        [ -f "$source_file" ] || continue
        
        # 检查必需的方法
        local required_methods=("initialize" "destroy" "handshake")
        
        for method in "${required_methods[@]}"; do
            if ! grep -q "$method\s*(" "$source_file" 2>/dev/null; then
                echo "[CRITICAL] $module_relative - Missing required method: $method in $(basename "$source_file")" >> "$results_file"
            else
                # 检查方法签名
                if [ "$method" = "initialize" ]; then
                    if ! grep -q "initialize\s*(\s*[^)]*config[^)]*" "$source_file" 2>/dev/null; then
                        echo "[WARNING] $module_relative - initialize method should accept config parameter in $(basename "$source_file")" >> "$results_file"
                    fi
                elif [ "$method" = "handshake" ]; then
                    if ! grep -q "handshake\s*(\s*[^)]*moduleInfo[^)]*[^)]*connectionInfo[^)]*" "$source_file" 2>/dev/null; then
                        echo "[WARNING] $module_relative - handshake method should accept moduleInfo and connectionInfo parameters in $(basename "$source_file")" >> "$results_file"
                    fi
                fi
            fi
        done
        
        # 检查getModuleInfo属性
        if ! grep -q "getModuleInfo\s*=" "$source_file" 2>/dev/null; then
            echo "[WARNING] $module_relative - Missing getModuleInfo property in $(basename "$source_file")" >> "$results_file"
        fi
        
        # 检查moduleConfig属性
        if ! grep -q "moduleConfig\s*=" "$source_file" 2>/dev/null; then
            echo "[WARNING] $module_relative - Missing moduleConfig property in $(basename "$source_file")" >> "$results_file"
        fi
        
    done <<< "$source_files"
}

# 验证命名约定
validate_naming_conventions() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 查找TypeScript源文件
    local source_files=$(find "$module_dir/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null)
    
    while IFS= read -r source_file; do
        [ -f "$source_file" ] || continue
        
        # 检查类名（PascalCase）
        local class_names=$(grep -o "class \([A-Za-z0-9_]*\)" "$source_file" | sed 's/class //')
        while IFS= read -r class_name; do
            [ -n "$class_name" ] || continue
            if [[ ! "$class_name" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
                echo "[WARNING] $module_relative - Invalid class name: $class_name (should be PascalCase) in $(basename "$source_file")" >> "$results_file"
            fi
        done <<< "$class_names"
        
        # 检查方法名（camelCase）
        local method_names=$(grep -o "^[[:space:]]*\([a-zA-Z_][a-zA-Z0-9_]*\)\s*(" "$source_file" | sed 's/[[:space:]*(]*//g')
        while IFS= read -r method_name; do
            [ -n "$method_name" ] || continue
            # 排除构造函数
            if [ "$method_name" = "constructor" ]; then
                continue
            fi
            if [[ ! "$method_name" =~ ^[a-z][a-zA-Z0-9]*$ ]]; then
                echo "[INFO] $module_relative - Method name suggestion: $method_name should be camelCase in $(basename "$source_file")" >> "$results_file"
            fi
        done <<< "$method_names"
        
    done <<< "$source_files"
}

# 验证导出标准
validate_export_standards() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 查找主入口文件（通常是index.ts或模块名相关的ts文件）
    local entry_files=$(find "$module_dir/src" -name "index.ts" -o -name "*module.ts" -o -name "*.ts" 2>/dev/null | head -5)
    
    while IFS= read -r entry_file; do
        [ -f "$entry_file" ] || continue
        
        # 检查默认导出
        if ! grep -q "export default" "$entry_file" 2>/dev/null; then
            echo "[WARNING] $module_relative - Missing default export in $(basename "$entry_file")" >> "$results_file"
        fi
        
        # 检查类型导出
        if ! grep -q "export.*interface\|export.*type" "$entry_file" 2>/dev/null; then
            echo "[INFO] $module_relative - Consider exporting interfaces/types in $(basename "$entry_file")" >> "$results_file"
        fi
        
    done <<< "$entry_files"
}

# 主函数
main() {
    local scan_path="$PROJECT_ROOT"
    local specific_module=""
    local generate_report=false
    local strict_mode=false
    local custom_standards=""
    
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
            --standards)
                custom_standards="$2"
                shift 2
                ;;
            --module)
                specific_module="$2"
                shift 2
                ;;
            --report)
                generate_report=true
                shift
                ;;
            --strict)
                strict_mode=true
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
    
    # 使用自定义标准文件
    if [ -n "$custom_standards" ]; then
        if [ -f "$custom_standards" ]; then
            API_STANDARDS_FILE="$custom_standards"
            log_message "INFO" "Using custom API standards file: $custom_standards"
        else
            log_message "ERROR" "Custom API standards file not found: $custom_standards"
            exit 2
        fi
    fi
    
    # 执行扫描
    if detect_api_violations "$scan_path" "$specific_module" "$strict_mode"; then
        log_message "INFO" "API validation completed successfully"
        exit 0
    else
        log_message "CRITICAL" "API violations detected"
        exit 1
    fi
}

# 执行主函数
main "$@"
#!/bin/bash

# 模块目录结构验证脚本
# 检查模块目录是否符合最新标准

set -e

# 配置
PROJECT_ROOT="${PWD}"
SCAN_REPORT_DIR="${PROJECT_ROOT}/.claude/scan-reports"
LOG_FILE="${SCAN_REPORT_DIR}/module-structure-validation.log"
EXCLUDE_FILE="${PROJECT_ROOT}/.claude/scan-exclude.txt"
STRUCTURE_STANDARDS_FILE="${PROJECT_ROOT}/.claude/structure-standards.json"

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
    echo "Module Structure Validation Script"
    echo "================================"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --path <path>       Scan specific path (default: current directory)"
    echo "  --exclude <file>    Exclude file list (default: .claude/scan-exclude.txt)"
    echo "  --standards <file>  Structure standards file (default: .claude/structure-standards.json)"
    echo "  --module <name>     Validate specific module only"
    echo "  --report            Generate detailed report"
    echo "  --strict            Enable strict validation mode"
    echo "  --help              Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - No structure violations found"
    echo "  1 - Structure violations found"
    echo "  2 - Script error"
}

# 初始化默认结构标准
init_default_standards() {
    cat > "$STRUCTURE_STANDARDS_FILE" << 'EOF'
{
  "structure_standards": {
    "version": "1.0.0",
    "updated": "2024-01-15",
    "module_requirements": {
      "required_directories": [
        {
          "name": "src",
          "description": "Source code directory",
          "required": true,
          "subdirectories": [
            {
              "name": "constants",
              "description": "Constants and configuration",
              "required": true
            },
            {
              "name": "interfaces",
              "description": "TypeScript interfaces",
              "required": true
            },
            {
              "name": "types",
              "description": "TypeScript types",
              "required": true
            },
            {
              "name": "utils",
              "description": "Utility functions",
              "required": false
            }
          ]
        },
        {
          "name": "__test__",
          "description": "Test directory",
          "required": true,
          "subdirectories": [
            {
              "name": "unit",
              "description": "Unit tests",
              "required": false
            },
            {
              "name": "integration",
              "description": "Integration tests",
              "required": false
            },
            {
              "name": "fixtures",
              "description": "Test fixtures and data",
              "required": false
            }
          ]
        },
        {
          "name": "docs",
          "description": "Documentation directory",
          "required": false,
          "subdirectories": [
            {
              "name": "api",
              "description": "API documentation",
              "required": false
            },
            {
              "name": "examples",
              "description": "Usage examples",
              "required": false
            }
          ]
        }
      ],
      "required_files": [
        {
          "path": "README.md",
          "description": "Module documentation",
          "required": true
        },
        {
          "path": "package.json",
          "description": "Package configuration",
          "required": false
        },
        {
          "path": "tsconfig.json",
          "description": "TypeScript configuration",
          "required": false
        },
        {
          "path": "src/index.ts",
          "description": "Module entry point",
          "required": true
        },
        {
          "path": "src/constants/index.ts",
          "description": "Constants entry point",
          "required": true
        },
        {
          "path": "src/interfaces/index.ts",
          "description": "Interfaces entry point",
          "required": true
        },
        {
          "path": "src/types/index.ts",
          "description": "Types entry point",
          "required": true
        }
      ],
      "optional_files": [
        {
          "path": ".gitignore",
          "description": "Git ignore file",
          "required": false
        },
        {
          "path": ".npmignore",
          "description": "NPM ignore file",
          "required": false
        },
        {
          "path": "CONTRIBUTING.md",
          "description": "Contribution guidelines",
          "required": false
        },
        {
          "path": "CHANGELOG.md",
          "description": "Change log",
          "required": false
        }
      ]
    },
    "file_naming_conventions": {
      "source_files": {
        "pattern": "^[a-z][a-zA-Z0-9_]*\\.ts$",
        "description": "camelCase with .ts extension",
        "examples": ["userModule.ts", "databaseConnection.ts"]
      },
      "test_files": {
        "pattern": "^[a-z][a-zA-Z0-9_]*\\.test\\.ts$",
        "description": "camelCase with .test.ts extension",
        "examples": ["userModule.test.ts", "databaseConnection.test.ts"]
      },
      "interface_files": {
        "pattern": "^[A-Z][a-zA-Z0-9_]*\\.interface\\.ts$",
        "description": "PascalCase with .interface.ts extension",
        "examples": ["User.interface.ts", "Database.interface.ts"]
      },
      "type_files": {
        "pattern": "^[A-Z][a-zA-Z0-9_]*\\.type\\.ts$",
        "description": "PascalCase with .type.ts extension",
        "examples": ["User.type.ts", "Database.type.ts"]
      },
      "constant_files": {
        "pattern": "^[a-z][a-zA-Z0-9_]*\\.constants\\.ts$",
        "description": "camelCase with .constants.ts extension",
        "examples": ["api.constants.ts", "database.constants.ts"]
      }
    },
    "content_standards": {
      "readme_requirements": {
        "sections": [
          {
            "title": "Description",
            "required": true,
            "description": "Module description and purpose"
          },
          {
            "title": "Installation",
            "required": true,
            "description": "Installation instructions"
          },
          {
            "title": "Usage",
            "required": true,
            "description": "Usage examples"
          },
          {
            "title": "API",
            "required": true,
            "description": "API documentation"
          },
          {
            "title": "Contributing",
            "required": false,
            "description": "Contribution guidelines"
          }
        ]
      },
      "module_entry_point": {
        "requirements": [
          {
            "type": "import",
            "description": "Should import required classes and functions"
          },
          {
            "type": "export",
            "description": "Should have default export"
          },
          {
            "type": "types",
            "description": "Should export types and interfaces"
          }
        ]
      }
    }
  }
}
EOF
    log_message "INFO" "Created default structure standards file at: $STRUCTURE_STANDARDS_FILE"
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

# 检测模块结构违规
detect_structure_violations() {
    local scan_path="${1:-$PROJECT_ROOT}"
    local specific_module="${2:-}"
    local strict_mode="${3:-false}"
    local violations_found=0
    
    log_message "INFO" "Starting module structure validation scan in $scan_path"
    
    # 检查结构标准文件
    if [ ! -f "$STRUCTURE_STANDARDS_FILE" ]; then
        log_message "INFO" "No structure standards file found, creating default standards"
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
        
        log_message "INFO" "Validating module structure: $module_dir"
        
        # 验证必需目录
        validate_required_directories "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证必需文件
        validate_required_files "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证目录结构完整性
        validate_directory_structure "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证文件命名约定
        validate_file_naming_conventions "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证内容标准
        validate_content_standards "$module_dir" "$temp_results" "$strict_mode"
        
        # 验证子目录结构
        validate_subdirectory_structure "$module_dir" "$temp_results" "$strict_mode"
        
    done <<< "$module_dirs"
    
    # 输出结果
    if [ -s "$temp_results" ]; then
        log_message "CRITICAL" "Module structure violations found:"
        while IFS= read -r violation; do
            log_message "CRITICAL" "  $violation"
            echo "$violation"
        done < "$temp_results"
        violations_found=1
    else
        log_message "INFO" "No module structure violations found"
    fi
    
    # 清理临时文件
    rm -f "$temp_results"
    
    return $violations_found
}

# 验证必需目录
validate_required_directories() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 必需目录列表
    local required_dirs=("src" "__test__")
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$module_dir/$dir" ]; then
            echo "[CRITICAL] $module_relative - Missing required directory: $dir" >> "$results_file"
        fi
    done
    
    # 可选目录检查
    local optional_dirs=("docs")
    
    for dir in "${optional_dirs[@]}"; do
        if [ ! -d "$module_dir/$dir" ]; then
            echo "[INFO] $module_relative - Consider adding optional directory: $dir" >> "$results_file"
        fi
    done
}

# 验证必需文件
validate_required_files() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 必需文件列表
    local required_files=(
        "README.md"
        "src/index.ts"
        "src/constants/index.ts"
        "src/interfaces/index.ts"
        "src/types/index.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$module_dir/$file" ]; then
            echo "[CRITICAL] $module_relative - Missing required file: $file" >> "$results_file"
        fi
    done
    
    # 可选文件检查
    local optional_files=(
        "package.json"
        "tsconfig.json"
        ".gitignore"
        "CONTRIBUTING.md"
        "CHANGELOG.md"
    )
    
    for file in "${optional_files[@]}"; do
        if [ ! -f "$module_dir/$file" ]; then
            echo "[INFO] $module_relative - Consider adding optional file: $file" >> "$results_file"
        fi
    done
}

# 验证目录结构完整性
validate_directory_structure() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 检查src目录结构
    if [ -d "$module_dir/src" ]; then
        local src_subdirs=("constants" "interfaces" "types")
        
        for subdir in "${src_subdirs[@]}"; do
            if [ ! -d "$module_dir/src/$subdir" ]; then
                echo "[WARNING] $module_relative - Missing src subdirectory: $subdir" >> "$results_file"
            fi
        done
    fi
    
    # 检查__test__目录结构
    if [ -d "$module_dir/__test__" ]; then
        local test_files=$(find "$module_dir/__test__" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null)
        if [ -z "$test_files" ]; then
            echo "[WARNING] $module_relative - No test files found in __test__ directory" >> "$results_file"
        fi
    fi
}

# 验证文件命名约定
validate_file_naming_conventions() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 检查源文件命名
    if [ -d "$module_dir/src" ]; then
        local source_files=$(find "$module_dir/src" -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" 2>/dev/null)
        
        while IFS= read -r source_file; do
            [ -f "$source_file" ] || continue
            
            local filename=$(basename "$source_file")
            
            # 排除索引文件
            if [ "$filename" = "index.ts" ]; then
                continue
            fi
            
            # 检查接口文件命名
            if [[ "$filename" =~ .*interface\. ]]; then
                if [[ ! "$filename" =~ ^[A-Z][a-zA-Z0-9_]*\.interface\.ts$ ]]; then
                    echo "[WARNING] $module_relative - Invalid interface file name: $filename (should be PascalCase.interface.ts)" >> "$results_file"
                fi
                continue
            fi
            
            # 检查类型文件命名
            if [[ "$filename" =~ .*type\. ]]; then
                if [[ ! "$filename" =~ ^[A-Z][a-zA-Z0-9_]*\.type\.ts$ ]]; then
                    echo "[WARNING] $module_relative - Invalid type file name: $filename (should be PascalCase.type.ts)" >> "$results_file"
                fi
                continue
            fi
            
            # 检查常量文件命名
            if [[ "$filename" =~ .*constants\. ]]; then
                if [[ ! "$filename" =~ ^[a-z][a-zA-Z0-9_]*\.constants\.ts$ ]]; then
                    echo "[WARNING] $module_relative - Invalid constants file name: $filename (should be camelCase.constants.ts)" >> "$results_file"
                fi
                continue
            fi
            
            # 检查普通源文件命名
            if [[ ! "$filename" =~ ^[a-z][a-zA-Z0-9_]*\.ts$ ]]; then
                echo "[INFO] $module_relative - File name suggestion: $filename should be camelCase.ts" >> "$results_file"
            fi
            
        done <<< "$source_files"
    fi
    
    # 检查测试文件命名
    if [ -d "$module_dir/__test__" ]; then
        local test_files=$(find "$module_dir/__test__" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null)
        
        while IFS= read -r test_file; do
            [ -f "$test_file" ] || continue
            
            local filename=$(basename "$test_file")
            
            if [[ ! "$filename" =~ ^[a-z][a-zA-Z0-9_]*\.(test|spec)\.ts$ ]]; then
                echo "[WARNING] $module_relative - Invalid test file name: $filename (should be camelCase.test.ts)" >> "$results_file"
            fi
            
        done <<< "$test_files"
    fi
}

# 验证内容标准
validate_content_standards() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 检查README.md内容
    if [ -f "$module_dir/README.md" ]; then
        local readme_content=$(cat "$module_dir/README.md")
        
        # 检查必需的章节
        local required_sections=("Description" "Installation" "Usage" "API")
        
        for section in "${required_sections[@]}"; do
            if ! echo "$readme_content" | grep -q -i "^#* $section"; then
                echo "[WARNING] $module_relative - README.md missing required section: $section" >> "$results_file"
            fi
        done
    fi
    
    # 检查入口点文件
    if [ -f "$module_dir/src/index.ts" ]; then
        local index_content=$(cat "$module_dir/src/index.ts")
        
        # 检查默认导出
        if ! echo "$index_content" | grep -q "export default"; then
            echo "[WARNING] $module_relative - src/index.ts missing default export" >> "$results_file"
        fi
        
        # 检查类型导出
        if ! echo "$index_content" | grep -q "export.*interface\|export.*type"; then
            echo "[INFO] $module_relative - src/index.ts should export types and interfaces" >> "$results_file"
        fi
    fi
}

# 验证子目录结构
validate_subdirectory_structure() {
    local module_dir="$1"
    local results_file="$2"
    local strict_mode="$3"
    
    local module_relative="${module_dir#$PROJECT_ROOT/}"
    
    # 检查src/constants目录
    if [ -d "$module_dir/src/constants" ]; then
        if [ ! -f "$module_dir/src/constants/index.ts" ]; then
            echo "[CRITICAL] $module_relative - src/constants/index.ts missing" >> "$results_file"
        fi
    fi
    
    # 检查src/interfaces目录
    if [ -d "$module_dir/src/interfaces" ]; then
        if [ ! -f "$module_dir/src/interfaces/index.ts" ]; then
            echo "[CRITICAL] $module_relative - src/interfaces/index.ts missing" >> "$results_file"
        fi
        
        # 检查接口文件
        local interface_files=$(find "$module_dir/src/interfaces" -name "*.interface.ts" 2>/dev/null)
        if [ -z "$interface_files" ]; then
            echo "[INFO] $module_relative - Consider adding interface files to src/interfaces/" >> "$results_file"
        fi
    fi
    
    # 检查src/types目录
    if [ -d "$module_dir/src/types" ]; then
        if [ ! -f "$module_dir/src/types/index.ts" ]; then
            echo "[CRITICAL] $module_relative - src/types/index.ts missing" >> "$results_file"
        fi
        
        # 检查类型文件
        local type_files=$(find "$module_dir/src/types" -name "*.type.ts" 2>/dev/null)
        if [ -z "$type_files" ]; then
            echo "[INFO] $module_relative - Consider adding type files to src/types/" >> "$results_file"
        fi
    fi
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
            STRUCTURE_STANDARDS_FILE="$custom_standards"
            log_message "INFO" "Using custom structure standards file: $custom_standards"
        else
            log_message "ERROR" "Custom structure standards file not found: $custom_standards"
            exit 2
        fi
    fi
    
    # 执行扫描
    if detect_structure_violations "$scan_path" "$specific_module" "$strict_mode"; then
        log_message "INFO" "Module structure validation completed successfully"
        exit 0
    else
        log_message "CRITICAL" "Module structure violations detected"
        exit 1
    fi
}

# 执行主函数
main "$@"
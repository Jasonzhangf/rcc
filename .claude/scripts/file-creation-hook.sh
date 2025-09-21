#!/bin/bash

# Claude Code Hook: File Creation Validator
# This script validates file creation operations against the allowlist

set -e

# Configuration
ARCHITECTURE_SCRIPT="/Users/fanzhang/Documents/github/rcc/.claude/scripts/readme-architecture-parser.sh"
TMP_SCRIPT="/Users/fanzhang/Documents/github/rcc/.claude/scripts/tmp-manager.sh"
LOG_FILE="/Users/fanzhang/Documents/github/rcc/.claude/hooks.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log hook actions
log_hook() {
    local action="$1"
    local details="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HOOK - $action - $details" >> "$LOG_FILE"
}

# Function to extract file path from Write tool arguments
extract_write_file_path() {
    local args="$1"
    # Extract file_path from JSON-like arguments
    echo "$args" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4
}

# Function to extract file paths from Edit tool arguments
extract_edit_file_path() {
    local args="$1"
    # Extract file_path from JSON-like arguments
    echo "$args" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4
}

# Function to extract file paths from MultiEdit tool arguments
extract_multiedit_file_paths() {
    local args="$1"
    # Extract all file_path values from MultiEdit arguments
    echo "$args" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4 | sort | uniq
}

# Function to extract file operations from Bash command
extract_bash_file_operations() {
    local command="$1"
    local files=()
    
    # Extract file creation operations using simpler pattern matching
    case "$command" in
        touch*)
            local file="${command#touch }"
            # Remove leading/trailing whitespace
            file=$(echo "$file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            files+=("$file")
            ;;
        echo*\>*|echo*\>\>*)
            local file="${command#*> }"
            # Remove redirection symbols and whitespace
            file=$(echo "$file" | sed 's/[>]*//g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            files+=("$file")
            ;;
        cat*\>*|cat*\>\>*)
            local file="${command#*> }"
            # Remove redirection symbols and whitespace
            file=$(echo "$file" | sed 's/[>]*//g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            files+=("$file")
            ;;
        tee*)
            local file="${command#tee }"
            # Remove leading/trailing whitespace
            file=$(echo "$file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            files+=("$file")
            ;;
        mkdir*)
            local dir="${command#mkdir }"
            # Remove common flags (-p, -m, etc.)
            dir=$(echo "$dir" | sed 's/-[a-zA-Z]*//g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            files+=("$dir")
            ;;
        cp*)
            # Extract destination file/directory (last argument)
            local args=($command)
            if [ ${#args[@]} -ge 3 ]; then
                local dest="${args[${#args[@]}-1]}"
                # Remove leading/trailing whitespace
                dest=$(echo "$dest" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                files+=("$dest")
            fi
            ;;
        mv*)
            # Extract destination file/directory (last argument)
            local args=($command)
            if [ ${#args[@]} -ge 3 ]; then
                local dest="${args[${#args[@]}-1]}"
                # Remove leading/trailing whitespace
                dest=$(echo "$dest" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                files+=("$dest")
            fi
            ;;
    esac
    
    printf '%s\n' "${files[@]}"
}

# Function to check if file exists in module architecture
check_module_architecture() {
    local file_path="$1"

    # Extract module path if this is a module file
    if [[ "$file_path" == sharedmodule/* ]]; then
        local module_path=$(echo "$file_path" | cut -d'/' -f2)
        local module_dir="sharedmodule/$module_path"
        local relative_path="${file_path#$module_dir/}"

        # Check if module has architecture file (stored in root .claude/modules/)
        local module_architecture=".claude/modules/$module_path/file-architecture.json"
        if [ -f "$module_architecture" ] && command -v jq &> /dev/null; then
            # Check if file is explicitly allowed in module architecture
            if jq -r '.structure | keys[]' "$module_architecture" 2>/dev/null | grep -q "^$relative_path$"; then
                return 0
            fi

            # Check if file pattern is allowed in module
            local filename=$(basename "$file_path")
            local extension="${filename##*.}"

            # Check if this is a test file (allowed in any module)
            if [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]]; then
                return 0
            fi

            # Check if directory is allowed and file type matches
            local dir_path=$(dirname "$relative_path")
            if [ "$dir_path" != "." ]; then
                if jq -e '.structure | has("'$dir_path'/")' "$module_architecture" >/dev/null 2>&1; then
                    local dir_info=$(jq -r '.structure["'$dir_path'/"]' "$module_architecture" 2>/dev/null)
                    if echo "$dir_info" | jq -e '.allowed == true' >/dev/null 2>&1; then
                        # For source directories, only allow specific file types
                        case "$dir_path" in
                            src|src/*)
                                case "$extension" in
                                    ts|js|tsx|jsx|d.ts)
                                        return 0
                                        ;;
                                    *)
                                        return 1
                                        ;;
                                esac
                                ;;
                            tests|__tests__|test*)
                                case "$extension" in
                                    ts|js|test.ts|spec.ts)
                                        return 0
                                        ;;
                                    *)
                                        return 1
                                        ;;
                                esac
                                ;;
                            *)
                                return 0
                                ;;
                        esac
                    fi
                fi
            fi
        fi

        return 1
    fi

    return 1
}

# Function to get file creation suggestions
get_file_suggestions() {
    local file_path="$1"
    local suggestions=""

    # Extract module path if applicable
    if [[ "$file_path" == sharedmodule/* ]]; then
        local module_path=$(echo "$file_path" | cut -d'/' -f2)
        local module_dir="sharedmodule/$module_path"
        local filename=$(basename "$file_path")
        local file_purpose=$(guess_file_purpose "$filename")

        suggestions="🔧 MODULE FILE CREATION SUGGESTIONS:

📋 Step 1: Check README for existing functionality
   📖 Review module README: sharedmodule/$module_path/README.md
   🔍 Search for similar purpose: $file_purpose
   📋 Check architecture: .claude/modules/$module_path/file-architecture.json

📁 Step 2: Check existing files in module
   ls -la \"$module_dir/src/\"
   ls -la \"$module_dir/tests/\"

📝 Step 3: Consider alternatives
   1. Modify existing file: Add functionality to similar existing files
   2. Create test file: Create .test.ts file instead of implementation
   3. Use module exports: Check module's index.ts for available functionality

🚀 Step 4: If new file is absolutely necessary
   Request permission: ./.claude/scripts/request-file-permission.sh

🚫 IMPORTANT: Avoid duplicate implementations
   - Review sharedmodule/README.md for all available modules
   - Consider composing existing modules instead of creating new code"

    elif [[ "$file_path" == src/* ]]; then
        local filename=$(basename "$file_path")
        local file_purpose=$(guess_file_purpose "$filename")

        suggestions="🔧 ROOT SOURCE FILE CREATION SUGGESTIONS:

📋 Step 1: Check README for existing functionality
   📖 Review main README: README.md
   🔍 Search for similar purpose: $file_purpose
   📋 Check existing files: ls -la src/

📝 Step 2: Consider alternatives
   1. Use sharedmodule/: Place reusable code in appropriate module
   2. Extend existing files: Add functionality to existing root files
   3. Check existing modules: Review sharedmodule/README.md for available functionality

🚀 Step 3: If new file is absolutely necessary
   Request permission: ./.claude/scripts/request-file-permission.sh

📁 Recommended structure:
   - Reusable functionality → sharedmodule/[module]/src/
   - Project-specific → src/ (with permission)
   - Tests → tests/ or sharedmodule/[module]/tests/"

    else
        suggestions="🔧 FILE CREATION SUGGESTIONS:

📋 Step 1: Check existing functionality
   📖 Review relevant README files
   🔍 Search for similar functionality in existing files
   📁 Check appropriate directory structure

📝 Step 2: Recommended actions
   1. Use correct directory structure
   2. Check if similar file already exists
   3. Consider reusing existing functionality

🚀 Step 3: If new file is absolutely necessary
   Request permission: ./.claude/scripts/request-file-permission.sh

💡 For temporary files, use: ./.claude/scripts/tmp-manager.sh quick-exec <filename>"
    fi

    echo "$suggestions"
}

# Function to guess file purpose based on filename
guess_file_purpose() {
    local filename="$1"

    case "$filename" in
        *config*|*Config*)
            echo "configuration management"
            ;;
        *util*|*Utils*|*helper*|*Helper*)
            echo "utility functions"
            ;;
        *service*|*Service*)
            echo "service layer"
            ;;
        *controller*|*Controller*)
            echo "request handling"
            ;;
        *model*|*Model*)
            echo "data model"
            ;;
        *interface*|*Interface*|*type*|*Type*)
            echo "type definitions"
            ;;
        *test*|*spec*)
            echo "testing"
            ;;
        *)
            echo "general functionality"
            ;;
    esac
}

# Function to validate file against strict architecture rules
validate_file_against_architecture() {
    local file_path="$1"
    local is_new_file="$2"

    # Convert to relative path if it's absolute
    if [[ "$file_path" == /* ]]; then
        file_path="${file_path#$PWD/}"
    fi

    # Remove leading ./ if present
    file_path="${file_path#./}"

    # PROTECT ARCHITECTURE FILES - Block direct modification
    if [[ "$file_path" == .claude/file-architecture.json ]] || \
       [[ "$file_path" == .claude/modules/*/file-architecture.json ]] || \
       [[ "$file_path" == .claude/scripts/readme-architecture-parser.sh ]] || \
       [[ "$file_path" == .claude/scripts/file-creation-hook.sh ]] || \
       [[ "$file_path" == .claude/scripts/validate-new-architecture.sh ]]; then
        echo "❌ ARCHITECTURE FILE PROTECTION: Direct modification not allowed"
        echo ""
        echo "🔧 ARCHITECTURE FILE MANAGEMENT:"
        echo "   📋 Use permission request scripts to modify architecture files"
        echo "   📝 Check existing functionality in README files first"
        echo "   🚀 Request permission: ./.claude/scripts/request-file-permission.sh"
        echo ""
        echo "💡 Architecture files can only be modified through approved scripts"
        return 1
    fi

    # For new files, we need to check if they match the architecture
    if [ "$is_new_file" = "true" ]; then
        # Check if it's a temp file
        if [[ "$file_path" == tmp/* ]] || [[ "$file_path" == ./tmp/* ]] || [[ "$file_path" == */tmp/* ]]; then
            return 0  # Temp files are always allowed in temp directory
        fi

        # Check if it's a documentation file (docs directory is flexible)
        if [[ "$file_path" == docs/* ]]; then
            return 0  # Documentation files are allowed
        fi

        # Check if it's a test file (test files are generally allowed)
        local filename=$(basename "$file_path")
        if [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]]; then
            return 0  # Test files are allowed
        fi

        # Check module-specific architecture for sharedmodule files
        if [[ "$file_path" == sharedmodule/* ]]; then
            if check_module_architecture "$file_path"; then
                return 0
            else
                return 1  # Not allowed by module architecture
            fi
        fi

        # Check root architecture for other files
        local architecture_file="/Users/fanzhang/Documents/github/rcc/.claude/file-architecture.json"
        if [ -f "$architecture_file" ] && command -v jq &> /dev/null; then
            # Check if file is explicitly allowed
            if jq -r '.structure | keys[]' "$architecture_file" 2>/dev/null | grep -q "^$file_path$"; then
                return 0
            fi

            # Check if it's in allowed directory with strict rules
            local dir_path=$(dirname "$file_path")
            local filename=$(basename "$file_path")
            local extension="${filename##*.}"

            case "$dir_path" in
                src)
                    # Root src directory - very restrictive
                    case "$filename" in
                        index.ts|main.ts|config.ts|types.ts|utils.ts)
                            return 0
                            ;;
                        *)
                            return 1
                            ;;
                    esac
                    ;;
                config|config/*)
                    # Config directory - allow config files
                    case "$extension" in
                        json|yaml|yml|toml|env|config.*)
                            return 0
                            ;;
                        *)
                            return 1
                            ;;
                    esac
                    ;;
                scripts|scripts/*)
                    # Scripts directory - allow script files
                    case "$extension" in
                        sh|py|js|mjs|bash)
                            return 0
                            ;;
                        *)
                            return 1
                            ;;
                    esac
                    ;;
                tests|tests/*)
                    # Tests directory - allow test files
                    case "$extension" in
                        ts|js|test.ts|spec.ts)
                            return 0
                            ;;
                        *)
                            return 1
                            ;;
                    esac
                    ;;
                examples|examples/*)
                    # Examples directory - allow example files
                    return 0
                    ;;
                tools|tools/*)
                    # Tools directory - allow tool files
                    return 0
                    ;;
                *)
                    # Other directories not explicitly allowed
                    return 1
                    ;;
            esac
        fi

        return 1  # File not allowed by architecture
    else
        # For existing files, just check if they exist
        if [ -f "$file_path" ]; then
            return 0
        fi
        return 1
    fi
}

# Main hook function for file creation validation
validate_file_creation() {
    local tool_name="$1"
    local arguments="$2"

    log_hook "VALIDATE" "Tool: $tool_name, Args: $arguments"

    case "$tool_name" in
        "Write")
            local file_path=$(extract_write_file_path "$arguments")
            if [ -n "$file_path" ]; then
                log_hook "VALIDATE" "Write operation for: $file_path"
                if ! validate_file_against_architecture "$file_path" "true"; then
                    echo "❌ File creation not allowed: $file_path"
                    echo ""
                    get_file_suggestions "$file_path"
                    echo ""
                    echo "💡 For temporary files, use: $TMP_SCRIPT quick-exec <filename>"
                    exit 2
                fi
            fi
            ;;
        "Edit")
            local file_path=$(extract_edit_file_path "$arguments")
            if [ -n "$file_path" ]; then
                log_hook "VALIDATE" "Edit operation for: $file_path"
                # For edit operations, we check if the file exists or if it's allowed by architecture
                if [ ! -f "$file_path" ]; then
                    if ! validate_file_against_architecture "$file_path" "true"; then
                        echo "❌ File creation not allowed: $file_path"
                        echo ""
                        get_file_suggestions "$file_path"
                        echo ""
                        echo "💡 For temporary files, use: $TMP_SCRIPT quick-exec <filename>"
                        exit 2
                    fi
                fi
            fi
            ;;
        "MultiEdit")
            local file_paths=$(extract_multiedit_file_paths "$arguments")
            while read -r file_path; do
                if [ -n "$file_path" ]; then
                    log_hook "VALIDATE" "MultiEdit operation for: $file_path"
                    # For MultiEdit, we check if files exist or are allowed by architecture
                    if [ ! -f "$file_path" ]; then
                        if ! validate_file_against_architecture "$file_path" "true"; then
                            echo "❌ File creation not allowed: $file_path"
                            echo ""
                            get_file_suggestions "$file_path"
                            echo ""
                            echo "💡 For temporary files, use: $TMP_SCRIPT quick-exec <filename>"
                            exit 2
                        fi
                    fi
                fi
            done <<< "$file_paths"
            ;;
        "Bash")
            local files=$(extract_bash_file_operations "$arguments")
            while read -r file_path; do
                if [ -n "$file_path" ]; then
                    log_hook "VALIDATE" "Bash file operation for: $file_path"
                    if ! validate_file_against_architecture "$file_path" "true"; then
                        echo "❌ File creation not allowed: $file_path"
                        echo ""
                        get_file_suggestions "$file_path"
                        echo ""
                        echo "💡 For temporary files, use: $TMP_SCRIPT create <filename>"
                        exit 2
                    fi
                fi
            done <<< "$files"
            ;;
    esac

    log_hook "VALIDATE" "Validation passed for $tool_name"
}

# Parse command line arguments
case "$1" in
    "pre-tool-use")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 pre-tool-use <tool_name> <arguments>"
            exit 1
        fi
        validate_file_creation "$2" "$3"
        ;;
    "post-tool-use")
        if [ -z "$2" ]; then
            echo "Usage: $0 post-tool-use <tool_name>"
            exit 1
        fi
        log_hook "POST" "Tool: $2 completed"
        # Cleanup temporary files after any file operation
        $TMP_SCRIPT cleanup 2>/dev/null || true
        ;;
    "stop")
        log_hook "STOP" "Claude Code session ending"
        # Cleanup temporary files when session ends
        $TMP_SCRIPT cleanup 2>/dev/null || true
        ;;
    "logs")
        if [ -f "$LOG_FILE" ]; then
            tail -20 "$LOG_FILE"
        else
            echo "No hook logs found"
        fi
        ;;
    "test")
        echo "Testing architecture-based file creation hooks..."
        echo "Testing architecture validation for allowed file:"
        validate_file_against_architecture "src/test.ts" "true" && echo "✅ src/test.ts would be allowed" || echo "❌ src/test.ts blocked"
        echo "Testing architecture validation for temp file:"
        validate_file_against_architecture "tmp/test.tmp" "true" && echo "✅ tmp/test.tmp would be allowed" || echo "❌ tmp/test.tmp blocked"
        echo "Testing architecture validation for blocked file:"
        validate_file_against_architecture "random/blocked.file" "true" && echo "✅ random/blocked.file would be allowed" || echo "❌ random/blocked.file blocked"
        ;;
    *)
        echo "Claude Code Hook: File Creation Validator"
        echo "========================================"
        echo "Usage: $0 {pre-tool-use|post-tool-use|stop|logs|test}"
        echo ""
        echo "Commands:"
        echo "  pre-tool-use <tool_name> <arguments>  - Validate file creation before tool execution"
        echo "  post-tool-use <tool_name>          - Cleanup after tool execution"
        echo "  stop                              - Cleanup when session ends"
        echo "  logs                              - Show hook activity logs"
        echo "  test                              - Test hook functionality"
        exit 1
        ;;
esac
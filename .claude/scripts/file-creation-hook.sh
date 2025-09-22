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
    # Ensure log directory exists and handle errors gracefully
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HOOK - $action - $details" >> "$LOG_FILE" 2>/dev/null || true
}

# Function to extract file path from Write tool arguments
extract_write_file_path() {
    local args="$1"
    local raw_path=$(echo "$args" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)

    # Normalize path to absolute path based on current working directory
    if [[ "$raw_path" == /* ]]; then
        echo "$raw_path"
    else
        # Convert relative path to absolute based on current directory
        echo "$(pwd)/$raw_path"
    fi
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

# Function to extract file operations from Bash command - SIMPLIFIED
evaluate_bash_command_for_files() {
    local command="$1"
    local project_root="/Users/fanzhang/Documents/github/rcc"
    local should_check=false

    # Only check specific file creation commands
    case "$command" in
        touch*|*\>\>*|*\>*)
            should_check=true
            ;;
    esac

    echo "$should_check"
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

# Function to validate file against strict architecture rules
validate_file_against_architecture() {
    local file_path="$1"
    local is_new_file="$2"
    local project_root="/Users/fanzhang/Documents/github/rcc"

    # Normalize the file path to project-relative path
    local relative_path="$file_path"

    # Convert absolute paths to project-relative
    if [[ "$file_path" == "$project_root"* ]]; then
        relative_path="${file_path#$project_root/}"
    elif [[ "$file_path" == /* ]]; then
        # If it's a full path outside project, allow it
        return 0
    fi

    # Remove leading ./ if present
    relative_path="${relative_path#./}"

    # Remove leading ./ if present
    file_path="${file_path#./}"

    # PROTECT ARCHITECTURE FILES - Block direct modification
    if [[ "$relative_path" == .claude/file-architecture.json ]] || \
       [[ "$relative_path" == .claude/modules/*/file-architecture.json ]] || \
       [[ "$relative_path" == .claude/scripts/readme-architecture-parser.sh ]] || \
       [[ "$relative_path" == .claude/scripts/file-creation-hook.sh ]] || \
       [[ "$relative_path" == .claude/scripts/validate-new-architecture.sh ]]; then
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
        # Check if it's a temp file in allowed tmp directories
        # Allow /tmp in project root and any module root
        if [[ "$relative_path" == tmp/* ]] || \
           [[ "$relative_path" =~ ^sharedmodule/[^/]+/tmp/ ]] || \
           [[ "$relative_path" == */tmp/* ]]; then
            return 0  # Temp files are always allowed in tmp directories
        fi

        # Check if it's a documentation file (docs directory is flexible)
        if [[ "$relative_path" == docs/* ]]; then
            return 0  # Documentation files are allowed
        fi

        # Check if it's a test file (test files are generally allowed)
        local filename=$(basename "$relative_path")
        if [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]]; then
            return 0  # Test files are allowed
        fi

        # Check module-specific architecture for sharedmodule files
        if [[ "$relative_path" == sharedmodule/* ]]; then
            if check_module_architecture "$relative_path"; then
                return 0
            else
                return 1  # Not allowed by module architecture
            fi
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
                log_hook "WRITE_BLOCK" "Write operation blocked for: $file_path"

                # First check if this is within RCC project
                local project_root="/Users/fanzhang/Documents/github/rcc"
                if [[ "$file_path" != "$project_root"* ]]; then
                    log_hook "OUTSIDE_PROJECT" "File outside project, allowing: $file_path"
                    return 0
                fi

                # For Write operations, be strict - most new files need permission
                # Only allow in specific locations
                local relative_path="${file_path#$project_root/}"
                relative_path="${relative_path#./}"

                # Allow temp files anywhere in tmp directories
                if [[ "$relative_path" == tmp/* ]] || [[ "$relative_path" =~ /tmp/ ]]; then
                    return 0
                fi

                # Allow documentation files
                if [[ "$relative_path" == docs/* ]]; then
                    return 0
                fi

                # Allow test files
                local filename=$(basename "$file_path")
                if [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]]; then
                    return 0
                fi

                # Block everything else with clear message
                echo "❌ NEW FILE CREATION BLOCKED: $file_path"
                echo ""
                echo "💡 ALLOWED LOCATIONS:"
                echo "   📁 /tmp/ directories (anywhere in project)"
                echo "   📝 docs/ directory"
                echo "   🧪 Test files (*.test.*, *.spec.*)"
                echo "   📋 Project outside /Users/fanzhang/Documents/github/rcc"
                echo ""
                echo "🔧 To create this file: Use ./.claude/scripts/request-file-permission.sh"
                exit 2
            fi
            ;;
        "Edit")
            local file_path=$(extract_edit_file_path "$arguments")
            if [ -n "$file_path" ]; then
                log_hook "VALIDATE" "Edit operation for: $file_path"
                # For edit operations, be more strict about new script files
                if [ ! -f "$file_path" ]; then
                    if ! validate_file_against_architecture "$file_path" "true"; then
                        echo "❌ File creation not allowed: $file_path"
                        echo ""
                        echo "💡 File creation suggestions:"
                        echo "   📁 Use /tmp directories: Create in project tmp/ or module/*/tmp/"
                        echo "   📝 Use docs/ directory for documentation"
                        echo "   🧪 Use test files (*.test.*, *.spec.*) for testing"
                        echo "   📋 Check existing files before creating new ones"
                        echo ""
                        exit 2
                    fi
                else
                    # File exists, but still log for monitoring
                    log_hook "EXISTING" "Edit existing file: $file_path"
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
                            echo "💡 For temporary files, use: $TMP_SCRIPT quick-exec <filename>"
                            exit 2
                        fi
                    fi
                fi
            done <<< "$file_paths"
            ;;
        "Bash")
            # Simplified bash check - only check actual file creation commands
            local should_check=$(evaluate_bash_command_for_files "$arguments")
            if [ "$should_check" = "true" ]; then
                log_hook "VALIDATE" "Bash file creation detected, but allowing for now"
                # For now, allow bash file operations to avoid over-blocking
                # Only log them for monitoring
            fi
            ;;
    esac

    log_hook "VALIDATE" "Validation passed for $tool_name"
}

# Parse command line arguments
case "$1" in
    "pre-tool-use")
        if [ -z "$2" ] || [ -z "$3" ]; then
            # Silently succeed for malformed calls
            exit 0
        fi

        # Try validation, but don't let errors propagate to avoid confusing messages
        if ! validate_file_creation "$2" "$3"; then
            # Only exit 2 for actual file creation blocks, not for system errors
            exit 2
        fi
        ;;
    "post-tool-use")
        # Post-tool-use should never fail - just log silently
        if [ -n "$2" ]; then
            log_hook "POST" "Tool: $2 completed" 2>/dev/null || true
        fi
        # Always exit successfully for post-tool-use to avoid blocking
        exit 0
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
        echo "Testing simplified file creation hooks..."
        echo "File creation commands will be logged but not blocked"
        ;;
    *)
        echo "Claude Code Hook: Simplified File Creation Validator"
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
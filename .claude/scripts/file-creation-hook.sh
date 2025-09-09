#!/bin/bash

# Claude Code Hook: File Creation Validator
# This script validates file creation operations against the allowlist

set -e

# Configuration
ALLOWLIST_SCRIPT="/Users/fanzhang/Documents/github/rcc/.claude/scripts/file-allowlist-validator.sh"
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
                if ! $ALLOWLIST_SCRIPT validate "$file_path"; then
                    echo "❌ Hook validation failed: File creation not allowed for $file_path"
                    echo "💡 Use the tmp manager for temporary files: $TMP_SCRIPT quick-exec <filename>"
                    exit 2
                fi
            fi
            ;;
        "Edit")
            local file_path=$(extract_edit_file_path "$arguments")
            if [ -n "$file_path" ]; then
                log_hook "VALIDATE" "Edit operation for: $file_path"
                # For edit operations, we check if the file exists in allowlist or if it's being created
                if [ ! -f "$file_path" ]; then
                    if ! $ALLOWLIST_SCRIPT validate "$file_path"; then
                        echo "❌ Hook validation failed: File creation not allowed for $file_path"
                        echo "💡 Use the tmp manager for temporary files: $TMP_SCRIPT quick-exec <filename>"
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
                    # For MultiEdit, we check if files exist in allowlist or if they're being created
                    if [ ! -f "$file_path" ]; then
                        if ! $ALLOWLIST_SCRIPT validate "$file_path"; then
                            echo "❌ Hook validation failed: File creation not allowed for $file_path"
                            echo "💡 Use the tmp manager for temporary files: $TMP_SCRIPT quick-exec <filename>"
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
                    if ! $ALLOWLIST_SCRIPT validate "$file_path"; then
                        echo "❌ Hook validation failed: File creation not allowed for $file_path"
                        echo "💡 Use the tmp manager for temporary files: $TMP_SCRIPT create <filename>"
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
        echo "Testing file creation hooks..."
        echo "Testing allowlist validation:"
        $ALLOWLIST_SCRIPT validate "src/test.ts"
        echo "Testing tmp validation:"
        $ALLOWLIST_SCRIPT validate "tmp/test.tmp"
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
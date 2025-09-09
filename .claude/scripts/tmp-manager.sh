#!/bin/bash

# Temporary file management script
# Handles creation, execution, and cleanup of temporary files

set -e

# Configuration
TMP_DIR="${PWD}/tmp"
LOG_FILE="${PWD}/.claude/tmp-management.log"
MAX_TMP_AGE_DAYS=7  # Auto-clean temp files older than 7 days

# Create tmp directory if it doesn't exist
mkdir -p "$TMP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to create a temporary file
create_temp_file() {
    local filename="$1"
    local content="$2"
    
    if [ -z "$filename" ]; then
        echo "❌ ERROR: Temporary filename required"
        return 1
    fi
    
    # Ensure filename doesn't contain path traversal
    if [[ "$filename" == *..* ]] || [[ "$filename" == */* ]] && [[ "$filename" != tmp/* ]]; then
        echo "❌ ERROR: Invalid filename. Use simple filename, not full path"
        return 1
    fi
    
    # Remove any existing path prefix
    filename=$(basename "$filename")
    
    # Create the temporary file
    local temp_path="$TMP_DIR/$filename"
    
    if [ -n "$content" ]; then
        echo "$content" > "$temp_path"
    else
        touch "$temp_path"
    fi
    
    echo "✅ Temporary file created: $temp_path"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] CREATE - $temp_path" >> "$LOG_FILE"
    
    echo "$temp_path"
}

# Function to execute a temporary file safely
execute_temp_file() {
    local filename="$1"
    shift
    
    if [ -z "$filename" ]; then
        echo "❌ ERROR: Temporary filename required"
        return 1
    fi
    
    # Ensure filename is just the filename, not a path
    filename=$(basename "$filename")
    
    # Check if file exists in tmp directory
    local temp_path="$TMP_DIR/$filename"
    
    if [ ! -f "$temp_path" ]; then
        echo "❌ ERROR: Temporary file not found: $temp_path"
        return 1
    fi
    
    # Make file executable if it's a script
    chmod +x "$temp_path" 2>/dev/null || true
    
    echo "🚀 Executing temporary file: $temp_path"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] EXECUTE - $temp_path" >> "$LOG_FILE"
    
    # Execute with provided arguments
    if [ "$1" = "bash" ] || [ "$1" = "sh" ]; then
        # Execute as shell script
        bash "$temp_path" "$@"
    elif [ "$1" = "node" ]; then
        # Execute as Node.js script
        node "$temp_path" "$@"
    elif [ "$1" = "python" ] || [ "$1" = "python3" ]; then
        # Execute as Python script
        python3 "$temp_path" "$@"
    else
        # Execute directly
        "$temp_path" "$@"
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ Execution completed successfully"
    else
        echo "❌ Execution failed with exit code: $exit_code"
    fi
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] EXECUTED - $temp_path - Exit: $exit_code" >> "$LOG_FILE"
    
    return $exit_code
}

# Function to list temporary files
list_temp_files() {
    echo "📂 Temporary Files in $TMP_DIR:"
    echo "================================"
    
    if [ ! -d "$TMP_DIR" ] || [ -z "$(ls -A "$TMP_DIR" 2>/dev/null)" ]; then
        echo "No temporary files found"
        return 0
    fi
    
    ls -la "$TMP_DIR" | tail -n +2 | while read -r line; do
        local filename=$(echo "$line" | awk '{print $9}')
        local size=$(echo "$line" | awk '{print $5}')
        local date=$(echo "$line" | awk '{print $6" "$7" "$8}')
        local filepath="$TMP_DIR/$filename"
        
        if [ -f "$filepath" ]; then
            local file_age=$(find "$filepath" -mtime +$MAX_TMP_AGE_DAYS -print 2>/dev/null)
            local age_status=""
            if [ -n "$file_age" ]; then
                age_status=" (OLD - will be cleaned up)"
            fi
            
            echo "  📄 $filename - Size: $size - Modified: $date$age_status"
        fi
    done
}

# Function to clean up old temporary files
cleanup_temp_files() {
    echo "🧹 Cleaning up temporary files older than $MAX_TMP_AGE_DAYS days..."
    
    if [ ! -d "$TMP_DIR" ]; then
        echo "No temporary directory to clean"
        return 0
    fi
    
    local cleaned_count=0
    while IFS= read -r -d '' file; do
        echo "🗑️  Removing old file: $(basename "$file")"
        rm -f "$file"
        ((cleaned_count++))
    done < <(find "$TMP_DIR" -type f -mtime +$MAX_TMP_AGE_DAYS -print0 2>/dev/null)
    
    echo "✅ Cleaned up $cleaned_count old temporary files"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] CLEANUP - Removed $cleaned_count old files" >> "$LOG_FILE"
}

# Function to safely remove a temporary file
remove_temp_file() {
    local filename="$1"
    
    if [ -z "$filename" ]; then
        echo "❌ ERROR: Temporary filename required"
        return 1
    fi
    
    # Ensure filename is just the filename, not a path
    filename=$(basename "$filename")
    
    local temp_path="$TMP_DIR/$filename"
    
    if [ ! -f "$temp_path" ]; then
        echo "❌ ERROR: Temporary file not found: $temp_path"
        return 1
    fi
    
    rm -f "$temp_path"
    echo "🗑️  Temporary file removed: $temp_path"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] REMOVE - $temp_path" >> "$LOG_FILE"
}

# Function to show tmp management logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "📋 Temporary File Management Logs:"
        echo "================================"
        tail -20 "$LOG_FILE"
    else
        echo "No logs found"
    fi
}

# Parse command line arguments
case "$1" in
    "create")
        if [ -z "$2" ]; then
            echo "Usage: $0 create <filename> [content]"
            exit 1
        fi
        if [ -n "$3" ]; then
            create_temp_file "$2" "$3"
        else
            create_temp_file "$2"
        fi
        ;;
    "execute")
        if [ -z "$2" ]; then
            echo "Usage: $0 execute <filename> [args...]"
            exit 1
        fi
        shift
        execute_temp_file "$@"
        ;;
    "list")
        list_temp_files
        ;;
    "cleanup")
        cleanup_temp_files
        ;;
    "remove")
        if [ -z "$2" ]; then
            echo "Usage: $0 remove <filename>"
            exit 1
        fi
        remove_temp_file "$2"
        ;;
    "logs")
        show_logs
        ;;
    "quick-exec")
        # Quick execution: create, execute, and remove
        if [ -z "$2" ]; then
            echo "Usage: $0 quick-exec <filename> [content] [args...]"
            exit 1
        fi
        
        local filename="$2"
        local content="$3"
        shift 3
        
        local temp_path
        if [ -n "$content" ]; then
            temp_path=$(create_temp_file "$filename" "$content")
        else
            temp_path=$(create_temp_file "$filename")
        fi
        
        execute_temp_file "$(basename "$temp_path)" "$@"
        remove_temp_file "$(basename "$temp_path)"
        ;;
    *)
        echo "Temporary File Management Script"
        echo "================================"
        echo "Usage: $0 {create|execute|list|cleanup|remove|logs|quick-exec}"
        echo ""
        echo "Commands:"
        echo "  create <filename> [content]  - Create a temporary file"
        echo "  execute <filename> [args...] - Execute a temporary file"
        echo "  list                         - List all temporary files"
        echo "  cleanup                      - Clean up old temporary files"
        echo "  remove <filename>           - Remove a specific temporary file"
        echo "  logs                         - Show management logs"
        echo "  quick-exec <filename> [content] [args...]"
        echo "                               - Create, execute, and remove in one command"
        echo ""
        echo "All temporary files are stored in: $TMP_DIR"
        exit 1
        ;;
esac
#!/bin/bash

# File creation whitelist validator
# Validates that file creation is allowed based on predefined whitelist

set -e

# Configuration
ALLOWLIST_JSON="${PWD}/.claude/file-allowlist.json"
ALLOWLIST_TXT="${PWD}/.claude/file-allowlist.txt"
TMP_DIR="${PWD}/tmp"
LOG_FILE="${PWD}/.claude/file-access.log"

# Create directories if they don't exist
mkdir -p "$(dirname "$ALLOWLIST_JSON")"
mkdir -p "$TMP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Initialize JSON allowlist if it doesn't exist
if [ ! -f "$ALLOWLIST_JSON" ]; then
    echo "⚠️  JSON allowlist not found. Please ensure it exists at: $ALLOWLIST_JSON"
    echo "Creating default JSON allowlist..."
    # We'll handle this in the is_file_allowed_json function
fi

# Initialize legacy TXT allowlist for backward compatibility
if [ ! -f "$ALLOWLIST_TXT" ]; then
    echo "# File Creation Allowlist (LEGACY - Use JSON instead)
# This file is maintained for backward compatibility.
# Please use .claude/file-allowlist.json for manual editing.
" > "$ALLOWLIST_TXT"
fi

# Function to check if a file path is allowed using JSON allowlist
is_file_allowed_json() {
    local file_path="$1"
    local temp_file="$2"
    
    # If it's a temp file, check if it's in the tmp directory
    if [ "$temp_file" = "true" ]; then
        if [[ "$file_path" == *"/tmp/"* ]] || [[ "$file_path" == "./tmp/"* ]] || [[ "$file_path" == "tmp/"* ]]; then
            return 0
        else
            echo "❌ TEMP FILE ERROR: Temporary files must be placed in ./tmp directory"
            echo "   Attempted to create: $file_path"
            echo "   Expected location: ./tmp/$(basename "$file_path")"
            return 1
        fi
    fi
    
    # Convert to relative path if it's absolute
    if [[ "$file_path" == /* ]]; then
        file_path="${file_path#$PWD/}"
    fi
    
    # Remove leading ./ if present
    file_path="${file_path#./}"
    
    # Check if JSON allowlist exists
    if [ ! -f "$ALLOWLIST_JSON" ]; then
        echo "⚠️  JSON allowlist not found. Please create it at: $ALLOWLIST_JSON"
        return 1
    fi
    
    # Parse JSON allowlist
    if ! command -v jq &> /dev/null; then
        echo "⚠️  jq command not found. Falling back to legacy allowlist format."
        is_file_allowed_legacy "$file_path" "$temp_file"
        return $?
    fi
    
    # Check specific files first
    local allowed_specific=$(jq -r '.file_creation_allowlist.specific_files[] | select(.allowed == true) | .path' "$ALLOWLIST_JSON" 2>/dev/null || echo "")
    while IFS= read -r specific_file; do
        [ -n "$specific_file" ] && [ "$file_path" = "$specific_file" ] && return 0
    done <<< "$allowed_specific"
    
    # Check directories
    local allowed_dirs=$(jq -r '.file_creation_allowlist.directories[] | select(.allowed == true) | .path' "$ALLOWLIST_JSON" 2>/dev/null || echo "")
    while IFS= read -r dir_pattern; do
        if [ -n "$dir_pattern" ]; then
            # Check if file path starts with directory pattern
            if [[ "$dir_pattern" == */ ]]; then
                [[ "$file_path" == "$dir_pattern"* ]] && return 0
            else
                [[ "$file_path" == "$dir_pattern"* ]] && return 0
                [[ "$file_path" == "$dir_pattern/"* ]] && return 0
            fi
        fi
    done <<< "$allowed_dirs"
    
    # Check file patterns
    local allowed_patterns=$(jq -r '.file_creation_allowlist.file_patterns[] | select(.allowed == true) | .pattern' "$ALLOWLIST_JSON" 2>/dev/null || echo "")
    while IFS= read -r file_pattern; do
        if [ -n "$file_pattern" ]; then
            case "$file_pattern" in
                *.*) # File extension pattern
                    local extension="${file_pattern#*.}"
                    [[ "$file_path" == *".$extension" ]] && return 0
                    ;;
                *) # Direct pattern match
                    [[ "$file_path" == "$file_pattern" ]] && return 0
                    ;;
            esac
        fi
    done <<< "$allowed_patterns"
    
    # Check temporary files directory
    local tmp_dir=$(jq -r '.file_creation_allowlist.temporary_files.directory' "$ALLOWLIST_JSON" 2>/dev/null || echo "")
    local tmp_allowed=$(jq -r '.file_creation_allowlist.temporary_files.allowed' "$ALLOWLIST_JSON" 2>/dev/null || echo "false")
    
    if [ "$tmp_allowed" = "true" ] && [ -n "$tmp_dir" ]; then
        # Check if file path matches temp directory
        if [[ "$tmp_dir" == */ ]]; then
            [[ "$file_path" == "$tmp_dir"* ]] && return 0
        else
            [[ "$file_path" == "$tmp_dir"* ]] && return 0
            [[ "$file_path" == "$tmp_dir/"* ]] && return 0
        fi
    fi
    
    return 1
}

# Function to check if a file path is allowed using legacy TXT allowlist
is_file_allowed_legacy() {
    local file_path="$1"
    local temp_file="$2"
    
    # If it's a temp file, check if it's in the tmp directory
    if [ "$temp_file" = "true" ]; then
        if [[ "$file_path" == *"/tmp/"* ]] || [[ "$file_path" == "./tmp/"* ]] || [[ "$file_path" == "tmp/"* ]]; then
            return 0
        else
            echo "❌ TEMP FILE ERROR: Temporary files must be placed in ./tmp directory"
            echo "   Attempted to create: $file_path"
            echo "   Expected location: ./tmp/$(basename "$file_path")"
            return 1
        fi
    fi
    
    # Convert to relative path if it's absolute
    if [[ "$file_path" == /* ]]; then
        file_path="${file_path#$PWD/}"
    fi
    
    # Remove leading ./ if present
    file_path="${file_path#./}"
    
    # Check against legacy allowlist
    while IFS= read -r pattern; do
        # Skip comments and empty lines
        [[ "$pattern" =~ ^#.*$ ]] && continue
        [[ -z "$pattern" ]] && continue
        
        # Remove leading/trailing whitespace
        pattern=$(echo "$pattern" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Check if file path matches the pattern
        if [[ "$file_path" == "$pattern" ]]; then
            return 0
        fi
        
        # Check directory pattern (ends with /)
        if [[ "$pattern" == */ ]] && [[ "$file_path" == "$pattern"* ]]; then
            return 0
        fi
        
        # Check file extension pattern (starts with *)
        if [[ "$pattern" == * ]] && [[ "$file_path" == "$pattern" ]]; then
            return 0
        fi
        
        # Check if file is in a subdirectory of allowed directory
        if [[ "$pattern" == */ ]] && [[ "$file_path" == "$pattern"* ]]; then
            return 0
        fi
        
    done < "$ALLOWLIST_TXT"
    
    return 1
}

# Function to check if a file path is allowed (main function)
is_file_allowed() {
    local file_path="$1"
    local temp_file="$2"
    
    # Try JSON allowlist first
    if [ -f "$ALLOWLIST_JSON" ]; then
        is_file_allowed_json "$file_path" "$temp_file"
        return $?
    else
        # Fall back to legacy allowlist
        is_file_allowed_legacy "$file_path" "$temp_file"
        return $?
    fi
}

# Function to log file access attempts
log_file_access() {
    local file_path="$1"
    local action="$2"
    local status="$3"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $action - $file_path - $status" >> "$LOG_FILE"
}

# Main validation logic
validate_file_creation() {
    local file_path="$1"
    
    # Determine if this is a temporary file
    local is_temp="false"
    if [[ "$(basename "$file_path")" =~ ^tmp|^temp|^\. ]] || \
       [[ "$file_path" =~ tmp|temp|\.tmp$|\.temp$ ]]; then
        is_temp="true"
    fi
    
    # Check if file is allowed
    if is_file_allowed "$file_path" "$is_temp"; then
        log_file_access "$file_path" "CREATE" "ALLOWED"
        return 0
    fi
    
    # File not allowed
    log_file_access "$file_path" "CREATE" "BLOCKED"
    
    # Create temporary directory if it doesn't exist
    mkdir -p "./tmp"
    
    echo "❌ FILE CREATION BLOCKED:"
    echo "   📁 File: $file_path"
    echo "   🚫 Reason: File path not in allowlist"
    echo ""
    echo "   🔧 SOLUTIONS:"
    echo "   ┌─────────────────────────────────────────────────────────────────────────┐"
    echo "   │ 1️⃣  FOR TEMPORARY FILES:                                               │"
    echo "   │    - Move to: ./tmp/$(basename "$file_path")                             │"
    echo "   │    - Command: mv '$file_path' './tmp/$(basename "$file_path")'          │"
    echo "   │                                                                         │"
    echo "   │ 2️⃣  FOR PERMANENT FILES:                                              │"
    echo "   │    - Use approval script: ./.claude/scripts/approve-file-allowlist.sh  │"
    echo "   │    - Command: ./.claude/scripts/approve-file-allowlist.sh add '$file_path'"
    echo "   │                                                                         │"
    echo "   │ 3️⃣  EMERGENCY BYPASS:                                                │"
    echo "   │    - Use: git commit --no-verify (not recommended)                     │"
    echo "   └─────────────────────────────────────────────────────────────────────────┘"
    echo ""
    echo "   📋 APPROVAL PROCESS:"
    echo "   1. Use the approval script to request file addition"
    echo "   2. Script will log the request and require confirmation"
    echo "   3. All modifications to allowlist are tracked and audited"
    echo "   4. Temporary files can be created in ./tmp/ without approval"
    echo ""
    echo "   🗂️  Temporary files directory: ./tmp/"
    echo "   📝 Approval requests log: ./.claude/approval-requests.log"
    
    return 1
}

# Function to add pattern to JSON allowlist
add_to_json_allowlist() {
    local pattern="$1"
    local type="$2" # specific_file, directory, or file_pattern
    
    if [ ! -f "$ALLOWLIST_JSON" ]; then
        echo "❌ JSON allowlist not found at: $ALLOWLIST_JSON"
        return 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo "❌ jq command not found. Cannot modify JSON allowlist."
        return 1
    fi
    
    # Determine the array to add to based on the pattern type
    local array_name=""
    local new_entry=""
    
    case "$type" in
        "specific_file")
            array_name="specific_files"
            new_entry="{\"path\": \"$pattern\", \"description\": \"Manually added\", \"allowed\": true, \"notes\": \"Added via command line\"}"
            ;;
        "directory")
            array_name="directories"
            if [[ "$pattern" != */ ]]; then
                pattern="$pattern/"
            fi
            new_entry="{\"path\": \"$pattern\", \"description\": \"Manually added directory\", \"allowed\": true, \"subdirectories\": true, \"notes\": \"Added via command line\"}"
            ;;
        "file_pattern")
            array_name="file_patterns"
            new_entry="{\"pattern\": \"$pattern\", \"description\": \"Manually added pattern\", \"allowed\": true, \"notes\": \"Added via command line\"}"
            ;;
        *)
            echo "❌ Invalid type: $type. Use 'specific_file', 'directory', or 'file_pattern'"
            return 1
            ;;
    esac
    
    # Create backup
    cp "$ALLOWLIST_JSON" "$ALLOWLIST_JSON.bak"
    
    # Add the new entry using jq
    jq ".$array_name += [$new_entry]" "$ALLOWLIST_JSON.bak" > "$ALLOWLIST_JSON"
    
    if [ $? -eq 0 ]; then
        echo "✅ Added '$pattern' to $array_name in JSON allowlist"
        rm "$ALLOWLIST_JSON.bak"
        return 0
    else
        echo "❌ Failed to add pattern to JSON allowlist"
        mv "$ALLOWLIST_JSON.bak" "$ALLOWLIST_JSON" 2>/dev/null || true
        return 1
    fi
}

# Function to display JSON allowlist
show_json_allowlist() {
    if [ ! -f "$ALLOWLIST_JSON" ]; then
        echo "❌ JSON allowlist not found at: $ALLOWLIST_JSON"
        return 1
    fi
    
    echo "📋 JSON File Creation Allowlist:"
    echo "=========================================="
    
    if command -v jq &> /dev/null; then
        echo "📁 Directories:"
        jq -r '.file_creation_allowlist.directories[] | "  - \(.path) (\(.description)) - \(.notes)"' "$ALLOWLIST_JSON" 2>/dev/null
        
        echo ""
        echo "🔧 File Patterns:"
        jq -r '.file_creation_allowlist.file_patterns[] | "  - \(.pattern) (\(.description)) - \(.notes)"' "$ALLOWLIST_JSON" 2>/dev/null
        
        echo ""
        echo "📄 Specific Files:"
        jq -r '.file_creation_allowlist.specific_files[] | "  - \(.path) (\(.description)) - \(.notes)"' "$ALLOWLIST_JSON" 2>/dev/null
        
        echo ""
        echo "🗂️  Temporary Files:"
        jq -r '.file_creation_allowlist.temporary_files | "  - \(.directory) (\(.description)) - \(.notes)"' "$ALLOWLIST_JSON" 2>/dev/null
    else
        echo "⚠️  jq not found. Raw JSON content:"
        cat "$ALLOWLIST_JSON"
    fi
}

# Parse command line arguments
case "$1" in
    "validate")
        if [ -z "$2" ]; then
            echo "Usage: $0 validate <file_path>"
            exit 1
        fi
        validate_file_creation "$2"
        ;;
    "list")
        if [ -f "$ALLOWLIST_JSON" ]; then
            show_json_allowlist
        else
            echo "Current file creation allowlist (Legacy):"
            echo "================================"
            cat "$ALLOWLIST_TXT" | grep -v '^#' | grep -v '^$'
        fi
        ;;
    "add")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 add <pattern> <type>"
            echo "  Types: specific_file, directory, file_pattern"
            echo "  Examples:"
            echo "    $0 add 'src/custom/' directory"
            echo "    $0 add 'config.json' specific_file"
            echo "    $0 add '*.xml' file_pattern"
            exit 1
        fi
        if [ -f "$ALLOWLIST_JSON" ]; then
            add_to_json_allowlist "$2" "$3"
        else
            echo "⚠️  JSON allowlist not found. Adding to legacy allowlist."
            echo "$2" >> "$ALLOWLIST_TXT"
            echo "Added '$2' to legacy allowlist"
        fi
        ;;
    "add-file")
        if [ -z "$2" ]; then
            echo "Usage: $0 add-file <file_path>"
            exit 1
        fi
        if [ -f "$ALLOWLIST_JSON" ]; then
            add_to_json_allowlist "$2" "specific_file"
        else
            echo "$2" >> "$ALLOWLIST_TXT"
            echo "Added '$2' to legacy allowlist"
        fi
        ;;
    "add-dir")
        if [ -z "$2" ]; then
            echo "Usage: $0 add-dir <directory_path>"
            exit 1
        fi
        if [ -f "$ALLOWLIST_JSON" ]; then
            add_to_json_allowlist "$2" "directory"
        else
            # Ensure directory pattern ends with /
            local pattern="$2"
            [[ "$pattern" != */ ]] && pattern="$pattern/"
            echo "$pattern" >> "$ALLOWLIST_TXT"
            echo "Added '$pattern' to legacy allowlist"
        fi
        ;;
    "add-pattern")
        if [ -z "$2" ]; then
            echo "Usage: $0 add-pattern <file_pattern>"
            exit 1
        fi
        if [ -f "$ALLOWLIST_JSON" ]; then
            add_to_json_allowlist "$2" "file_pattern"
        else
            echo "$2" >> "$ALLOWLIST_TXT"
            echo "Added '$2' to legacy allowlist"
        fi
        ;;
    "json-info")
        echo "JSON Allowlist Information:"
        echo "=============================="
        echo "File: $ALLOWLIST_JSON"
        if [ -f "$ALLOWLIST_JSON" ]; then
            if command -v jq &> /dev/null; then
                echo "Version: $(jq -r '.file_creation_allowlist.meta.version' "$ALLOWLIST_JSON" 2>/dev/null || echo "Unknown")"
                echo "Last Updated: $(jq -r '.file_creation_allowlist.meta.last_updated' "$ALLOWLIST_JSON" 2>/dev/null || echo "Unknown")"
                echo "Description: $(jq -r '.file_creation_allowlist.meta.description' "$ALLOWLIST_JSON" 2>/dev/null || echo "No description")"
            else
                echo "Install jq to see detailed information"
            fi
        else
            echo "❌ JSON allowlist not found"
        fi
        ;;
    "logs")
        if [ -f "$LOG_FILE" ]; then
            tail -20 "$LOG_FILE"
        else
            echo "No logs found"
        fi
        ;;
    *)
        echo "File Allowlist Validator (JSON Edition)"
        echo "======================================"
        echo "Usage: $0 {validate|list|add|add-file|add-dir|add-pattern|json-info|logs}"
        echo ""
        echo "Commands:"
        echo "  validate <file_path>       - Validate if file creation is allowed"
        echo "  list                      - Show current allowlist (JSON preferred)"
        echo "  add <pattern> <type>       - Add pattern to JSON allowlist"
        echo "  add-file <file_path>      - Add specific file to allowlist"
        echo "  add-dir <directory_path>  - Add directory to allowlist"
        echo "  add-pattern <pattern>     - Add file pattern to allowlist"
        echo "  json-info                 - Show JSON allowlist information"
        echo "  logs                      - Show access logs"
        echo ""
        echo "Pattern types for 'add' command:"
        echo "  specific_file - Exact file path (e.g., 'config/custom.json')"
        echo "  directory    - Directory path (e.g., 'src/custom/')"
        echo "  file_pattern - File pattern (e.g., '*.xml')"
        echo ""
        echo "JSON allowlist: $ALLOWLIST_JSON"
        echo "Legacy allowlist: $ALLOWLIST_TXT"
        exit 1
        ;;
esac
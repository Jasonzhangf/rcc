#!/bin/bash

# RCC File Permission Request System
# 文件权限申请和审批系统

set -e

# Configuration
PROJECT_ROOT="${PWD}"
ARCHITECTURE_DIR="${PROJECT_ROOT}/.claude"
REQUESTS_DIR="${ARCHITECTURE_DIR}/permission-requests"
APPROVED_DIR="${ARCHITECTURE_DIR}/approved-permissions"
PENDING_DIR="${ARCHITECTURE_DIR}/pending-requests"
LOG_FILE="${ARCHITECTURE_DIR}/permission-system.log"

# Create necessary directories
mkdir -p "$REQUESTS_DIR" "$APPROVED_DIR" "$PENDING_DIR" "$(dirname "$LOG_FILE")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log_message() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to display colored output
print_color() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    echo "RCC File Permission Request System"
    echo "================================"
    echo "文件权限申请和审批管理系统"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  request <file_path>     申请创建新文件的权限"
    echo "  approve <request_id>    批准权限申请"
    echo "  reject <request_id>     拒绝权限申请"
    echo "  list [pending|approved] 列出权限申请"
    echo "  check <file_path>      检查文件权限状态"
    echo "  search <keyword>       搜索现有功能"
    echo "  validate              验证所有权限文件"
    echo "  help                  显示此帮助"
    echo ""
    echo "Examples:"
    echo "  $0 request sharedmodule/basemodule/src/NewService.ts"
    echo "  $0 approve req_20250921_001"
    echo "  $0 list pending"
    echo "  $0 search authentication"
    echo ""
}

# Function to generate request ID
generate_request_id() {
    echo "req_$(date +%Y%m%d_%H%M%S)"
}

# Function to extract module from file path
extract_module() {
    local file_path="$1"
    if [[ "$file_path" == sharedmodule/* ]]; then
        echo "$file_path" | cut -d'/' -f2
    else
        echo "root"
    fi
}

# Function to search for existing functionality
search_existing_functionality() {
    local keyword="$1"
    local results=""

    print_color "$BLUE" "🔍 Searching for existing functionality with keyword: $keyword"
    echo ""

    # Search in main README
    if [ -f "README.md" ]; then
        print_color "$YELLOW" "📖 Main README.md:"
        grep -i -A 2 -B 2 "$keyword" README.md | head -10 || echo "   No matches found"
        echo ""
    fi

    # Search in module READMEs
    for module_dir in sharedmodule/*/; do
        if [ -d "$module_dir" ] && [ -f "${module_dir}README.md" ]; then
            local module_name=$(basename "$module_dir")
            print_color "$YELLOW" "📖 Module $module_name README.md:"
            grep -i -A 2 -B 2 "$keyword" "${module_dir}README.md" | head -5 || echo "   No matches found"
            echo ""
        fi
    done

    # Search in existing architecture files
    for arch_file in .claude/modules/*/file-architecture.json; do
        if [ -f "$arch_file" ]; then
            local module_name=$(echo "$arch_file" | cut -d'/' -f3)
            print_color "$YELLOW" "🏗️  Architecture for $module_name:"
            if command -v jq &> /dev/null; then
                jq -r '.structure | to_entries[] | select(.value.description | ascii_downcase | test("'"$keyword"'")) | "   \(.key): \(.value.description)"' "$arch_file" 2>/dev/null || echo "   No matches found"
            fi
            echo ""
        fi
    done
}

# Function to request file creation permission
request_permission() {
    local file_path="$1"

    if [ -z "$file_path" ]; then
        print_color "$RED" "❌ Error: File path is required"
        echo "Usage: $0 request <file_path>"
        exit 1
    fi

    # Convert to relative path
    if [[ "$file_path" == /* ]]; then
        file_path="${file_path#$PWD/}"
    fi
    file_path="${file_path#./}"

    local request_id=$(generate_request_id)
    local module=$(extract_module "$file_path")
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    print_color "$BLUE" "📝 Creating permission request..."
    echo "Request ID: $request_id"
    echo "File: $file_path"
    echo "Module: $module"
    echo ""

    # Ask for purpose
    echo "🎯 What is the purpose of this file? (Be specific about functionality)"
    read -p "Purpose: " purpose

    # Ask for alternative search
    echo ""
    echo "🔍 Before proceeding, let's search for existing functionality..."
    echo "Enter keywords to search for similar functionality (or press Enter to skip): "
    read -p "Keywords: " keywords

    if [ -n "$keywords" ]; then
        echo ""
        search_existing_functionality "$keywords"
        echo ""
        echo "🤔 Did you find existing functionality that could be extended instead?"
        echo "If yes, please consider modifying existing files instead of creating new ones."
        echo ""
    fi

    # Create request JSON
    local request_file="$REQUESTS_DIR/${request_id}.json"
    cat > "$request_file" << EOF
{
  "requestId": "$request_id",
  "filePath": "$file_path",
  "module": "$module",
  "purpose": "$purpose",
  "status": "pending",
  "requestedAt": "$timestamp",
  "requestedBy": "claude-model",
  "reviewNotes": "",
  "approver": "",
  "approvedAt": null,
  "searchKeywords": "$keywords",
  "existingAlternatives": "Reviewed during request process"
}
EOF

    # Move to pending directory
    mv "$request_file" "$PENDING_DIR/"

    print_color "$GREEN" "✅ Permission request created successfully!"
    echo ""
    echo "📋 Request Details:"
    echo "   ID: $request_id"
    echo "   File: $file_path"
    echo "   Purpose: $purpose"
    echo "   Status: Pending approval"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Wait for approval: $0 list pending"
    echo "   2. Check status: $0 check $file_path"
    echo "   3. Review pending: $0 list pending"

    log_message "INFO" "Permission request created: $request_id for $file_path"
}

# Function to approve a request
approve_request() {
    local request_id="$1"

    if [ -z "$request_id" ]; then
        print_color "$RED" "❌ Error: Request ID is required"
        echo "Usage: $0 approve <request_id>"
        exit 1
    fi

    local request_file="$PENDING_DIR/${request_id}.json"

    if [ ! -f "$request_file" ]; then
        print_color "$RED" "❌ Error: Request not found: $request_id"
        echo "Available requests:"
        list_requests "pending"
        exit 1
    fi

    # Show request details
    print_color "$BLUE" "📋 Request Details:"
    if command -v jq &> /dev/null; then
        jq '.' "$request_file"
    else
        cat "$request_file"
    fi
    echo ""

    # Confirm approval
    echo "⚠️  Are you sure you want to approve this request? (y/N)"
    read -p "Confirm: " confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        # Update request status
        local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

        if command -v jq &> /dev/null; then
            jq --arg timestamp "$timestamp" --arg approver "manual-approval" '
            .status = "approved" |
            .approvedAt = $timestamp |
            .approver = $approver |
            .reviewNotes = "Manually approved via command line"
            ' "$request_file" > "${request_file}.tmp" && mv "${request_file}.tmp" "$request_file"
        else
            # Manual JSON update if jq not available
            sed -i.bak 's/"status": "pending"/"status": "approved"/' "$request_file"
            sed -i.bak 's/"approvedAt": null/"approvedAt": "'"$timestamp"'"/' "$request_file"
            rm -f "$request_file.bak"
        fi

        # Move to approved directory
        mv "$request_file" "$APPROVED_DIR/"

        # Update architecture file
        update_architecture_file "$request_file"

        print_color "$GREEN" "✅ Request approved successfully!"
        log_message "INFO" "Permission request approved: $request_id"
    else
        print_color "$YELLOW" "❌ Approval cancelled"
    fi
}

# Function to update architecture file
update_architecture_file() {
    local request_file="$1"
    local file_path=$(jq -r '.filePath' "$request_file" 2>/dev/null || grep -o '"filePath":"[^"]*"' "$request_file" | cut -d'"' -f4)
    local module=$(jq -r '.module' "$request_file" 2>/dev/null || grep -o '"module":"[^"]*"' "$request_file" | cut -d'"' -f4)
    local purpose=$(jq -r '.purpose' "$request_file" 2>/dev/null || grep -o '"purpose":"[^"]*"' "$request_file" | cut -d'"' -f4)

    if [ -z "$file_path" ] || [ -z "$module" ]; then
        print_color "$RED" "❌ Warning: Could not extract request details for architecture update"
        return 1
    fi

    # Determine architecture file path
    local arch_file=""
    if [ "$module" = "root" ]; then
        arch_file="$ARCHITECTURE_DIR/file-architecture.json"
    else
        arch_file="$ARCHITECTURE_DIR/modules/$module/file-architecture.json"
    fi

    if [ -f "$arch_file" ] && command -v jq &> /dev/null; then
        # Add new file to architecture
        local filename=$(basename "$file_path")
        local extension="${filename##*.}"
        local category="source"

        case "$extension" in
            json|yaml|yml|toml|env|config.*) category="config" ;;
            test.*|spec.*) category="test" ;;
            md|txt|html) category="docs" ;;
            *) category="source" ;;
        esac

        jq --arg file_path "$file_path" --arg purpose "$purpose" --arg category "$category" '
        .structure[$file_path] = {
            "type": "file",
            "purpose": $purpose,
            "description": $purpose,
            "category": $category,
            "allowed": true
        }
        ' "$arch_file" > "${arch_file}.tmp" && mv "${arch_file}.tmp" "$arch_file"

        print_color "$GREEN" "📝 Architecture file updated: $arch_file"
        log_message "INFO" "Architecture file updated for approved request: $file_path"
    else
        print_color "$YELLOW" "⚠️  Warning: Could not update architecture file automatically"
        echo "   Please manually add the file to: $arch_file"
    fi
}

# Function to reject a request
reject_request() {
    local request_id="$1"

    if [ -z "$request_id" ]; then
        print_color "$RED" "❌ Error: Request ID is required"
        echo "Usage: $0 reject <request_id>"
        exit 1
    fi

    local request_file="$PENDING_DIR/${request_id}.json"

    if [ ! -f "$request_file" ]; then
        print_color "$RED" "❌ Error: Request not found: $request_id"
        exit 1
    fi

    # Remove the request
    rm "$request_file"

    print_color "$GREEN" "✅ Request rejected and removed"
    log_message "INFO" "Permission request rejected: $request_id"
}

# Function to list requests
list_requests() {
    local filter="$1"

    if [ -z "$filter" ]; then
        filter="all"
    fi

    case "$filter" in
        "pending")
            print_color "$BLUE" "📋 Pending Permission Requests:"
            echo ""
            if [ -d "$PENDING_DIR" ] && [ "$(ls -A "$PENDING_DIR")" ]; then
                for request_file in "$PENDING_DIR"/*.json; do
                    local request_id=$(basename "$request_file" .json)
                    local file_path=$(jq -r '.filePath' "$request_file" 2>/dev/null || grep -o '"filePath":"[^"]*"' "$request_file" | cut -d'"' -f4)
                    local purpose=$(jq -r '.purpose' "$request_file" 2>/dev/null || grep -o '"purpose":"[^"]*"' "$request_file" | cut -d'"' -f4)
                    echo "   📝 $request_id"
                    echo "      📁 File: $file_path"
                    echo "      🎯 Purpose: $purpose"
                    echo ""
                done
            else
                echo "   No pending requests"
            fi
            ;;
        "approved")
            print_color "$GREEN" "✅ Approved Permission Requests:"
            echo ""
            if [ -d "$APPROVED_DIR" ] && [ "$(ls -A "$APPROVED_DIR")" ]; then
                for request_file in "$APPROVED_DIR"/*.json; do
                    local request_id=$(basename "$request_file" .json)
                    local file_path=$(jq -r '.filePath' "$request_file" 2>/dev/null || grep -o '"filePath":"[^"]*"' "$request_file" | cut -d'"' -f4)
                    local approver=$(jq -r '.approver' "$request_file" 2>/dev/null || grep -o '"approver":"[^"]*"' "$request_file" | cut -d'"' -f4)
                    echo "   ✅ $request_id"
                    echo "      📁 File: $file_path"
                    echo "      👤 Approver: $approver"
                    echo ""
                done
            else
                echo "   No approved requests"
            fi
            ;;
        "all")
            list_requests "pending"
            list_requests "approved"
            ;;
        *)
            print_color "$RED" "❌ Invalid filter: $filter"
            echo "Use: pending, approved, or all"
            exit 1
            ;;
    esac
}

# Function to check file permission status
check_permission() {
    local file_path="$1"

    if [ -z "$file_path" ]; then
        print_color "$RED" "❌ Error: File path is required"
        echo "Usage: $0 check <file_path>"
        exit 1
    fi

    # Convert to relative path
    if [[ "$file_path" == /* ]]; then
        file_path="${file_path#$PWD/}"
    fi
    file_path="${file_path#./}"

    print_color "$BLUE" "🔍 Checking permission status for: $file_path"
    echo ""

    # Check if file exists
    if [ -f "$file_path" ]; then
        print_color "$GREEN" "✅ File already exists"
        return 0
    fi

    # Check if approved by request system
    local found=false
    for request_file in "$APPROVED_DIR"/*.json; do
        if [ -f "$request_file" ]; then
            local requested_path=$(jq -r '.filePath' "$request_file" 2>/dev/null || grep -o '"filePath":"[^"]*"' "$request_file" | cut -d'"' -f4)
            if [ "$requested_path" = "$file_path" ]; then
                local request_id=$(basename "$request_file" .json)
                local approver=$(jq -r '.approver' "$request_file" 2>/dev/null || grep -o '"approver":"[^"]*"' "$request_file" | cut -d'"' -f4)
                print_color "$GREEN" "✅ Permission approved"
                echo "   Request ID: $request_id"
                echo "   Approver: $approver"
                found=true
                break
            fi
        fi
    done

    if [ "$found" = false ]; then
        # Check if in existing architecture
        if validate_file_in_architecture "$file_path"; then
            print_color "$GREEN" "✅ File allowed by existing architecture"
        else
            print_color "$RED" "❌ Permission denied"
            echo "   File not in approved architecture"
            echo "   Use '$0 request $file_path' to request permission"
        fi
    fi
}

# Function to validate file in existing architecture
validate_file_in_architecture() {
    local file_path="$1"

    # Check root architecture
    if [ -f "$ARCHITECTURE_DIR/file-architecture.json" ] && command -v jq &> /dev/null; then
        if jq -e '.structure | has("'$file_path'")' "$ARCHITECTURE_DIR/file-architecture.json" >/dev/null 2>&1; then
            return 0
        fi
    fi

    # Check module architectures
    if [[ "$file_path" == sharedmodule/* ]]; then
        local module=$(echo "$file_path" | cut -d'/' -f2)
        local relative_path="${file_path#sharedmodule/$module/}"
        local module_arch="$ARCHITECTURE_DIR/modules/$module/file-architecture.json"

        if [ -f "$module_arch" ] && command -v jq &> /dev/null; then
            if jq -e '.structure | has("'$relative_path'")' "$module_arch" >/dev/null 2>&1; then
                return 0
            fi
        fi
    fi

    return 1
}

# Function to validate all permission files
validate_all() {
    print_color "$BLUE" "🔍 Validating permission system..."
    echo ""

    # Check pending requests
    if [ -d "$PENDING_DIR" ]; then
        local pending_count=$(find "$PENDING_DIR" -name "*.json" | wc -l)
        print_color "$YELLOW" "📋 Pending requests: $pending_count"
    fi

    # Check approved requests
    if [ -d "$APPROVED_DIR" ]; then
        local approved_count=$(find "$APPROVED_DIR" -name "*.json" | wc -l)
        print_color "$GREEN" "✅ Approved requests: $approved_count"
    fi

    # Check architecture files
    local arch_count=0
    for arch_file in "$ARCHITECTURE_DIR/file-architecture.json" "$ARCHITECTURE_DIR/modules/*/file-architecture.json"; do
        if [ -f "$arch_file" ]; then
            ((arch_count++))
        fi
    done
    print_color "$BLUE" "🏗️  Architecture files: $arch_count"

    echo ""
    print_color "$GREEN" "✅ Permission system validation complete"
    log_message "INFO" "Permission system validation completed"
}

# Main command processing
case "$1" in
    "request")
        request_permission "$2"
        ;;
    "approve")
        approve_request "$2"
        ;;
    "reject")
        reject_request "$2"
        ;;
    "list")
        list_requests "$2"
        ;;
    "check")
        check_permission "$2"
        ;;
    "search")
        search_existing_functionality "$2"
        ;;
    "validate")
        validate_all
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_color "$RED" "❌ Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
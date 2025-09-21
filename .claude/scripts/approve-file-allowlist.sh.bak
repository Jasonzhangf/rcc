#!/bin/bash

# File Allowlist Approval Script
# 用于审批和记录file-allowlist的修改请求

set -e

# Configuration
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
ALLOWLIST_JSON="$PROJECT_ROOT/.claude/file-allowlist.json"
ALLOWLIST_TXT="$PROJECT_ROOT/.claude/file-allowlist.txt"
APPROVAL_LOG="$PROJECT_ROOT/.claude/approval-requests.log"
ACCESS_LOG="$PROJECT_ROOT/.claude/file-access.log"
MONITOR_LOG="$PROJECT_ROOT/.claude/allowlist-monitor.log"
VALIDATOR_SCRIPT="$PROJECT_ROOT/.claude/scripts/file-allowlist-validator.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$(dirname "$ALLOWLIST_JSON")"
mkdir -p "$(dirname "$APPROVAL_LOG")"
mkdir -p "$(dirname "$ACCESS_LOG")"
mkdir -p "$(dirname "$MONITOR_LOG")"

# Function to log approval requests
log_approval_request() {
    local action="$1"
    local target="$2"
    local details="$3"
    local status="$4"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ACTION: $action | TARGET: $target | DETAILS: $details | STATUS: $status | USER: $(whoami)" >> "$APPROVAL_LOG"
}

# Function to log access monitoring
log_access_monitoring() {
    local action="$1"
    local file="$2"
    local details="$3"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] MONITOR: $action | FILE: $file | DETAILS: $details | PID: $$ | USER: $(whoami)" >> "$MONITOR_LOG"
}

# Function to check if file is allowlist file
is_allowlist_file() {
    local file="$1"
    [[ "$file" == *"$ALLOWLIST_JSON" ]] || [[ "$file" == *"$ALLOWLIST_TXT" ]] || [[ "$file" == *".claude/file-allowlist"* ]]
}

# Function to show approval dashboard
show_approval_dashboard() {
    echo -e "${BLUE}📋 File Allowlist Approval Dashboard${NC}"
    echo "=============================================="
    echo ""
    
    # Show recent approval requests
    if [ -f "$APPROVAL_LOG" ]; then
        echo -e "${YELLOW}📝 Recent Approval Requests (Last 10):${NC}"
        echo "----------------------------------------"
        tail -10 "$APPROVAL_LOG" | while IFS= read -r line; do
            echo "  $line"
        done
        echo ""
    fi
    
    # Show recent monitoring activities
    if [ -f "$MONITOR_LOG" ]; then
        echo -e "${YELLOW}🔍 Recent Monitoring Activities (Last 10):${NC}"
        echo "----------------------------------------"
        tail -10 "$MONITOR_LOG" | while IFS= read -r line; do
            echo "  $line"
        done
        echo ""
    fi
    
    # Show allowlist status
    echo -e "${YELLOW}📁 Allowlist Status:${NC}"
    echo "----------------------------------------"
    if [ -f "$ALLOWLIST_JSON" ]; then
        echo -e "${GREEN}✅ JSON allowlist exists: $ALLOWLIST_JSON${NC}"
        echo "   Size: $(du -h "$ALLOWLIST_JSON" | cut -f1)"
        echo "   Modified: $(stat -f %Sm -t '%Y-%m-%d %H:%M:%S' "$ALLOWLIST_JSON" 2>/dev/null || stat -c %y "$ALLOWLIST_JSON" 2>/dev/null | cut -d. -f1)"
    else
        echo -e "${RED}❌ JSON allowlist not found${NC}"
    fi
    
    if [ -f "$ALLOWLIST_TXT" ]; then
        echo -e "${GREEN}✅ Legacy allowlist exists: $ALLOWLIST_TXT${NC}"
        echo "   Size: $(du -h "$ALLOWLIST_TXT" | cut -f1)"
        echo "   Modified: $(stat -f %Sm -t '%Y-%m-%d %H:%M:%S' "$ALLOWLIST_TXT" 2>/dev/null || stat -c %y "$ALLOWLIST_TXT" 2>/dev/null | cut -d. -f1)"
    fi
    echo ""
}

# Function to request file addition
request_file_addition() {
    local file_path="$1"
    local file_type="$2"
    
    if [ -z "$file_path" ]; then
        echo -e "${RED}❌ Error: File path is required${NC}"
        return 1
    fi
    
    # Determine file type automatically if not provided
    if [ -z "$file_type" ]; then
        if [[ "$file_path" == */ ]]; then
            file_type="directory"
        elif [[ "$file_path" == *.* ]]; then
            if [[ "$file_path" == *"*"* ]]; then
                file_type="file_pattern"
            else
                file_type="specific_file"
            fi
        else
            file_type="specific_file"
        fi
    fi
    
    echo -e "${BLUE}📋 File Addition Request${NC}"
    echo "===================================="
    echo -e "📁 File: ${YELLOW}$file_path${NC}"
    echo -e "🏷️  Type: ${YELLOW}$file_type${NC}"
    echo -e "👤 Requester: ${YELLOW}$(whoami)${NC}"
    echo -e "⏰ Time: ${YELLOW}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # Show current allowlist content for context
    echo -e "${BLUE}📋 Current Allowlist:${NC}"
    echo "--------------------------------"
    if [ -f "$ALLOWLIST_JSON" ]; then
        "$VALIDATOR_SCRIPT" list | head -10
    else
        cat "$ALLOWLIST_TXT" | grep -v '^#' | head -10
    fi
    echo ""
    
    # Request confirmation
    echo -e "${YELLOW}❓ Do you want to add this file to the allowlist?${NC}"
    echo "  [y] Yes, add to allowlist"
    echo "  [n] No, cancel request"
    echo "  [v] View allowlist details"
    echo -n "Choice: "
    read -r choice
    
    case "$choice" in
        [Yy]*)
            # Log the approval request
            log_approval_request "ADD" "$file_path" "type:$file_type" "APPROVED"
            
            # Add to allowlist
            if [ -f "$ALLOWLIST_JSON" ]; then
                "$VALIDATOR_SCRIPT" add "$file_path" "$file_type"
            else
                echo "$file_path" >> "$ALLOWLIST_TXT"
                echo -e "${GREEN}✅ Added to legacy allowlist${NC}"
            fi
            
            echo -e "${GREEN}✅ File '$file_path' has been added to the allowlist${NC}"
            echo -e "${BLUE}📝 Approval request logged in: $APPROVAL_LOG${NC}"
            ;;
        [Nn]*)
            log_approval_request "ADD" "$file_path" "type:$file_type" "REJECTED"
            echo -e "${YELLOW}❌ Request cancelled${NC}"
            ;;
        [Vv]*)
            echo -e "${BLUE}📋 Allowlist Details:${NC}"
            echo "--------------------------------"
            "$VALIDATOR_SCRIPT" list
            echo ""
            echo -e "${YELLOW}❓ Do you want to add this file? (y/n): ${NC}"
            read -r final_choice
            if [[ "$final_choice" =~ ^[Yy] ]]; then
                log_approval_request "ADD" "$file_path" "type:$file_type" "APPROVED"
                if [ -f "$ALLOWLIST_JSON" ]; then
                    "$VALIDATOR_SCRIPT" add "$file_path" "$file_type"
                else
                    echo "$file_path" >> "$ALLOWLIST_TXT"
                    echo -e "${GREEN}✅ Added to legacy allowlist${NC}"
                fi
                echo -e "${GREEN}✅ File '$file_path' has been added to the allowlist${NC}"
            else
                log_approval_request "ADD" "$file_path" "type:$file_type" "REJECTED"
                echo -e "${YELLOW}❌ Request cancelled${NC}"
            fi
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            return 1
            ;;
    esac
}

# Function to show approval history
show_approval_history() {
    echo -e "${BLUE}📋 Approval Request History${NC}"
    echo "=================================="
    
    if [ -f "$APPROVAL_LOG" ]; then
        echo -e "${YELLOW}📝 All Approval Requests:${NC}"
        echo "--------------------------------"
        cat "$APPROVAL_LOG" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        echo -e "${YELLOW}⚠️  No approval requests found${NC}"
    fi
    echo ""
}

# Function to start monitoring
start_monitoring() {
    echo -e "${BLUE}🔍 Starting File Allowlist Monitoring...${NC}"
    echo "=============================================="
    
    # Log monitoring start
    log_access_monitoring "START" "all" "Monitoring started for allowlist files"
    
    echo -e "${GREEN}✅ Monitoring started${NC}"
    echo -e "${YELLOW}📝 Monitoring log: $MONITOR_LOG${NC}"
    echo ""
    echo -e "${BLUE}🔧 Monitoring Features:${NC}"
    echo "  - File access tracking"
    echo "  - Allowlist modification detection"
    echo "  - Approval request logging"
    echo "  - User activity monitoring"
    echo ""
    echo -e "${YELLOW}⚠️  Press Ctrl+C to stop monitoring${NC}"
    
    # Simple monitoring loop
    while true; do
        sleep 5
        
        # Check if allowlist files have been modified
        if [ -f "$ALLOWLIST_JSON" ]; then
            local current_hash=$(md5sum "$ALLOWLIST_JSON" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
            if [ -n "$current_hash" ] && [ "$current_hash" != "$last_json_hash" ]; then
                log_access_monitoring "MODIFY" "$ALLOWLIST_JSON" "File content changed"
                last_json_hash="$current_hash"
            fi
        fi
        
        if [ -f "$ALLOWLIST_TXT" ]; then
            local current_hash=$(md5sum "$ALLOWLIST_TXT" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
            if [ -n "$current_hash" ] && [ "$current_hash" != "$last_txt_hash" ]; then
                log_access_monitoring "MODIFY" "$ALLOWLIST_TXT" "File content changed"
                last_txt_hash="$current_hash"
            fi
        fi
    done
}

# Function to show help
show_help() {
    echo -e "${BLUE}File Allowlist Approval Script${NC}"
    echo "================================"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <command> [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  add <file_path> [type]    - Request file addition to allowlist"
    echo "  dashboard                  - Show approval dashboard"
    echo "  history                   - Show approval history"
    echo "  monitor                   - Start real-time monitoring"
    echo "  validate <file_path>      - Validate if file is allowed"
    echo "  logs                      - Show monitoring logs"
    echo "  help                      - Show this help"
    echo ""
    echo -e "${YELLOW}File Types:${NC}"
    echo "  specific_file  - Exact file path (e.g., 'config.json')"
    echo "  directory      - Directory path (e.g., 'src/custom/')"
    echo "  file_pattern   - File pattern (e.g., '*.xml')"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  Allowlist JSON: $ALLOWLIST_JSON"
    echo "  Allowlist TXT: $ALLOWLIST_TXT"
    echo "  Approval Log:  $APPROVAL_LOG"
    echo "  Monitor Log:   $MONITOR_LOG"
    echo ""
    echo -e "${YELLOW}Features:${NC}"
    echo "  ✅ Approval request logging"
    echo "  ✅ File access monitoring"
    echo "  ✅ Interactive approval process"
    echo "  ✅ Real-time monitoring"
    echo "  ✅ Audit trail generation"
    echo "  ✅ User activity tracking"
}

# Main execution
case "$1" in
    "add")
        request_file_addition "$2" "$3"
        ;;
    "dashboard")
        show_approval_dashboard
        ;;
    "history")
        show_approval_history
        ;;
    "monitor")
        start_monitoring
        ;;
    "validate")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Error: File path is required${NC}"
            exit 1
        fi
        "$VALIDATOR_SCRIPT" validate "$2"
        ;;
    "logs")
        echo -e "${BLUE}📋 Monitoring Logs${NC}"
        echo "========================="
        if [ -f "$MONITOR_LOG" ]; then
            tail -20 "$MONITOR_LOG"
        else
            echo -e "${YELLOW}⚠️  No monitoring logs found${NC}"
        fi
        echo ""
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
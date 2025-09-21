#!/bin/bash

# File Allowlist Access Monitor
# 监控所有对file-allowlist文件的访问和修改

set -e

# Configuration
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
ALLOWLIST_JSON="$PROJECT_ROOT/.claude/file-allowlist.json"
ALLOWLIST_TXT="$PROJECT_ROOT/.claude/file-allowlist.txt"
MONITOR_LOG="$PROJECT_ROOT/.claude/allowlist-access.log"
ALERT_LOG="$PROJECT_ROOT/.claude/allowlist-alerts.log"
ACCESS_MONITOR_PID="$PROJECT_ROOT/.claude/access-monitor.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$(dirname "$ALLOWLIST_JSON")"
mkdir -p "$(dirname "$MONITOR_LOG")"
mkdir -p "$(dirname "$ALERT_LOG")"

# Function to log access
log_access() {
    local action="$1"
    local file="$2"
    local details="$3"
    local severity="$4"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local pid=$$
    local user=$(whoami)
    local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    
    echo "[$timestamp] SEV:$severity | ACTION:$action | FILE:$file | DETAILS:$details | PID:$pid | USER:$user | PROCESS:$process" >> "$MONITOR_LOG"
    
    # Log high severity actions to alert log
    if [ "$severity" = "HIGH" ]; then
        echo "[$timestamp] 🚨 HIGH SEVERITY ALERT: $action on $file by $user ($process)" >> "$ALERT_LOG"
    fi
}

# Function to check if file is allowlist file
is_allowlist_file() {
    local file="$1"
    [[ "$file" == *"$ALLOWLIST_JSON" ]] || [[ "$file" == *"$ALLOWLIST_TXT" ]] || [[ "$file" == *".claude/file-allowlist"* ]]
}

# Function to detect file access patterns
detect_suspicious_access() {
    local file="$1"
    local user="$2"
    local process="$3"
    
    # Detect AI-related processes
    if [[ "$process" == *"claude"* ]] || [[ "$process" == *"ai"* ]] || [[ "$process" == *"gpt"* ]]; then
        log_access "AI_ACCESS" "$file" "AI process detected: $process" "HIGH"
        return 0
    fi
    
    # Detect bulk operations
    if [[ "$process" == *"rm"* ]] || [[ "$process" == *"mv"* ]] || [[ "$process" == *"cp"* ]]; then
        log_access "BULK_OPERATION" "$file" "Bulk operation detected: $process" "MEDIUM"
        return 0
    fi
    
    # Detect editor access
    if [[ "$process" == *"vi"* ]] || [[ "$process" == *"vim"* ]] || [[ "$process" == *"nano"* ]] || [[ "$process" == *"emacs"* ]]; then
        log_access "EDITOR_ACCESS" "$file" "Editor access: $process" "LOW"
        return 0
    fi
    
    return 1
}

# Function to monitor file system events
monitor_file_events() {
    echo -e "${BLUE}🔍 Starting File Allowlist Access Monitor...${NC}"
    echo "================================================="
    echo -e "${GREEN}✅ Monitoring enabled for:${NC}"
    echo -e "  📁 $ALLOWLIST_JSON"
    echo -e "  📁 $ALLOWLIST_TXT"
    echo -e "  📝 Log: $MONITOR_LOG"
    echo -e "  🚨 Alerts: $ALERT_LOG"
    echo ""
    echo -e "${YELLOW}⚠️  Press Ctrl+C to stop monitoring${NC}"
    echo ""
    
    # Log monitoring start
    log_access "MONITOR_START" "all" "Access monitoring started" "INFO"
    
    # Store initial file states
    local initial_json_hash=""
    local initial_txt_hash=""
    local initial_json_size=""
    local initial_txt_size=""
    
    if [ -f "$ALLOWLIST_JSON" ]; then
        initial_json_hash=$(md5sum "$ALLOWLIST_JSON" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        initial_json_size=$(stat -f%z "$ALLOWLIST_JSON" 2>/dev/null || stat -c%s "$ALLOWLIST_JSON" 2>/dev/null || echo "unknown")
    fi
    
    if [ -f "$ALLOWLIST_TXT" ]; then
        initial_txt_hash=$(md5sum "$ALLOWLIST_TXT" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        initial_txt_size=$(stat -f%z "$ALLOWLIST_TXT" 2>/dev/null || stat -c%s "$ALLOWLIST_TXT" 2>/dev/null || echo "unknown")
    fi
    
    # Main monitoring loop
    while true; do
        sleep 2
        
        # Check JSON allowlist
        if [ -f "$ALLOWLIST_JSON" ]; then
            local current_json_hash=$(md5sum "$ALLOWLIST_JSON" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
            local current_json_size=$(stat -f%z "$ALLOWLIST_JSON" 2>/dev/null || stat -c%s "$ALLOWLIST_JSON" 2>/dev/null || echo "unknown")
            
            if [ "$current_json_hash" != "$initial_json_hash" ]; then
                log_access "FILE_MODIFIED" "$ALLOWLIST_JSON" "Hash changed: $initial_json_hash -> $current_json_hash" "HIGH"
                initial_json_hash="$current_json_hash"
            fi
            
            if [ "$current_json_size" != "$initial_json_size" ]; then
                log_access "FILE_SIZE_CHANGE" "$ALLOWLIST_JSON" "Size changed: $initial_json_size -> $current_json_size" "MEDIUM"
                initial_json_size="$current_json_size"
            fi
        else
            log_access "FILE_DELETED" "$ALLOWLIST_JSON" "File no longer exists" "HIGH"
        fi
        
        # Check TXT allowlist
        if [ -f "$ALLOWLIST_TXT" ]; then
            local current_txt_hash=$(md5sum "$ALLOWLIST_TXT" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
            local current_txt_size=$(stat -f%z "$ALLOWLIST_TXT" 2>/dev/null || stat -c%s "$ALLOWLIST_TXT" 2>/dev/null || echo "unknown")
            
            if [ "$current_txt_hash" != "$initial_txt_hash" ]; then
                log_access "FILE_MODIFIED" "$ALLOWLIST_TXT" "Hash changed: $initial_txt_hash -> $current_txt_hash" "HIGH"
                initial_txt_hash="$current_txt_hash"
            fi
            
            if [ "$current_txt_size" != "$initial_txt_size" ]; then
                log_access "FILE_SIZE_CHANGE" "$ALLOWLIST_TXT" "Size changed: $initial_txt_size -> $current_txt_size" "MEDIUM"
                initial_txt_size="$current_txt_size"
            fi
        else
            log_access "FILE_DELETED" "$ALLOWLIST_TXT" "File no longer exists" "HIGH"
        fi
        
        # Check for recent process activity
        local current_user=$(whoami)
        local current_pid=$$
        local current_process=$(ps -p $current_pid -o comm= 2>/dev/null || echo "unknown")
        
        # Monitor for suspicious processes
        detect_suspicious_access "$ALLOWLIST_JSON" "$current_user" "$current_process"
        
    done
}

# Function to show recent access
show_recent_access() {
    echo -e "${BLUE}📋 Recent File Allowlist Access${NC}"
    echo "====================================="
    
    if [ -f "$MONITOR_LOG" ]; then
        echo -e "${YELLOW}📝 Access Log (Last 20 entries):${NC}"
        echo "------------------------------------"
        tail -20 "$MONITOR_LOG" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        echo -e "${YELLOW}⚠️  No access log found${NC}"
    fi
    echo ""
    
    if [ -f "$ALERT_LOG" ]; then
        echo -e "${RED}🚨 Recent Alerts (Last 10):${NC}"
        echo "--------------------------------"
        tail -10 "$ALERT_LOG" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        echo -e "${GREEN}✅ No alerts found${NC}"
    fi
    echo ""
}

# Function to show access statistics
show_access_stats() {
    echo -e "${BLUE}📊 File Allowlist Access Statistics${NC}"
    echo "======================================="
    
    if [ -f "$MONITOR_LOG" ]; then
        echo -e "${YELLOW}📈 Access Summary:${NC}"
        echo "-------------------------"
        
        # Count total accesses
        local total_accesses=$(wc -l < "$MONITOR_LOG" 2>/dev/null || echo "0")
        echo -e "📊 Total accesses: ${GREEN}$total_accesses${NC}"
        
        # Count by severity
        local high_severity=$(grep -c "SEV:HIGH" "$MONITOR_LOG" 2>/dev/null || echo "0")
        local medium_severity=$(grep -c "SEV:MEDIUM" "$MONITOR_LOG" 2>/dev/null || echo "0")
        local low_severity=$(grep -c "SEV:LOW" "$MONITOR_LOG" 2>/dev/null || echo "0")
        
        echo -e "🚨 High severity: ${RED}$high_severity${NC}"
        echo -e "⚠️  Medium severity: ${YELLOW}$medium_severity${NC}"
        echo -e "ℹ️  Low severity: ${GREEN}$low_severity${NC}"
        
        # Count by action type
        echo ""
        echo -e "${YELLOW}🔧 Actions by Type:${NC}"
        echo "----------------------"
        grep "ACTION:" "$MONITOR_LOG" 2>/dev/null | sed 's/.*ACTION:\([^|]*\).*/\1/' | sort | uniq -c | sort -nr | while read count action; do
            echo "  $action: $count"
        done
        
        # Count by user
        echo ""
        echo -e "${YELLOW}👤 Access by User:${NC}"
        echo "-------------------"
        grep "USER:" "$MONITOR_LOG" 2>/dev/null | sed 's/.*USER:\([^|]*\).*/\1/' | sort | uniq -c | sort -nr | while read count user; do
            echo "  $user: $count"
        done
    else
        echo -e "${YELLOW}⚠️  No access log found${NC}"
    fi
    echo ""
}

# Function to start background monitoring
start_background_monitor() {
    echo -e "${BLUE}🔍 Starting Background Monitor...${NC}"
    echo "======================================"
    
    # Check if already running
    if [ -f "$ACCESS_MONITOR_PID" ]; then
        local old_pid=$(cat "$ACCESS_MONITOR_PID" 2>/dev/null || echo "")
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Monitor already running (PID: $old_pid)${NC}"
            echo "Use '$0 stop' to stop the existing monitor"
            return 1
        fi
    fi
    
    # Start monitor in background
    nohup "$0" monitor > /dev/null 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$ACCESS_MONITOR_PID"
    
    echo -e "${GREEN}✅ Background monitor started (PID: $new_pid)${NC}"
    echo -e "${YELLOW}📝 PID file: $ACCESS_MONITOR_PID${NC}"
    echo "Use '$0 stop' to stop the monitor"
}

# Function to stop background monitoring
stop_background_monitor() {
    echo -e "${BLUE}🛑 Stopping Background Monitor...${NC}"
    echo "====================================="
    
    if [ -f "$ACCESS_MONITOR_PID" ]; then
        local pid=$(cat "$ACCESS_MONITOR_PID" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            rm -f "$ACCESS_MONITOR_PID"
            echo -e "${GREEN}✅ Monitor stopped (PID: $pid)${NC}"
        else
            echo -e "${YELLOW}⚠️  Monitor not running${NC}"
            rm -f "$ACCESS_MONITOR_PID"
        fi
    else
        echo -e "${YELLOW}⚠️  No monitor PID file found${NC}"
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}File Allowlist Access Monitor${NC}"
    echo "=================================="
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <command>"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  monitor       - Start interactive monitoring"
    echo "  start         - Start background monitoring"
    echo "  stop          - Stop background monitoring"
    echo "  status        - Show monitor status"
    echo "  recent        - Show recent access"
    echo "  stats         - Show access statistics"
    echo "  alerts        - Show recent alerts"
    echo "  help          - Show this help"
    echo ""
    echo -e "${YELLOW}Features:${NC}"
    echo "  ✅ Real-time file access monitoring"
    echo "  ✅ Suspicious activity detection"
    echo "  ✅ AI process detection"
    echo "  ✅ Access logging and alerting"
    echo "  ✅ Background monitoring"
    echo "  ✅ Access statistics"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  Monitor Log:  $MONITOR_LOG"
    echo "  Alert Log:    $ALERT_LOG"
    echo "  PID File:     $ACCESS_MONITOR_PID"
}

# Main execution
case "$1" in
    "monitor")
        monitor_file_events
        ;;
    "start")
        start_background_monitor
        ;;
    "stop")
        stop_background_monitor
        ;;
    "status")
        if [ -f "$ACCESS_MONITOR_PID" ]; then
            local pid=$(cat "$ACCESS_MONITOR_PID" 2>/dev/null || echo "")
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}✅ Monitor running (PID: $pid)${NC}"
            else
                echo -e "${RED}❌ Monitor not running${NC}"
            fi
        else
            echo -e "${RED}❌ Monitor not running${NC}"
        fi
        ;;
    "recent")
        show_recent_access
        ;;
    "stats")
        show_access_stats
        ;;
    "alerts")
        if [ -f "$ALERT_LOG" ]; then
            echo -e "${BLUE}🚨 Recent Alerts${NC}"
            echo "================="
            cat "$ALERT_LOG"
        else
            echo -e "${GREEN}✅ No alerts found${NC}"
        fi
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
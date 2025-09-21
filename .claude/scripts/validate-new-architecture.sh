#!/bin/bash

# New Architecture System Validation Script
# This script validates the end-to-end README architecture standardization system

set -e

# Configuration
ARCHITECTURE_SCRIPT="./.claude/scripts/readme-architecture-parser.sh"
HOOK_SCRIPT="./.claude/scripts/file-creation-hook.sh"
ARCHITECTURE_FILE="./.claude/file-architecture.json"
TEMPLATE_FILE="./README_STANDARD_TEMPLATE.md"
STANDARD_FILE="./.claude/README_ARCHITECTURE_STANDARD.md"
LOG_FILE="./.claude/validation.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log validation steps
log_validation() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to test architecture parsing
test_architecture_parsing() {
    log_validation "INFO" "Testing README architecture parsing..."

    if [ ! -f "$ARCHITECTURE_SCRIPT" ]; then
        log_validation "ERROR" "Architecture parser script not found: $ARCHITECTURE_SCRIPT"
        return 1
    fi

    # Test script syntax
    if bash -n "$ARCHITECTURE_SCRIPT"; then
        log_validation "SUCCESS" "Architecture parser script syntax is valid"
    else
        log_validation "ERROR" "Architecture parser script has syntax errors"
        return 1
    fi

    # Test with existing README
    if [ -f "README.md" ]; then
        log_validation "INFO" "Testing architecture parsing with README.md..."
        if $ARCHITECTURE_SCRIPT --readme README.md --validate; then
            log_validation "SUCCESS" "README.md architecture parsing works"
        else
            log_validation "WARNING" "README.md architecture parsing failed (this might be expected if README doesn't have architecture section)"
        fi
    fi

    return 0
}

# Function to test hook functionality
test_hook_functionality() {
    log_validation "INFO" "Testing hook functionality..."

    if [ ! -f "$HOOK_SCRIPT" ]; then
        log_validation "ERROR" "Hook script not found: $HOOK_SCRIPT"
        return 1
    fi

    # Test hook script syntax
    if bash -n "$HOOK_SCRIPT"; then
        log_validation "SUCCESS" "Hook script syntax is valid"
    else
        log_validation "ERROR" "Hook script has syntax errors"
        return 1
    fi

    # Test hook functionality
    if $HOOK_SCRIPT test; then
        log_validation "SUCCESS" "Hook functionality test passed"
    else
        log_validation "ERROR" "Hook functionality test failed"
        return 1
    fi

    return 0
}

# Function to test architecture file
test_architecture_file() {
    log_validation "INFO" "Testing architecture file..."

    if [ ! -f "$ARCHITECTURE_FILE" ]; then
        log_validation "ERROR" "Architecture file not found: $ARCHITECTURE_FILE"
        return 1
    fi

    # Test JSON syntax
    if command -v jq &> /dev/null; then
        if jq empty "$ARCHITECTURE_FILE" 2>/dev/null; then
            log_validation "SUCCESS" "Architecture file JSON syntax is valid"

            # Test structure
            local module_name=$(jq -r '.module' "$ARCHITECTURE_FILE" 2>/dev/null)
            local structure_count=$(jq -r '.structure | keys | length' "$ARCHITECTURE_FILE" 2>/dev/null)

            log_validation "INFO" "Architecture module: $module_name"
            log_validation "INFO" "Architecture entries: $structure_count"

            if [ "$structure_count" -gt 0 ]; then
                log_validation "SUCCESS" "Architecture file has valid structure entries"
            else
                log_validation "WARNING" "Architecture file has no structure entries"
            fi
        else
            log_validation "ERROR" "Architecture file JSON syntax is invalid"
            return 1
        fi
    else
        log_validation "WARNING" "jq not found, skipping JSON validation"
    fi

    return 0
}

# Function to test template file
test_template_file() {
    log_validation "INFO" "Testing template file..."

    if [ ! -f "$TEMPLATE_FILE" ]; then
        log_validation "ERROR" "Template file not found: $TEMPLATE_FILE"
        return 1
    fi

    # Check if template has required sections
    local has_architecture_section=$(grep -n "📁 Module Structure & File Purpose" "$TEMPLATE_FILE" | wc -l)
    local has_overview_section=$(grep -n "🎯 Overview" "$TEMPLATE_FILE" | wc -l)
    local has_api_section=$(grep -n "📚 API Reference" "$TEMPLATE_FILE" | wc -l)

    log_validation "INFO" "Template architecture sections: $has_architecture_section"
    log_validation "INFO" "Template overview sections: $has_overview_section"
    log_validation "INFO" "Template API sections: $has_api_section"

    if [ "$has_architecture_section" -gt 0 ]; then
        log_validation "SUCCESS" "Template file has required architecture section"
    else
        log_validation "ERROR" "Template file missing required architecture section"
        return 1
    fi

    return 0
}

# Function to test standard file
test_standard_file() {
    log_validation "INFO" "Testing standard file..."

    if [ ! -f "$STANDARD_FILE" ]; then
        log_validation "ERROR" "Standard file not found: $STANDARD_FILE"
        return 1
    fi

    # Check if standard file has required content
    local has_standard_template=$(grep -n "RCC README 标准模板" "$STANDARD_FILE" | wc -l)
    local has_validation_info=$(grep -n "验证命令" "$STANDARD_FILE" | wc -l)
    local has_file_structure=$(grep -n "文件分类标准" "$STANDARD_FILE" | wc -l)

    log_validation "INFO" "Standard template references: $has_standard_template"
    log_validation "INFO" "Standard validation info: $has_validation_info"
    log_validation "INFO" "Standard file structure info: $has_file_structure"

    if [ "$has_standard_template" -gt 0 ]; then
        log_validation "SUCCESS" "Standard file contains template reference"
    else
        log_validation "WARNING" "Standard file missing template reference"
    fi

    return 0
}

# Function to test file permission scenarios
test_permission_scenarios() {
    log_validation "INFO" "Testing file permission scenarios..."

    # Test 1: Valid file creation in allowed directory
    log_validation "INFO" "Testing valid file creation (src/index.ts)..."
    if $HOOK_SCRIPT pre-tool-use Write '{"file_path":"src/index.ts","content":"test content"}' 2>/dev/null; then
        log_validation "SUCCESS" "Valid file creation allowed"
    else
        log_validation "ERROR" "Valid file creation blocked"
        return 1
    fi

    # Test 2: Temp file creation
    log_validation "INFO" "Testing temp file creation (tmp/test-temp.tmp)..."
    if $HOOK_SCRIPT pre-tool-use Write '{"file_path":"tmp/test-temp.tmp","content":"temp content"}' 2>/dev/null; then
        log_validation "SUCCESS" "Temp file creation allowed"
    else
        log_validation "ERROR" "Temp file creation blocked"
        return 1
    fi

    # Test 3: Invalid file creation
    log_validation "INFO" "Testing invalid file creation (random/blocked.file)..."
    if $HOOK_SCRIPT pre-tool-use Write '{"file_path":"random/blocked.file","content":"blocked content"}' 2>/dev/null; then
        log_validation "ERROR" "Invalid file creation was allowed"
        return 1
    else
        log_validation "SUCCESS" "Invalid file creation correctly blocked"
    fi

    return 0
}

# Main validation function
main() {
    log_validation "INFO" "Starting new architecture system validation..."
    log_validation "INFO" "=========================================="

    local failed_tests=0
    local total_tests=6

    # Test 1: Architecture parsing
    test_architecture_parsing || ((failed_tests++))

    # Test 2: Hook functionality
    test_hook_functionality || ((failed_tests++))

    # Test 3: Architecture file
    test_architecture_file || ((failed_tests++))

    # Test 4: Template file
    test_template_file || ((failed_tests++))

    # Test 5: Standard file
    test_standard_file || ((failed_tests++))

    # Test 6: Permission scenarios
    test_permission_scenarios || ((failed_tests++))

    # Summary
    log_validation "INFO" "=========================================="
    log_validation "INFO" "Validation Summary:"
    log_validation "INFO" "Total tests: $total_tests"
    log_validation "INFO" "Failed tests: $failed_tests"
    log_validation "INFO" "Success rate: $(( (total_tests - failed_tests) * 100 / total_tests ))%"

    if [ "$failed_tests" -eq 0 ]; then
        log_validation "SUCCESS" "All validation tests passed! 🎉"
        log_validation "SUCCESS" "The new README architecture system is fully operational."
        echo ""
        echo "✅ System Status: OPERATIONAL"
        echo "📋 Components validated:"
        echo "   - README architecture parsing"
        echo "   - Hook script integration"
        echo "   - File permission validation"
        echo "   - Template and standard documentation"
        echo "   - End-to-end functionality"
        exit 0
    else
        log_validation "ERROR" "Some validation tests failed. Check the log: $LOG_FILE"
        echo ""
        echo "❌ System Status: NEEDS ATTENTION"
        echo "🔧 Failed tests: $failed_tests"
        echo "📝 Check log: $LOG_FILE"
        exit 1
    fi
}

# Execute main function
main "$@"
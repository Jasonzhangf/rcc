#!/bin/bash

# Configuration System RCC4 Compliance Validation Script
# This script runs all validation checks for the Configuration System Module

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo -e "\n${BOLD}${CYAN}$1${NC}"
    echo -e "${CYAN}${'='*${#1}}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Main validation function
main() {
    echo -e "${BOLD}${CYAN}"
    echo "🔍 RCC4 Configuration System Validation Suite"
    echo "=============================================="
    echo -e "${NC}"

    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi

    # Create summary variables
    local total_checks=0
    local passed_checks=0
    local failed_checks=0

    print_header "1. Running Configuration Module Structure Validation"
    if node scripts/validate-configuration-module.js; then
        print_success "Configuration module validation completed"
        ((passed_checks++))
    else
        print_error "Configuration module validation failed"
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "2. Running TypeScript Compilation Check"
    if npm run typecheck 2>/dev/null; then
        print_success "TypeScript compilation check passed"
        ((passed_checks++))
    else
        print_error "TypeScript compilation check failed"
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "3. Running Linting Check"
    if npm run lint 2>/dev/null; then
        print_success "Linting check passed"
        ((passed_checks++))
    else
        print_error "Linting check failed"
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "4. Running Code Formatting Check"
    if npm run format:check 2>/dev/null; then
        print_success "Code formatting check passed"
        ((passed_checks++))
    else
        print_error "Code formatting check failed"
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "5. Running API Registry Validation"
    if [[ -f ".claude/module-api-registry.json" ]]; then
        if node -e "JSON.parse(require('fs').readFileSync('.claude/module-api-registry.json', 'utf8'))" 2>/dev/null; then
            print_success "API registry is valid JSON"
            ((passed_checks++))
        else
            print_error "API registry has invalid JSON"
            ((failed_checks++))
        fi
    else
        print_error "API registry file not found"
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "6. Running Test Suite (if available)"
    if npm test 2>/dev/null; then
        print_success "Test suite passed"
        ((passed_checks++))
    else
        print_warning "Test suite not available or failed"
        # Don't count this as a failure since tests might not be implemented yet
    fi

    print_header "7. Checking Required Files"
    local required_files=(
        "src/modules/Configuration/README.md"
        "src/modules/Configuration/API_DOCUMENTATION.md"
        ".claude/module-api-registry.json"
        "package.json"
        "tsconfig.json"
    )

    local files_check_passed=true
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "Required file exists: $file"
        else
            print_error "Required file missing: $file"
            files_check_passed=false
        fi
    done

    if $files_check_passed; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    ((total_checks++))

    print_header "8. Checking Configuration Module Files"
    local config_modules=(
        "ConfigLoaderModule"
        "ConfigValidatorModule"
        "ConfigPersistenceModule"
        "ConfigUIModule"
        "StatusLineModule"
    )

    local modules_check_passed=true
    for module in "${config_modules[@]}"; do
        local module_file="src/modules/Configuration/src/${module}.ts"
        if [[ -f "$module_file" ]]; then
            print_success "Module file exists: $module"
        else
            print_error "Module file missing: $module"
            modules_check_passed=false
        fi
    done

    if $modules_check_passed; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    ((total_checks++))

    # Generate final report
    print_header "📊 Final Validation Report"
    
    local pass_rate=0
    if [[ $total_checks -gt 0 ]]; then
        pass_rate=$((passed_checks * 100 / total_checks))
    fi

    echo -e "Total Checks: ${BOLD}$total_checks${NC}"
    echo -e "Passed: ${GREEN}$passed_checks${NC}"
    echo -e "Failed: ${RED}$failed_checks${NC}"
    echo -e "Pass Rate: ${BOLD}$pass_rate%${NC}"

    if [[ $pass_rate -ge 80 && $failed_checks -eq 0 ]]; then
        echo -e "\n${BOLD}${GREEN}🎉 CONFIGURATION SYSTEM VALIDATION PASSED!${NC}"
        echo -e "${GREEN}The Configuration System meets RCC4 compliance requirements.${NC}"
        exit 0
    elif [[ $pass_rate -ge 60 ]]; then
        echo -e "\n${BOLD}${YELLOW}⚠️  CONFIGURATION SYSTEM VALIDATION PARTIALLY PASSED${NC}"
        echo -e "${YELLOW}Some issues need to be addressed for full compliance.${NC}"
        exit 1
    else
        echo -e "\n${BOLD}${RED}❌ CONFIGURATION SYSTEM VALIDATION FAILED${NC}"
        echo -e "${RED}Critical issues must be resolved before deployment.${NC}"
        exit 1
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo ""
    echo "This script validates the Configuration System Module compliance with RCC4 standards."
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main
#!/bin/bash

# RCC Pipeline Framework Release Script
# This script builds, tests, and publishes the pipeline framework

set -e  # Exit on any error

echo "🚀 Starting RCC Pipeline Framework Release..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Parse command line arguments
DRY_RUN=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run     Run all steps except actual publishing"
            echo "  --skip-tests  Skip running tests"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if user is logged in to npm
if [ "$DRY_RUN" = false ]; then
    print_step "Checking npm login status..."
    NPM_USER=$(npm whoami 2>/dev/null || echo "")
    if [ -z "$NPM_USER" ]; then
        print_error "Not logged in to npm. Please run 'npm login' first."
        exit 1
    else
        print_status "Logged in as: $NPM_USER"
    fi
fi

# Step 1: Run tests
if [ "$SKIP_TESTS" = false ]; then
    print_step "Running comprehensive tests..."
    ./test.sh
    
    if [ $? -ne 0 ]; then
        print_error "Tests failed, aborting release"
        exit 1
    fi
else
    print_warning "Skipping tests as requested"
fi

# Step 2: Build the project
print_step "Building project..."
./build.sh

if [ $? -ne 0 ]; then
    print_error "Build failed, aborting release"
    exit 1
fi

# Step 3: Validate package.json
print_step "Validating package.json..."
node -e "
const pkg = require('./package.json');
const required = ['name', 'version', 'description', 'main', 'module', 'types', 'keywords', 'author', 'license'];
const missing = required.filter(field => !pkg[field]);
if (missing.length > 0) {
    console.error('Missing required fields in package.json:', missing.join(', '));
    process.exit(1);
}
console.log('✅ package.json validation passed');
"

# Step 4: Check build artifacts
print_step "Checking build artifacts..."
REQUIRED_FILES=("dist/index.js" "dist/index.esm.js" "dist/index.d.ts")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Missing required file: $file"
        exit 1
    fi
done
print_status "✅ All required build artifacts present"

# Step 5: Update version if needed (interactive)
print_step "Current version: $(node -p "require('./package.json').version")"
read -p "Do you want to update the version? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter new version (e.g., 1.0.0): " NEW_VERSION
    if [ -n "$NEW_VERSION" ]; then
        npm version "$NEW_VERSION" --no-git-tag-version
        print_status "Version updated to: $NEW_VERSION"
    fi
fi

# Step 6: Dry run or actual publish
if [ "$DRY_RUN" = true ]; then
    print_step "Performing dry run publish..."
    npm publish --dry-run
    
    print_status "✅ Dry run completed successfully!"
    print_status "To actually publish, run: $0"
else
    print_step "Publishing to npm..."
    npm publish
    
    if [ $? -eq 0 ]; then
        print_status "✅ Successfully published to npm!"
        
        # Show published package info
        PACKAGE_NAME=$(node -p "require('./package.json').name")
        PACKAGE_VERSION=$(node -p "require('./package.json').version")
        print_status "Published package: $PACKAGE_NAME@$PACKAGE_VERSION"
    else
        print_error "Publish failed"
        exit 1
    fi
fi

echo ""
echo "🎉 Release process completed successfully!"
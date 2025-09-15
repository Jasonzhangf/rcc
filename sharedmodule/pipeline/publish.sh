#!/bin/bash

# RCC Pipeline Framework Publishing Script
# This script publishes the pipeline framework to npm

set -e

echo "🚀 Publishing RCC Pipeline Framework..."
echo "======================================"

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
    print_error "package.json not found. Please run this script from the pipeline module directory."
    exit 1
fi

# Parse command line arguments
DRY_RUN=false
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            # Unknown option
            ;;
    esac
done

# Step 1: Build the framework
print_step "Building the framework..."
./build.sh

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

# Step 2: Run tests
print_step "Running tests..."
./build.sh --test

if [ $? -ne 0 ]; then
    print_error "Tests failed"
    exit 1
fi

# Step 3: Check if logged in to npm
print_step "Checking npm login status..."
if ! npm whoami > /dev/null 2>&1; then
    print_warning "Not logged in to npm. Please login with 'npm login'"
    print_step "Running npm login..."
    npm login
fi

# Step 4: Validate package
print_step "Validating package..."
if npm pack --dry-run 2>/dev/null; then
    print_status "Package validation successful"
else
    print_error "Package validation failed"
    exit 1
fi

# Step 5: Show package info
print_step "Package information:"
echo "Name: $(jq -r '.name' package.json)"
echo "Version: $(jq -r '.version' package.json)"
echo "Description: $(jq -r '.description' package.json)"
echo "Main file: $(jq -r '.main' package.json)"
echo "Module file: $(jq -r '.module' package.json)"

# Step 6: Check files that will be published
print_step "Checking files to be published..."
echo "Files included in package:"
npm pack --dry-run --silent | tar -tf * | head -20

# Step 7: Publish
if [ "$DRY_RUN" = true ]; then
    print_step "Performing dry-run publish..."
    if npm publish --dry-run; then
        print_status "✅ Dry-run publish successful"
    else
        print_error "❌ Dry-run publish failed"
        exit 1
    fi
else
    print_step "Publishing to npm..."
    if npm publish; then
        print_status "✅ Successfully published to npm!"
    else
        print_error "❌ Publish failed"
        exit 1
    fi
fi

echo ""
print_status "✅ Pipeline Framework publishing completed!"
echo ""
echo "📋 Published Components:"
echo "  - ✅ Framework package"
echo "  - ✅ CommonJS build"
echo "  - ✅ ES Module build"
echo "  - ✅ All tests passed"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "🔍 This was a dry-run. To actually publish, run: ./publish.sh"
else
    echo "🎉 Framework is now available on npm!"
    echo "📦 Package: $(jq -r '.name' package.json)@$(jq -r '.version' package.json)"
fi
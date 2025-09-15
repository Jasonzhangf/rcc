#!/bin/bash

# RCC Pipeline Framework Publishing Preparation Script
# This script prepares the framework for npm publishing

set -e  # Exit on any error

echo "🚀 Preparing RCC Pipeline Framework for Publishing..."
echo "================================================="

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

# Check if logged in to npm
print_step "Checking npm login status..."
if ! npm whoami > /dev/null 2>&1; then
    print_warning "Not logged in to npm. Please login with 'npm login'"
    print_step "Running npm login..."
    npm login
fi

# Install dependencies
print_step "Installing dependencies..."
npm install

# Build the simple version
print_step "Building simple JavaScript version..."
npx rollup -c rollup-simple.config.js

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

# Run tests
print_step "Running tests..."
node test-basic.js

if [ $? -ne 0 ]; then
    print_error "Tests failed"
    exit 1
fi

# Run Qwen integration tests
print_step "Running Qwen integration tests..."
./test-qwen-simple.sh

if [ $? -ne 0 ]; then
    print_error "Qwen integration tests failed"
    exit 1
fi

# Check package.json
print_step "Validating package.json..."
if npm pack --dry-run 2>/dev/null; then
    print_status "Package validation successful"
else
    print_error "Package validation failed"
    exit 1
fi

# Check files that will be published
print_step "Checking files to be published..."
echo "Files included in package:"
npm pack --dry-run --silent | tar -tf * | head -20

# Show package info
print_step "Package information:"
echo "Name: $(jq -r '.name' package.json)"
echo "Version: $(jq -r '.version' package.json)"
echo "Description: $(jq -r '.description' package.json)"
echo "Main file: $(jq -r '.main' package.json)"
echo "Module file: $(jq -r '.module' package.json)"

# Test dry-run publish
print_step "Testing dry-run publish..."
if npm publish --dry-run; then
    print_status "Dry-run publish successful"
else
    print_error "Dry-run publish failed"
    exit 1
fi

echo ""
print_status "✅ Framework is ready for publishing!"
echo ""
echo "📋 Publishing Checklist:"
echo "  - ✅ Dependencies installed"
echo "  - ✅ Build successful"
echo "  - ✅ Tests passing"
echo "  - ✅ Qwen integration verified"
echo "  - ✅ Package validation successful"
echo "  - ✅ Dry-run publish successful"
echo ""
echo "🚀 To publish, run: npm publish"
echo "🔍 For dry-run: npm publish --dry-run"
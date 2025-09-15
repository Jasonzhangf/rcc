#!/bin/bash

# RCC Pipeline Framework Test Script
# This script runs all tests for the pipeline framework

set -e  # Exit on any error

echo "🧪 Starting RCC Pipeline Framework Tests..."
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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build the project first
print_step "Building project..."
./build.sh

if [ $? -ne 0 ]; then
    print_error "Build failed, cannot run tests"
    exit 1
fi

# Run unit tests
print_step "Running unit tests..."
npm run test

if [ $? -ne 0 ]; then
    print_error "Unit tests failed"
    exit 1
fi

# Run tests with coverage
print_step "Running tests with coverage..."
npm run test:coverage

if [ $? -ne 0 ]; then
    print_error "Coverage tests failed"
    exit 1
fi

# Print coverage summary
if [ -f "coverage/coverage-summary.json" ]; then
    print_status "Coverage Summary:"
    cat coverage/coverage-summary.json | grep -E '"total":|"lines":|"statements":|"functions":|"branches":'
fi

# Run integration tests specifically
print_step "Running integration tests..."
npm run test -- --run integration

# Run Qwen-specific integration tests
print_step "Running Qwen implementation tests..."
npm run test -- --run qwen

echo ""
echo "🎉 All tests completed successfully!"
echo "📊 Test reports available in:"
echo "  - coverage/ (HTML coverage report)"
echo "  - test-results/ (Detailed test results)"
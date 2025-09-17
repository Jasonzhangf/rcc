#!/bin/bash

# RCC BaseModule Build Script
# This script builds the basemodule for npm publishing

set -e  # Exit on any error

echo "🔧 Starting RCC BaseModule build process..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the basemodule directory."
    exit 1
fi

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🧹 Cleaning previous build artifacts..."
npm run clean

echo "🔍 Running type checking..."
npm run typecheck

echo "🧪 Running tests..."
npm test

echo "📝 Running linting..."
npm run lint

echo "🎨 Running formatting check..."
npm run format:check

echo "🏗️  Building module..."
npm run build

echo "📊 Running test coverage..."
npm run test:coverage

echo "✅ Build completed successfully!"
echo "📂 Build artifacts available in: ./dist/"

# Display build summary
echo ""
echo "📋 Build Summary:"
echo "  - TypeScript compilation: ✅"
echo "  - Tests: ✅"
echo "  - Linting: ✅"
echo "  - Formatting: ✅"
echo "  - Build output: ✅"
echo "  - Test coverage: ✅"
echo ""
echo "🚀 Module is ready for publication!"
#!/bin/bash
# Independent publish script for rcc-bootstrap module

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to module directory
cd "$MODULE_DIR"

echo "📦 Publishing rcc-bootstrap module..."
echo "📍 Module directory: $MODULE_DIR"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $MODULE_DIR"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Build the module
echo "🔨 Building module..."
npm run build

# Check if dist directory exists and has files
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ Error: Build failed - dist directory is empty or doesn't exist"
    exit 1
fi

# Check if esm directory exists and has files
if [ ! -d "dist/esm" ] || [ -z "$(ls -A dist/esm)" ]; then
    echo "❌ Error: Build failed - dist/esm directory is empty or doesn't exist"
    exit 1
fi

echo "✅ Build successful!"

# Ask for confirmation before publishing
read -p "🚀 Do you want to publish version $CURRENT_VERSION to npm? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Publishing to npm..."
    npm publish
    echo "✅ Successfully published rcc-bootstrap@$CURRENT_VERSION!"
else
    echo "❌ Publish cancelled by user"
fi
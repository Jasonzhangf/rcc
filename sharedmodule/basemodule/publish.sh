#!/bin/bash

# RCC BaseModule Publish Script
# This script publishes the basemodule to npm

set -e  # Exit on any error

echo "🚀 Starting RCC BaseModule publish process..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the basemodule directory."
    exit 1
fi

# Check if user is logged in to npm
if ! npm whoami &> /dev/null; then
    echo "❌ Error: Not logged in to npm. Please run 'npm login' first."
    exit 1
fi

# Check if build.sh exists and run it
if [ -f "./build.sh" ]; then
    echo "🔧 Running build script..."
    chmod +x ./build.sh
    ./build.sh
else
    echo "❌ Error: build.sh not found. Please create the build script first."
    exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Build process may have failed."
    exit 1
fi

# Check package.json version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Ask for confirmation
read -p "🤔 Do you want to publish version $CURRENT_VERSION to npm? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Publish cancelled."
    exit 1
fi

# Run pre-publish validation
echo "🔍 Running pre-publish validation..."
npm run validate

# Check if package is already published
if npm view rcc-basemodule version &> /dev/null; then
    PUBLISHED_VERSION=$(npm view rcc-basemodule version)
    echo "📦 Published version: $PUBLISHED_VERSION"

    if [ "$CURRENT_VERSION" = "$PUBLISHED_VERSION" ]; then
        echo "⚠️  Warning: Version $CURRENT_VERSION is already published."
        read -p "🤔 Do you want to publish anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Publish cancelled."
            exit 1
        fi
    fi
fi

# Publish to npm
echo "🚀 Publishing to npm..."
npm publish --access public

echo "✅ Successfully published RCC BaseModule version $CURRENT_VERSION to npm!"
echo "🔗 Package URL: https://www.npmjs.com/package/rcc-basemodule"

# Optional: Push to git if configured
if git remote -v | grep -q "origin"; then
    read -p "🤔 Do you want to push changes to git? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Pushing to git..."
        git add -A
        git commit -m "Publish rcc-basemodule v$CURRENT_VERSION"
        git push
        git push --tags
        echo "✅ Changes pushed to git."
    fi
fi

echo "🎉 Publish process completed successfully!"
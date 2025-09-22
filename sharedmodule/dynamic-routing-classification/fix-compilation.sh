#!/bin/bash

# Fix compilation issues for Dynamic Routing Classification Module
echo "🔧 Fixing Dynamic Routing Classification Module compilation issues..."

# Change to the module directory
cd /Users/fanzhang/Documents/github/rcc/sharedmodule/dynamic-routing-classification

echo "📦 Installing dependencies..."
# Install the actual npm package instead of using local file
npm install

echo "🔍 Checking for type issues..."
# Run TypeScript type checking
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ Type checking successful!"
else
    echo "⚠️  Type checking failed, but continuing with build..."
fi

echo "🏗️  Building module..."
# Run the full build
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "🎉 Dynamic Routing Classification Module is now ready!"
else
    echo "❌ Build failed!"
    echo "💡 You may need to install rcc-basemodule globally:"
    echo "   npm install -g rcc-basemodule"
    exit 1
fi
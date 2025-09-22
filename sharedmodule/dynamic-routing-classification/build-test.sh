#!/bin/bash

# Build script for dynamic-routing-classification module
echo "Building Dynamic Routing Classification Module..."

# Change to module directory if needed
cd /Users/fanzhang/Documents/github/rcc/sharedmodule/dynamic-routing-classification

# Run TypeScript compilation
echo "Running TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

echo "Build completed successfully!"
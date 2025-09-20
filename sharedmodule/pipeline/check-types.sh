#!/bin/bash

# Run TypeScript compilation check to verify fixes
echo "🔍 Running TypeScript compilation check..."

cd /Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline

# Check if TypeScript is available
if command -v npx &> /dev/null; then
    npx tsc --noEmit
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript compilation successful - all errors fixed!"
    else
        echo "❌ TypeScript compilation failed - errors remain"
        exit 1
    fi
else
    echo "⚠️  npx not available, cannot run TypeScript check"
fi
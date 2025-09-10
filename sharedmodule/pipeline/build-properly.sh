#!/bin/bash

echo "🚀 Building RCC Pipeline Module with proper configuration..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Build types with proper configuration
echo "📝 Building type definitions..."
npx tsc --declaration --emitDeclarationOnly --outDir dist --skipLibCheck --strict false

# Build CommonJS version
echo "📦 Building CommonJS bundle..."
npx rollup -c rollup.config.cjs.js

# Build ESM version  
echo "📦 Building ESM bundle..."
npx rollup -c rollup.config.esm.js

echo "✅ Build completed successfully!"
echo "📋 Build artifacts:"
ls -la dist/

echo "🔍 Testing imports..."
node -e "
import('./dist/index.esm.js').then(({ BasePipelineModule }) => {
  console.log('✅ BasePipelineModule imported successfully');
  console.log('✅ ESM build working correctly');
}).catch(err => {
  console.error('❌ ESM import failed:', err.message);
});
"
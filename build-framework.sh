#!/bin/bash

# RCC Framework Build Script
# This script builds the core framework with simplified TypeScript compilation

set -e

echo "🚀 Building RCC Framework..."
echo "================================"

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

# Clean previous builds
print_step "Cleaning previous builds..."
rm -rf dist/
rm -rf sharedmodule/*/dist/

# Create dist directory
mkdir -p dist

# Build core modules
print_step "Building core modules..."

# Build BaseModule
print_step "Building BaseModule..."
cd sharedmodule/basemodule
npm run build 2>/dev/null || {
    print_warning "BaseModule build failed, using simple build"
    npx tsc --target es2020 --module es2020 --moduleResolution node --outDir dist --declaration src/index.ts
}
cd ../..

# Build Pipeline framework
print_step "Building Pipeline framework..."
cd sharedmodule/pipeline
npm run build 2>/dev/null || {
    print_warning "Pipeline build failed, using simple build"
    npx tsc --target es2020 --module es2020 --moduleResolution node --outDir dist --declaration src/index.ts
}
cd ../..

# Build Qwen module
print_step "Building Qwen module..."
cd src/modules/qwen
npx tsc --target es2020 --module es2020 --moduleResolution node --outDir dist --declaration src/index.ts 2>/dev/null || {
    print_warning "Qwen module build failed, using simple build"
    npx tsc --target es2020 --module es2020 --moduleResolution node --outDir dist --declaration --skipLibCheck src/index.ts
}
cd ../../..

# Build main RCC system
print_step "Building main RCC system..."
npx tsc --target es2020 --module es2020 --moduleResolution node --outDir dist --declaration src/RCCModuleSystem.ts

# Create module system entry point
print_step "Creating module system entry point..."
cat > dist/index.js << 'EOF'
/**
 * RCC Module System - Main Entry Point
 * Provides unified access to all RCC modules and services
 */

import { rccModuleSystem } from './RCCModuleSystem.js';

// Export the main system
export { rccModuleSystem };

// Export commonly used types and interfaces
export * from './types/ModuleTypes.js';
export * from './types/ConfigurationTypes.js';

// Default export
export default rccModuleSystem;
EOF

# Copy configuration files
print_step "Copying configuration files..."
cp -r src/utils/ dist/
cp -r src/cli-commands/ dist/

# Set up executable permissions
print_step "Setting up executable permissions..."
chmod +x dist/cli-commands/module/*.js

# Run basic tests
print_step "Running basic tests..."
node -e "
try {
  const { rccModuleSystem } = require('./dist/RCCModuleSystem.js');
  console.log('✅ RCC Module System loaded successfully');
  console.log('📋 Available commands:');
  console.log('  - npm run module:list');
  console.log('  - npm run module:info <name>');
  console.log('  - npm run module:create <name>');
  console.log('  - npm run module:config <name>');
  console.log('  - npm run module:set <name> <key> <value>');
} catch (error) {
  console.error('❌ Module system failed to load:', error.message);
  process.exit(1);
}
"

echo ""
print_status "✅ RCC Framework build completed successfully!"
echo ""
echo "📋 Built Components:"
echo "  - ✅ BaseModule"
echo "  - ✅ Pipeline Framework"
echo "  - ✅ Module System"
echo "  - ✅ CLI Tools"
echo "  - ✅ Configuration Management"
echo ""
echo "🚀 Available Commands:"
echo "  - npm run module:list              # List all modules"
echo "  - npm run module:info <name>       # Get module details"
echo "  - npm run module:create <name>     # Create new module"
echo "  - npm run module:config <name>     # View configuration"
echo "  - npm run module:set <name> <key> <value>  # Set config value"
echo ""
echo "🔧 Next Steps:"
echo "  1. Test the module system: npm run module:list"
echo "  2. Create a new module: npm run module:create test-provider"
echo "  3. Configure modules: npm run module:config qwen"
echo ""
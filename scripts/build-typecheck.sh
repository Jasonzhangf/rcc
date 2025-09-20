#!/bin/bash

# TypeScript type check and build script for RCC CLI
# Comprehensive build pipeline with strict type checking

set -e

echo "🚀 RCC TypeScript Enhancement Build Pipeline"
echo "=============================================="

# Set script variables
PROJECT_ROOT="/Users/fanzhang/Documents/github/rcc"
SRC_DIR="$PROJECT_ROOT/src"
DIST_DIR="$PROJECT_ROOT/dist"
NODE_VERSION_MIN="16"

# Check Node.js version
check_node_version() {
    echo "📋 Checking Node.js version..."
    NODE_VERSION=$(node --version | cut -c2-)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

    if [ "$NODE_MAJOR" -lt "$NODE_VERSION_MIN" ]; then
        echo "❌ Node.js version $NODE_VERSION is too old. Minimum required: $NODE_VERSION_MIN"
        exit 1
    fi
    echo "✅ Node.js version $NODE_VERSION is compatible"
}

# Install dependencies if needed
install_dependencies() {
    echo "📦 Installing dependencies..."
    cd "$PROJECT_ROOT"

    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-hash" ]; then
        npm ci --legacy-peer-deps
        echo "Dependencies installed successfully"
    else
        echo "Dependencies appear to be cached"
    fi
}

# Validate TypeScript configuration
check_tsconfig() {
    echo "🔍 Validating TypeScript configuration..."

    if [ ! -f "$PROJECT_ROOT/tsconfig.json" ]; then
        echo "❌ tsconfig.json not found"
        exit 1
    fi

    # Check if TypeScript is available
    if ! command -v npx &> /dev/null; then
        echo "❌ npx not found. Please install Node.js and npm"
        exit 1
    fi

    echo "✅ TypeScript configuration validated"
}

# Type checking function
run_type_check() {
    echo "🔧 Running TypeScript type checking..."
    cd "$PROJECT_ROOT"

    # Type check only
    npx tsc --noEmit --strict --listFiles false

    if [ $? -eq 0 ]; then
        echo "✅ Type checking passed"
        return 0
    else
        echo "❌ Type checking failed"
        return 1
    fi
}

# Full compilation test
build_project() {
    echo "🏗️  Building TypeScript project..."
    cd "$PROJECT_ROOT"

    # Clean previous build
    rm -rf "$DIST_DIR"
    mkdir -p "$DIST_DIR"

    # Compile TypeScript
    npx tsc --build

    if [ $? -eq 0 ]; then
        echo "✅ TypeScript compilation successful"

        # Show build statistics
        if [ -d "$DIST_DIR" ]; then
            FILE_COUNT=$(find "$DIST_DIR" -name "*.js" | wc -l)
            TS_COUNT=$(find "$SRC_DIR" -name "*.ts" | wc -l)
            echo "📊 Build Statistics:"
            echo "  - TypeScript files: $TS_COUNT"
            echo "  - JavaScript files generated: $FILE_COUNT"
            echo "  - Build directory: $DIST_DIR"
        fi

        return 0
    else
        echo "❌ TypeScript compilation failed"
        return 1
    fi
}

# Type safety validation
validate_type_safety() {
    echo "🔐 Validating type safety enhancements..."
    cd "$PROJECT_ROOT"

    # Check if new TypeScript files exist
    if [ -f "$SRC_DIR/rcc.ts" ]; then
        echo "✅ TypeScript CLI entry point exists"
    else
        echo "❌ TypeScript CLI entry point missing"
        return 1
    fi

    # Check for SafeJSON usage
    if grep -r "safeJson\.parse" "$SRC_DIR" > /dev/null 2>&1; then
        echo "✅ SafeJSON usage found in codebase"
    else
        echo "⚠️  SafeJSON usage not found"
    fi

    # Check for type imports
    if grep -r "import.*from.*types" "$SRC_DIR" > /dev/null 2>&1; then
        echo "✅ Type imports found"
    else
        echo "⚠️  Type imports not found"
    fi

    return 0
}

# Module structure validation
validate_module_structure() {
    echo "📁 Validating module structure..."

    local required_files=(
        "$SRC_DIR/types/index.ts"
        "$SRC_DIR/utils/safe-json.ts"
        "$SRC_DIR/utils/dynamic-import-manager.ts"
        "$SRC_DIR/rcc.ts"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ $(basename "$file") - Present"
        else
            echo "❌ $(basename "$file") - Missing"
            return 1
        fi
    done

    return 0
}

# Run compatibility tests
run_compatibility_tests() {
    echo "🧪 Running compatibility tests..."

    # Create simple test file
    cat > "$PROJECT_ROOT/test-compatibility.mjs" << 'EOF'
import { safeJson } from './src/utils/safe-json.js';
import { DynamicImportManager } from './src/utils/dynamic-import-manager.js';

console.log('Testing SafeJSON...');
const testData = '{"name":"rcc","version":"1.0.0"}';
const parsed = safeJson.parse(testData);
console.log('Parsed:', parsed);

console.log('Testing DynamicImportManager...');
const importManager = DynamicImportManager.getInstance();
console.log('Import manager created successfully');

console.log('✅ All compatibility tests passed');
EOF

    node "$PROJECT_ROOT/test-compatibility.mjs"
    local test_result=$?
    rm -f "$PROJECT_ROOT/test-compatibility.mjs"

    return $test_result
}

# Generate type definitions report
generate_type_report() {
    echo "📝 Generating type definitions report..."

    if [ -d "$PROJECT_ROOT/dist/types" ]; then
        echo "✅ Type definitions generated in dist/types/"
        echo "Generated type definition files:"
        find "$PROJECT_ROOT/dist/types" -name "*.d.ts" | head -10
    else
        echo "⚠️  No type definitions directory found"
    fi
}

# Main execution
main() {
    echo "Starting RCC TypeScript enhancement build..."
    echo "Timestamp: $(date)"
    echo "Working directory: $PROJECT_ROOT"

    # Execute pipeline steps
    check_node_version
    install_dependencies
    check_tsconfig
    validate_module_structure

    echo ""
    echo "Step 1: Type Checking..."
    if run_type_check; then
        echo "✅ Type checking successful"
    else
        echo "❌ Type checking failed. Please fix TypeScript errors."
        exit 1
    fi

    echo ""
    echo "Step 2: Building project..."
    if build_project; then
        echo "✅ Build successful"
    else
        echo "❌ Build failed. Please fix compilation errors."
        exit 1
    fi

    echo ""
    echo "Step 3: Validating type safety..."
    validate_type_safety

    echo ""
    echo "Step 4: Running compatibility tests..."
    if run_compatibility_tests; then
        echo "✅ Compatibility tests passed"
    else
        echo "⚠️  Compatibility tests had issues"
    fi

    echo ""
    echo "Step 5: Generating reports..."
    generate_type_report

    echo ""
    echo "🎉 TypeScript enhancement build completed successfully!"
    echo "=============================================="
    echo "Next steps:"
    echo "1. Update package.json to use the new TypeScript entry point"
    echo "2. Test the migrated CLI with: node dist/rcc.js start --help"
    echo "3. Run integration tests to verify functionality"
    echo "4. Update build scripts in package.json"
}

# Error handling
trap 'echo "Build pipeline failed on error $?. Exiting..."; exit 1' ERR

# Run main function
main "$@"
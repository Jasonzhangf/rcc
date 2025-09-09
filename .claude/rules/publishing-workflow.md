# RCC Publishing Workflow Automation

## Overview

This document defines the comprehensive automated workflow for publishing RCC modules as independent npm packages, including validation, testing, version management, and deployment processes.

## Publishing Workflow Architecture

### Workflow Stages
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Pre-Validation │───▶│   Build & Test  │───▶│   Packaging     │
│  • Code Quality │    │  • Unit Tests   │    │  • Version Mgmt │
│  • Dependencies │    │  • Integration  │    │  • Documentation│
│  • Security     │    │  • E2E Tests    │    │  • Bundle Prep  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Publishing    │    │  Post-Publish   │    │   Monitoring    │
│  • NPM Upload   │    │  • Verification │    │  • Usage Track  │
│  • Registry Upd │    │  • Notification │    │  • Issue Track  │
│  • CDN Refresh  │    │  • Doc Deploy   │    │  • Performance  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Automated Scripts and Tools

### 1. Pre-Publishing Validation Scripts

#### Module Validation Script
```bash
#!/bin/bash
# scripts/validate-module.sh

MODULE_NAME=$1
MODULE_PATH="packages/$MODULE_NAME"

if [ -z "$MODULE_NAME" ]; then
    echo "❌ Error: Module name required"
    echo "Usage: $0 <module-name>"
    exit 1
fi

echo "🔍 Validating module: $MODULE_NAME"

# Check module structure
echo "📁 Checking module structure..."
if ! npm run validate:structure -- --module "$MODULE_NAME"; then
    echo "❌ Module structure validation failed"
    exit 1
fi

# Validate dependencies
echo "🔗 Validating dependencies..."
if ! npm run validate:dependencies -- --module "$MODULE_NAME"; then
    echo "❌ Dependency validation failed"
    exit 1
fi

# Check for hardcoded values
echo "🚫 Checking for hardcoded values..."
if ! npm run validate:no-hardcoding -- --module "$MODULE_NAME"; then
    echo "❌ Hardcoded values detected"
    exit 1
fi

# Security scan
echo "🔒 Running security scan..."
if ! npm audit --prefix "$MODULE_PATH" --audit-level high; then
    echo "❌ Security vulnerabilities detected"
    exit 1
fi

# Type checking
echo "✅ Running TypeScript checks..."
if ! npx tsc --noEmit --project "$MODULE_PATH/tsconfig.json"; then
    echo "❌ TypeScript errors detected"
    exit 1
fi

# Linting
echo "🧹 Running ESLint..."
if ! npx eslint "$MODULE_PATH/src/**/*.ts"; then
    echo "❌ Linting errors detected"
    exit 1
fi

echo "✅ Module validation complete for $MODULE_NAME"
```

#### Comprehensive Test Runner
```bash
#!/bin/bash
# scripts/run-tests.sh

MODULE_NAME=$1
MODULE_PATH="packages/$MODULE_NAME"
TEST_TYPE=${2:-"all"}

echo "🧪 Running tests for module: $MODULE_NAME (type: $TEST_TYPE)"

# Set up test environment
export NODE_ENV=test
export RCC_TEST_MODE=true

# Function to run specific test type
run_test_suite() {
    local test_type=$1
    local coverage_threshold=$2
    
    echo "🏃 Running $test_type tests..."
    
    case $test_type in
        "unit")
            npm run test:unit --prefix "$MODULE_PATH" -- --coverage --coverageThreshold="$coverage_threshold"
            ;;
        "integration")
            npm run test:integration --prefix "$MODULE_PATH" -- --coverage --coverageThreshold="$coverage_threshold"
            ;;
        "e2e")
            npm run test:e2e --prefix "$MODULE_PATH" -- --testTimeout=60000
            ;;
        "performance")
            npm run test:performance --prefix "$MODULE_PATH"
            ;;
        "security")
            npm run test:security --prefix "$MODULE_PATH"
            ;;
    esac
    
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "❌ $test_type tests failed with exit code $exit_code"
        return $exit_code
    fi
    
    echo "✅ $test_type tests passed"
}

# Run tests based on type
case $TEST_TYPE in
    "unit")
        run_test_suite "unit" '{"branches":100,"functions":100,"lines":100,"statements":100}'
        ;;
    "integration")
        run_test_suite "integration" '{"branches":95,"functions":95,"lines":95,"statements":95}'
        ;;
    "e2e")
        run_test_suite "e2e" '{"branches":90,"functions":90,"lines":90,"statements":90}'
        ;;
    "performance")
        run_test_suite "performance"
        ;;
    "security")
        run_test_suite "security"
        ;;
    "all")
        run_test_suite "unit" '{"branches":100,"functions":100,"lines":100,"statements":100}' &&
        run_test_suite "integration" '{"branches":95,"functions":95,"lines":95,"statements":95}' &&
        run_test_suite "e2e" '{"branches":90,"functions":90,"lines":90,"statements":90}' &&
        run_test_suite "performance" &&
        run_test_suite "security"
        ;;
    *)
        echo "❌ Unknown test type: $TEST_TYPE"
        echo "Valid types: unit, integration, e2e, performance, security, all"
        exit 1
        ;;
esac

echo "✅ All $TEST_TYPE tests completed successfully for $MODULE_NAME"
```

### 2. Version Management Scripts

#### Automatic Version Bumping
```bash
#!/bin/bash
# scripts/bump-version.sh

MODULE_NAME=$1
BUMP_TYPE=${2:-"patch"}  # patch, minor, major
MODULE_PATH="packages/$MODULE_NAME"

echo "📈 Bumping version for module: $MODULE_NAME (type: $BUMP_TYPE)"

# Validate bump type
case $BUMP_TYPE in
    "patch"|"minor"|"major")
        ;;
    *)
        echo "❌ Invalid bump type: $BUMP_TYPE"
        echo "Valid types: patch, minor, major"
        exit 1
        ;;
esac

# Get current version
CURRENT_VERSION=$(node -p "require('./$MODULE_PATH/package.json').version")
echo "📊 Current version: $CURRENT_VERSION"

# Calculate new version
NEW_VERSION=$(npm version --prefix "$MODULE_PATH" $BUMP_TYPE --no-git-tag-version)
NEW_VERSION=${NEW_VERSION#v}  # Remove 'v' prefix
echo "📊 New version: $NEW_VERSION"

# Update dependencies in other modules if this is a shared package
if [[ "$MODULE_NAME" == "shared-types" || "$MODULE_NAME" == "base-module" ]]; then
    echo "🔗 Updating dependencies in dependent modules..."
    ./scripts/update-dependencies.sh "$MODULE_NAME" "$NEW_VERSION"
fi

# Generate changelog entry
echo "📝 Generating changelog entry..."
./scripts/generate-changelog.sh "$MODULE_NAME" "$CURRENT_VERSION" "$NEW_VERSION" "$BUMP_TYPE"

# Update documentation
echo "📚 Updating documentation..."
./scripts/update-docs.sh "$MODULE_NAME" "$NEW_VERSION"

echo "✅ Version bump complete: $MODULE_NAME@$NEW_VERSION"
```

#### Dependency Update Script
```bash
#!/bin/bash
# scripts/update-dependencies.sh

UPDATED_MODULE=$1
NEW_VERSION=$2

echo "🔗 Updating dependencies for $UPDATED_MODULE@$NEW_VERSION"

# Find all modules that depend on the updated module
for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")
    
    if [ "$module_name" = "$UPDATED_MODULE" ]; then
        continue
    fi
    
    package_json="$module_dir/package.json"
    
    if [ -f "$package_json" ]; then
        # Check if this module depends on the updated module
        if grep -q "@rcc/$UPDATED_MODULE" "$package_json"; then
            echo "📦 Updating dependency in $module_name"
            
            # Update the dependency version
            node -e "
                const fs = require('fs');
                const pkg = JSON.parse(fs.readFileSync('$package_json', 'utf8'));
                
                if (pkg.dependencies && pkg.dependencies['@rcc/$UPDATED_MODULE']) {
                    pkg.dependencies['@rcc/$UPDATED_MODULE'] = '^$NEW_VERSION';
                }
                
                if (pkg.devDependencies && pkg.devDependencies['@rcc/$UPDATED_MODULE']) {
                    pkg.devDependencies['@rcc/$UPDATED_MODULE'] = '^$NEW_VERSION';
                }
                
                if (pkg.peerDependencies && pkg.peerDependencies['@rcc/$UPDATED_MODULE']) {
                    pkg.peerDependencies['@rcc/$UPDATED_MODULE'] = '^$NEW_VERSION';
                }
                
                fs.writeFileSync('$package_json', JSON.stringify(pkg, null, 2) + '\n');
            "
            
            echo "✅ Updated $module_name dependency to @rcc/$UPDATED_MODULE@^$NEW_VERSION"
        fi
    fi
done

echo "✅ Dependency updates complete"
```

### 3. Build and Packaging Scripts

#### Module Build Script
```bash
#!/bin/bash
# scripts/build-module.sh

MODULE_NAME=$1
MODULE_PATH="packages/$MODULE_NAME"

echo "🔨 Building module: $MODULE_NAME"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$MODULE_PATH/dist"
mkdir -p "$MODULE_PATH/dist"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefix "$MODULE_PATH"

# Type checking
echo "✅ Running TypeScript compilation..."
npx tsc --project "$MODULE_PATH/tsconfig.json"

# Generate type declarations
echo "📋 Generating type declarations..."
npx tsc --project "$MODULE_PATH/tsconfig.json" --declaration --emitDeclarationOnly --outDir "$MODULE_PATH/types"

# Copy non-TypeScript files
echo "📂 Copying assets..."
find "$MODULE_PATH/src" -type f \( -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \) -exec cp {} "$MODULE_PATH/dist/" \;

# Generate documentation
echo "📚 Generating API documentation..."
npx typedoc --out "$MODULE_PATH/docs" "$MODULE_PATH/src" --readme "$MODULE_PATH/README.md"

# Create package bundle info
echo "📊 Generating bundle info..."
node -e "
const fs = require('fs');
const path = require('path');
const pkg = require('./$MODULE_PATH/package.json');

const bundleInfo = {
  name: pkg.name,
  version: pkg.version,
  buildDate: new Date().toISOString(),
  files: fs.readdirSync('$MODULE_PATH/dist').filter(f => f.endsWith('.js')),
  size: fs.readdirSync('$MODULE_PATH/dist')
    .filter(f => f.endsWith('.js'))
    .reduce((total, file) => {
      return total + fs.statSync(path.join('$MODULE_PATH/dist', file)).size;
    }, 0)
};

fs.writeFileSync('$MODULE_PATH/dist/bundle-info.json', JSON.stringify(bundleInfo, null, 2));
"

echo "✅ Build complete for $MODULE_NAME"
```

#### Package Preparation Script
```bash
#!/bin/bash
# scripts/prepare-package.sh

MODULE_NAME=$1
MODULE_PATH="packages/$MODULE_NAME"

echo "📦 Preparing package: $MODULE_NAME"

# Create .npmignore if it doesn't exist
if [ ! -f "$MODULE_PATH/.npmignore" ]; then
    echo "📋 Creating .npmignore..."
    cat > "$MODULE_PATH/.npmignore" << EOF
# Source files
src/
__test__/
__tests__/
*.test.ts
*.spec.ts

# Build files
tsconfig.json
tsconfig.*.json
*.tsbuildinfo

# Documentation source
docs/source/
*.md.template

# Development files
.git/
.github/
.vscode/
.idea/
*.log
coverage/
.nyc_output/

# OS files
.DS_Store
Thumbs.db

# Node modules (should use files field in package.json instead)
node_modules/
EOF
fi

# Validate package.json
echo "✅ Validating package.json..."
node -e "
const pkg = require('./$MODULE_PATH/package.json');

// Required fields
const required = ['name', 'version', 'description', 'main', 'types', 'files'];
const missing = required.filter(field => !pkg[field]);

if (missing.length > 0) {
    console.error('❌ Missing required fields:', missing.join(', '));
    process.exit(1);
}

// Validate files field
if (!pkg.files.includes('dist')) {
    console.error('❌ package.json files field must include \"dist\"');
    process.exit(1);
}

// Validate main and types fields
if (!pkg.main.startsWith('dist/')) {
    console.error('❌ package.json main field must point to dist/ directory');
    process.exit(1);
}

if (!pkg.types.startsWith('types/') && !pkg.types.startsWith('dist/')) {
    console.error('❌ package.json types field must point to types/ or dist/ directory');
    process.exit(1);
}

console.log('✅ package.json validation passed');
"

# Create README if it doesn't exist or update version references
echo "📚 Preparing README..."
if [ ! -f "$MODULE_PATH/README.md" ]; then
    ./scripts/generate-readme.sh "$MODULE_NAME"
else
    # Update version references in README
    CURRENT_VERSION=$(node -p "require('./$MODULE_PATH/package.json').version")
    sed -i.bak "s/@rcc\/$MODULE_NAME@[0-9]\+\.[0-9]\+\.[0-9]\+/@rcc\/$MODULE_NAME@$CURRENT_VERSION/g" "$MODULE_PATH/README.md"
    rm -f "$MODULE_PATH/README.md.bak"
fi

# Validate LICENSE file
if [ ! -f "$MODULE_PATH/LICENSE" ]; then
    echo "📄 Copying LICENSE file..."
    cp LICENSE "$MODULE_PATH/LICENSE"
fi

# Create CHANGELOG if it doesn't exist
if [ ! -f "$MODULE_PATH/CHANGELOG.md" ]; then
    echo "📝 Creating CHANGELOG..."
    echo "# Changelog" > "$MODULE_PATH/CHANGELOG.md"
    echo "" >> "$MODULE_PATH/CHANGELOG.md"
    echo "All notable changes to this project will be documented in this file." >> "$MODULE_PATH/CHANGELOG.md"
fi

echo "✅ Package preparation complete for $MODULE_NAME"
```

### 4. Publishing Scripts

#### Main Publishing Script
```bash
#!/bin/bash
# scripts/publish-module.sh

MODULE_NAME=$1
PUBLISH_TYPE=${2:-"stable"}  # beta, stable
MODULE_PATH="packages/$MODULE_NAME"

echo "🚀 Publishing module: $MODULE_NAME (type: $PUBLISH_TYPE)"

# Validate inputs
if [ -z "$MODULE_NAME" ]; then
    echo "❌ Error: Module name required"
    exit 1
fi

case $PUBLISH_TYPE in
    "beta"|"stable")
        ;;
    *)
        echo "❌ Invalid publish type: $PUBLISH_TYPE"
        echo "Valid types: beta, stable"
        exit 1
        ;;
esac

# Pre-publishing checks
echo "🔍 Running pre-publishing checks..."
if ! ./scripts/validate-module.sh "$MODULE_NAME"; then
    echo "❌ Module validation failed"
    exit 1
fi

if ! ./scripts/run-tests.sh "$MODULE_NAME" "all"; then
    echo "❌ Tests failed"
    exit 1
fi

# Build the module
echo "🔨 Building module..."
if ! ./scripts/build-module.sh "$MODULE_NAME"; then
    echo "❌ Build failed"
    exit 1
fi

# Prepare package
echo "📦 Preparing package..."
if ! ./scripts/prepare-package.sh "$MODULE_NAME"; then
    echo "❌ Package preparation failed"
    exit 1
fi

# Dry run
echo "🧪 Running publish dry run..."
if ! npm publish --dry-run --prefix "$MODULE_PATH"; then
    echo "❌ Dry run failed"
    exit 1
fi

# Set npm tag based on publish type
NPM_TAG="latest"
if [ "$PUBLISH_TYPE" = "beta" ]; then
    NPM_TAG="beta"
fi

# Actual publishing
echo "📤 Publishing to npm (tag: $NPM_TAG)..."
if [ "$PUBLISH_TYPE" = "beta" ]; then
    npm publish --tag beta --prefix "$MODULE_PATH"
else
    npm publish --prefix "$MODULE_PATH"
fi

PUBLISH_EXIT_CODE=$?

if [ $PUBLISH_EXIT_CODE -eq 0 ]; then
    echo "✅ Successfully published $MODULE_NAME"
    
    # Post-publishing tasks
    ./scripts/post-publish.sh "$MODULE_NAME" "$PUBLISH_TYPE"
else
    echo "❌ Publishing failed with exit code $PUBLISH_EXIT_CODE"
    exit $PUBLISH_EXIT_CODE
fi
```

#### Post-Publishing Tasks
```bash
#!/bin/bash
# scripts/post-publish.sh

MODULE_NAME=$1
PUBLISH_TYPE=$2
MODULE_PATH="packages/$MODULE_NAME"

echo "🎉 Running post-publishing tasks for $MODULE_NAME"

# Get published version
PUBLISHED_VERSION=$(node -p "require('./$MODULE_PATH/package.json').version")

# Update module registry
echo "📋 Updating module registry..."
./scripts/update-module-registry.sh "$MODULE_NAME" "$PUBLISHED_VERSION" "$PUBLISH_TYPE"

# Generate and deploy documentation
echo "📚 Deploying documentation..."
./scripts/deploy-docs.sh "$MODULE_NAME" "$PUBLISHED_VERSION"

# Create git tag for stable releases
if [ "$PUBLISH_TYPE" = "stable" ]; then
    echo "🏷️ Creating git tag..."
    git tag -a "$MODULE_NAME@$PUBLISHED_VERSION" -m "Release $MODULE_NAME@$PUBLISHED_VERSION"
    git push origin "$MODULE_NAME@$PUBLISHED_VERSION"
fi

# Send notifications
echo "📢 Sending notifications..."
./scripts/send-notifications.sh "$MODULE_NAME" "$PUBLISHED_VERSION" "$PUBLISH_TYPE"

# Verify publication
echo "🔍 Verifying publication..."
sleep 30  # Wait for npm registry propagation
if npm view "@rcc/$MODULE_NAME@$PUBLISHED_VERSION" version > /dev/null 2>&1; then
    echo "✅ Publication verified on npm registry"
else
    echo "⚠️ Warning: Could not verify publication on npm registry"
fi

# Update compatibility matrix
echo "🔗 Updating compatibility matrix..."
./scripts/update-compatibility-matrix.sh "$MODULE_NAME" "$PUBLISHED_VERSION"

echo "✅ Post-publishing tasks complete for $MODULE_NAME@$PUBLISHED_VERSION"
```

### 5. Automation Tools

#### Module Registry Update Script
```bash
#!/bin/bash
# scripts/update-module-registry.sh

MODULE_NAME=$1
VERSION=$2
PUBLISH_TYPE=$3

echo "📋 Updating module registry for $MODULE_NAME@$VERSION"

# Read current package.json for metadata
MODULE_PATH="packages/$MODULE_NAME"
PACKAGE_JSON="$MODULE_PATH/package.json"

# Extract module information
MODULE_INFO=$(node -e "
const pkg = require('./$PACKAGE_JSON');
const moduleInfo = {
    name: pkg.name.replace('@rcc/', ''),
    npmPackage: pkg.name,
    version: pkg.version,
    description: pkg.description,
    interfaces: [], // TODO: Extract from TypeScript files
    dependencies: Object.keys(pkg.dependencies || {}),
    lastUpdated: new Date().toISOString(),
    publishType: '$PUBLISH_TYPE'
};

console.log(JSON.stringify(moduleInfo, null, 2));
")

# Update registry file
REGISTRY_FILE=".claude/registry/module-registry.json"

if [ ! -f "$REGISTRY_FILE" ]; then
    echo '{"modules":[]}' > "$REGISTRY_FILE"
fi

# Add or update module entry
node -e "
const fs = require('fs');
const registry = JSON.parse(fs.readFileSync('$REGISTRY_FILE', 'utf8'));
const moduleInfo = $MODULE_INFO;

// Find existing entry or create new one
const existingIndex = registry.modules.findIndex(m => m.name === moduleInfo.name);

if (existingIndex >= 0) {
    registry.modules[existingIndex] = moduleInfo;
} else {
    registry.modules.push(moduleInfo);
}

// Sort modules alphabetically
registry.modules.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync('$REGISTRY_FILE', JSON.stringify(registry, null, 2) + '\n');
"

echo "✅ Module registry updated for $MODULE_NAME@$VERSION"
```

#### Notification Script
```bash
#!/bin/bash
# scripts/send-notifications.sh

MODULE_NAME=$1
VERSION=$2
PUBLISH_TYPE=$3

echo "📢 Sending notifications for $MODULE_NAME@$VERSION"

# Slack notification (if configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    EMOJI="🚀"
    COLOR="good"
    
    if [ "$PUBLISH_TYPE" = "beta" ]; then
        EMOJI="🧪"
        COLOR="warning"
    fi
    
    MESSAGE="$EMOJI *$MODULE_NAME@$VERSION* has been published to npm as a $PUBLISH_TYPE release"
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$MESSAGE\",\"color\":\"$COLOR\"}" \
        "$SLACK_WEBHOOK_URL"
fi

# Discord notification (if configured)
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    MESSAGE="🚀 **$MODULE_NAME@$VERSION** has been published to npm as a $PUBLISH_TYPE release"
    
    curl -H "Content-Type: application/json" \
        -d "{\"content\":\"$MESSAGE\"}" \
        "$DISCORD_WEBHOOK_URL"
fi

# Email notification (if configured)
if [ -n "$EMAIL_RECIPIENTS" ]; then
    SUBJECT="RCC Module Published: $MODULE_NAME@$VERSION"
    BODY="The RCC module $MODULE_NAME has been successfully published to npm at version $VERSION as a $PUBLISH_TYPE release.

View on npm: https://www.npmjs.com/package/@rcc/$MODULE_NAME
Documentation: https://docs.rcc.dev/$MODULE_NAME

This is an automated notification from the RCC publishing system."

    echo "$BODY" | mail -s "$SUBJECT" "$EMAIL_RECIPIENTS"
fi

echo "✅ Notifications sent for $MODULE_NAME@$VERSION"
```

### 6. CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/publish-modules.yml
name: Publish RCC Modules

on:
  push:
    branches: [main]
    paths: ['packages/**']
  workflow_dispatch:
    inputs:
      module:
        description: 'Module to publish (all, or specific module name)'
        required: true
        default: 'all'
      publish_type:
        description: 'Publish type'
        required: true
        default: 'beta'
        type: choice
        options:
          - beta
          - stable

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed-modules: ${{ steps.changes.outputs.changed-modules }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Detect changed modules
        id: changes
        run: |
          if [ "${{ github.event.inputs.module }}" = "all" ] || [ -z "${{ github.event.inputs.module }}" ]; then
            # Detect changed modules
            CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
            CHANGED_MODULES=$(echo "$CHANGED_FILES" | grep '^packages/' | cut -d'/' -f2 | sort -u | tr '\n' ',' | sed 's/,$//')
          else
            CHANGED_MODULES="${{ github.event.inputs.module }}"
          fi
          
          echo "changed-modules=$CHANGED_MODULES" >> $GITHUB_OUTPUT
          echo "Changed modules: $CHANGED_MODULES"

  publish:
    needs: detect-changes
    runs-on: ubuntu-latest
    if: needs.detect-changes.outputs.changed-modules != ''
    strategy:
      matrix:
        module: ${{ fromJson(format('["{0}"]', needs.detect-changes.outputs.changed-modules)) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate module
        run: ./scripts/validate-module.sh ${{ matrix.module }}
      
      - name: Run tests
        run: ./scripts/run-tests.sh ${{ matrix.module }} all
      
      - name: Build module
        run: ./scripts/build-module.sh ${{ matrix.module }}
      
      - name: Publish module
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
          EMAIL_RECIPIENTS: ${{ secrets.EMAIL_RECIPIENTS }}
        run: |
          PUBLISH_TYPE="${{ github.event.inputs.publish_type || 'beta' }}"
          ./scripts/publish-module.sh ${{ matrix.module }} $PUBLISH_TYPE
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.module }}-build
          path: packages/${{ matrix.module }}/dist/
```

### 7. Quality Assurance Integration

#### Pre-Publish Quality Gate
```bash
#!/bin/bash
# scripts/quality-gate.sh

MODULE_NAME=$1
MODULE_PATH="packages/$MODULE_NAME"

echo "🔍 Running quality gate checks for $MODULE_NAME"

# Initialize quality gate results
QUALITY_RESULTS=()
QUALITY_SCORE=0
MAX_SCORE=100

# Code Quality Checks (30 points)
echo "📊 Code Quality Checks..."
if npm run lint --prefix "$MODULE_PATH" --silent; then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ Linting: PASS")
else
    QUALITY_RESULTS+=("❌ Linting: FAIL")
fi

if npx tsc --noEmit --project "$MODULE_PATH/tsconfig.json" --strict; then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ Type Checking: PASS")
else
    QUALITY_RESULTS+=("❌ Type Checking: FAIL")
fi

if npm audit --prefix "$MODULE_PATH" --audit-level high --silent; then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ Security Audit: PASS")
else
    QUALITY_RESULTS+=("❌ Security Audit: FAIL")
fi

# Test Coverage (40 points)
echo "🧪 Test Coverage Checks..."
COVERAGE_REPORT=$(npm run test:coverage --prefix "$MODULE_PATH" --silent 2>&1)

# Extract coverage percentages
LINES_COVERAGE=$(echo "$COVERAGE_REPORT" | grep -o 'Lines.*: [0-9.]*%' | grep -o '[0-9.]*%' | head -1 | sed 's/%//')
FUNCTIONS_COVERAGE=$(echo "$COVERAGE_REPORT" | grep -o 'Functions.*: [0-9.]*%' | grep -o '[0-9.]*%' | head -1 | sed 's/%//')
BRANCHES_COVERAGE=$(echo "$COVERAGE_REPORT" | grep -o 'Branches.*: [0-9.]*%' | grep -o '[0-9.]*%' | head -1 | sed 's/%//')

if (( $(echo "$LINES_COVERAGE >= 95" | bc -l) )); then
    QUALITY_SCORE=$((QUALITY_SCORE + 15))
    QUALITY_RESULTS+=("✅ Lines Coverage: ${LINES_COVERAGE}%")
else
    QUALITY_RESULTS+=("❌ Lines Coverage: ${LINES_COVERAGE}% (Required: 95%)")
fi

if (( $(echo "$FUNCTIONS_COVERAGE >= 95" | bc -l) )); then
    QUALITY_SCORE=$((QUALITY_SCORE + 15))
    QUALITY_RESULTS+=("✅ Functions Coverage: ${FUNCTIONS_COVERAGE}%")
else
    QUALITY_RESULTS+=("❌ Functions Coverage: ${FUNCTIONS_COVERAGE}% (Required: 95%)")
fi

if (( $(echo "$BRANCHES_COVERAGE >= 90" | bc -l) )); then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ Branches Coverage: ${BRANCHES_COVERAGE}%")
else
    QUALITY_RESULTS+=("❌ Branches Coverage: ${BRANCHES_COVERAGE}% (Required: 90%)")
fi

# Documentation (20 points)
echo "📚 Documentation Checks..."
if [ -f "$MODULE_PATH/README.md" ] && [ -s "$MODULE_PATH/README.md" ]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ README: PRESENT")
else
    QUALITY_RESULTS+=("❌ README: MISSING")
fi

if [ -f "$MODULE_PATH/CHANGELOG.md" ]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 5))
    QUALITY_RESULTS+=("✅ CHANGELOG: PRESENT")
else
    QUALITY_RESULTS+=("❌ CHANGELOG: MISSING")
fi

if [ -d "$MODULE_PATH/docs" ] && [ "$(ls -A $MODULE_PATH/docs)" ]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 5))
    QUALITY_RESULTS+=("✅ API Documentation: PRESENT")
else
    QUALITY_RESULTS+=("❌ API Documentation: MISSING")
fi

# Performance (10 points)
echo "⚡ Performance Checks..."
if npm run test:performance --prefix "$MODULE_PATH" --silent; then
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
    QUALITY_RESULTS+=("✅ Performance Tests: PASS")
else
    QUALITY_RESULTS+=("❌ Performance Tests: FAIL")
fi

# Display results
echo ""
echo "📊 Quality Gate Results for $MODULE_NAME"
echo "========================================="
printf "%s\n" "${QUALITY_RESULTS[@]}"
echo "========================================="
echo "🎯 Quality Score: $QUALITY_SCORE/$MAX_SCORE"

# Quality gate threshold
QUALITY_THRESHOLD=85

if [ $QUALITY_SCORE -ge $QUALITY_THRESHOLD ]; then
    echo "✅ Quality gate PASSED ($QUALITY_SCORE >= $QUALITY_THRESHOLD)"
    exit 0
else
    echo "❌ Quality gate FAILED ($QUALITY_SCORE < $QUALITY_THRESHOLD)"
    exit 1
fi
```

This comprehensive publishing workflow automation ensures that RCC modules are published with consistent quality, proper versioning, and complete validation at every stage of the process.
#!/bin/bash

# @rcc/configuration - Automated Publishing Script
# This script handles validation, building, and publishing of the configuration package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[PUBLISH]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Parse arguments
VERSION_TYPE=${1:-"patch"}
DRY_RUN=${2:-false}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    error "Invalid version type. Use: patch, minor, or major"
fi

log "Starting publish process for @rcc/configuration"
log "Version type: $VERSION_TYPE"
log "Dry run: $DRY_RUN"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Make sure you're in the package root directory."
fi

# Check if package name is correct
PACKAGE_NAME=$(node -p "require('./package.json').name")
if [ "$PACKAGE_NAME" != "@rcc/configuration" ]; then
    error "Wrong package. Expected @rcc/configuration, got $PACKAGE_NAME"
fi

# Pre-flight checks
log "Running pre-flight checks..."

# Check Node version
NODE_VERSION=$(node --version)
log "Node version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
log "npm version: $NPM_VERSION"

# Check if npm is logged in
if ! npm whoami > /dev/null 2>&1; then
    error "Not logged in to npm. Run 'npm login' first."
fi

NPM_USER=$(npm whoami)
success "Logged in as: $NPM_USER"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    warning "Working directory is not clean. Uncommitted changes detected."
    if [ "$DRY_RUN" == "false" ]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborting due to uncommitted changes."
        fi
    fi
fi

# Validation phase
log "🔍 Running validation checks..."

# TypeScript type checking
log "Checking TypeScript types..."
npm run typecheck || error "TypeScript type checking failed"
success "TypeScript types are valid"

# Linting
log "Running linter..."
npm run lint || error "Linting failed"
success "Code passes linting"

# Unit tests
log "Running unit tests..."
npm run test:unit || error "Unit tests failed"
success "Unit tests passed"

# Integration tests
log "Running integration tests..."
npm run test:integration || error "Integration tests failed"
success "Integration tests passed"

# Test coverage check
log "Checking test coverage..."
npm run test:coverage || error "Coverage requirements not met"
success "Coverage requirements satisfied"

# Build phase
log "🏗️ Building package..."

# Clean previous build
log "Cleaning previous build..."
npm run clean || error "Clean failed"

# Build all formats
log "Building all formats..."
npm run build || error "Build failed"
success "Build completed successfully"

# Verify build output
if [ ! -f "dist/index.js" ] || [ ! -f "dist/index.d.ts" ]; then
    error "Build output incomplete. Missing required files."
fi
success "Build output verified"

# Package validation
log "📦 Validating package..."

# Check package.json validity
log "Validating package.json..."
npm run validate || error "Package validation failed"
success "Package validation passed"

# Check files to be published
log "Checking files to be published..."
FILES_COUNT=$(npm pack --dry-run 2>&1 | grep -c "index\|README\|CHANGELOG" || true)
if [ "$FILES_COUNT" -lt 3 ]; then
    error "Package doesn't include required files"
fi
success "Package files validated"

# Version management
log "📈 Managing version..."

CURRENT_VERSION=$(node -p "require('./package.json').version")
log "Current version: $CURRENT_VERSION"

if [ "$DRY_RUN" == "false" ]; then
    # Update version
    log "Updating version ($VERSION_TYPE)..."
    NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
    success "Version updated to: $NEW_VERSION"
    
    # Update CHANGELOG
    if [ -f "CHANGELOG.md" ]; then
        log "Updating CHANGELOG.md..."
        DATE=$(date +"%Y-%m-%d")
        sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md
        rm CHANGELOG.md.bak
        success "CHANGELOG.md updated"
    fi
else
    NEW_VERSION="$CURRENT_VERSION-dry-run"
    log "Dry run - would update to version: $VERSION_TYPE"
fi

# Publishing phase
log "🚀 Publishing package..."

if [ "$DRY_RUN" == "true" ]; then
    log "Dry run - simulating publish..."
    npm pack
    success "Dry run completed. Package would be published successfully."
    log "Package size: $(ls -lh *.tgz | awk '{print $5}')"
    rm -f *.tgz
else
    # Actual publish
    log "Publishing to npm..."
    npm publish --access public || error "Publishing failed"
    success "Package published successfully!"
    
    # Create git tag
    log "Creating git tag..."
    git add package.json CHANGELOG.md
    git commit -m "Release $NEW_VERSION"
    git tag "$NEW_VERSION"
    
    # Push to repository
    log "Pushing to repository..."
    git push origin main
    git push origin "$NEW_VERSION"
    
    success "Git tags created and pushed"
fi

# Post-publish tasks
log "📊 Post-publish tasks..."

# Generate documentation
log "Generating documentation..."
npm run docs:generate || warning "Documentation generation failed"

if [ "$DRY_RUN" == "false" ]; then
    # Verify publication
    log "Verifying publication..."
    sleep 10 # Wait for npm to propagate
    
    PUBLISHED_VERSION=$(npm view @rcc/configuration version)
    if [ "$PUBLISHED_VERSION" == "${NEW_VERSION#v}" ]; then
        success "Publication verified on npm registry"
    else
        warning "Publication verification failed. Check npm registry manually."
    fi
    
    # Success notification
    log "🎉 Package @rcc/configuration@$NEW_VERSION published successfully!"
    log "📦 npm: https://www.npmjs.com/package/@rcc/configuration"
    log "🔗 Repository: https://github.com/rcc/rcc-configuration"
    
    # Usage instructions
    log "📋 Installation instructions for users:"
    log "   npm install @rcc/configuration@$NEW_VERSION"
fi

success "Publishing process completed!"
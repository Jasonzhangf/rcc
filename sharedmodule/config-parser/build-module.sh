#!/bin/bash
# Script to build config-parser module from its own directory
cd "$(dirname "$0")"
echo "Current directory: $(pwd)"

# Update dependencies first
echo "Updating dependencies..."
npm install --legacy-peer-deps

# Run typecheck
echo "Running TypeScript type checking..."
npm run typecheck

# Build the module
echo "Building config-parser module..."
npm run build

echo "Build completed successfully!"
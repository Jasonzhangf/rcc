#!/bin/bash

cd /Users/fanzhang/Documents/github/rcc/sharedmodule/Configuration

echo "Testing TypeScript compilation..."

# Run TypeScript compiler with no emit to check for errors
./node_modules/.bin/tsc --noEmit 2>&1

echo "Compilation test completed."
#!/bin/bash

# RCC Pipeline Framework Simple Qwen Integration Test Script
# This script tests the basic JavaScript implementation with Qwen configuration

set -e  # Exit on any error

echo "🔥 Starting RCC Pipeline Framework Simple Qwen Integration Tests..."
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_qwen() {
    echo -e "${PURPLE}[QWEN]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Build the simple version
print_step "Building simple JavaScript version..."
npx rollup -c rollup-simple.config.js

if [ $? -ne 0 ]; then
    print_error "Simple build failed, cannot run Qwen integration tests"
    exit 1
fi

# Create a simple Qwen test configuration
print_step "Creating Qwen test configuration..."
cat > qwen-simple-test-config.json << 'EOF'
{
  "id": "qwen-simple-test",
  "name": "Qwen Simple Test",
  "version": "1.0.0",
  "description": "Simple test pipeline with Qwen configuration",
  "scheduler": {
    "strategy": "round-robin",
    "healthCheckInterval": 30000
  },
  "errorHandler": {
    "maxRetryAttempts": 3,
    "blacklistDuration": 300000
  }
}
EOF

# Test basic Qwen pipeline configuration loading
print_qwen "Testing basic Qwen configuration loading..."
node -e "
import { PipelineScheduler } from './dist/index.esm.js';
import { readFileSync } from 'fs';

async function testQwenConfig() {
    try {
        const config = JSON.parse(readFileSync('./qwen-simple-test-config.json', 'utf8'));
        
        console.log('Creating PipelineScheduler with Qwen config...');
        const scheduler = new PipelineScheduler(config);
        
        console.log('Initializing scheduler...');
        await scheduler.initialize();
        
        console.log('Testing basic execution...');
        const result = await scheduler.execute('qwen-test', {
            messages: [{ role: 'user', content: 'Hello, Qwen!' }],
            temperature: 0.7,
            max_tokens: 100
        });
        
        console.log('✅ Qwen configuration test successful');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ Qwen configuration test failed:', error.message);
        process.exit(1);
    }
}

testQwenConfig().catch(console.error);
"

if [ $? -ne 0 ]; then
    print_error "Qwen configuration test failed"
    exit 1
fi

# Test Qwen error handling scenarios
print_qwen "Testing Qwen error handling..."
node -e "
import { PipelineScheduler, ErrorHandlerCenter } from './dist/index.esm.js';

async function testQwenErrorHandling() {
    try {
        const errorHandler = new ErrorHandlerCenter({});
        await errorHandler.initialize();
        
        const scheduler = new PipelineScheduler({
            errorHandler: errorHandler,
            scheduler: { strategy: 'round-robin' }
        });
        
        await scheduler.initialize();
        
        // Test error handling with simulated Qwen error
        const qwenError = {
            code: 'QWEN_AUTHORIZATION_FAILED',
            message: 'Qwen authorization failed - invalid API key',
            category: 'authentication',
            severity: 'high',
            recoverability: 'recoverable',
            impact: 'single_module',
            source: 'qwen-provider',
            timestamp: Date.now()
        };
        
        const context = {
            executionId: 'test-execution-id',
            pipelineId: 'qwen-test-pipeline',
            instanceId: 'qwen-instance-1',
            startTime: Date.now(),
            payload: { test: 'data' },
            retryCount: 0,
            maxRetries: 3
        };
        
        const errorResult = await errorHandler.handleError(qwenError, context);
        console.log('✅ Qwen error handling test successful');
        console.log('Error action:', errorResult);
        
    } catch (error) {
        console.error('❌ Qwen error handling test failed:', error.message);
        process.exit(1);
    }
}

testQwenErrorHandling().catch(console.error);
"

if [ $? -ne 0 ]; then
    print_error "Qwen error handling test failed"
    exit 1
fi

# Test Qwen pipeline instance creation
print_qwen "Testing Qwen pipeline instance creation..."
node -e "
import { PipelineInstance } from './dist/index.esm.js';

async function testQwenInstance() {
    try {
        const qwenInstanceConfig = {
            id: 'qwen-instance-test',
            provider: 'qwen',
            model: 'qwen-turbo',
            endpoint: 'https://dashscope.aliyuncs.com',
            auth: {
                type: 'api_key',
                apiKey: 'test-api-key'
            },
            qwenConfig: {
                apiVersion: '2023-11-15',
                workspaceId: 'test-workspace',
                appId: 'test-app'
            }
        };
        
        console.log('Creating Qwen pipeline instance...');
        const instance = new PipelineInstance(qwenInstanceConfig);
        
        console.log('Initializing instance...');
        await instance.initialize();
        
        console.log('Testing instance execution...');
        const result = await instance.execute({
            messages: [{ role: 'user', content: 'Test message from Qwen instance' }]
        });
        
        console.log('✅ Qwen pipeline instance test successful');
        console.log('Instance result:', result);
        
    } catch (error) {
        console.error('❌ Qwen pipeline instance test failed:', error.message);
        process.exit(1);
    }
}

testQwenInstance().catch(console.error);
"

if [ $? -ne 0 ]; then
    print_error "Qwen pipeline instance test failed"
    exit 1
fi

# Cleanup
print_step "Cleaning up test files..."
rm -f qwen-simple-test-config.json

echo ""
print_qwen "✅ All simple Qwen integration tests completed successfully!"
print_status "Basic Qwen provider integration is working"
echo ""
echo "📊 Test Summary:"
echo "  - ✅ Qwen configuration loading"
echo "  - ✅ Qwen error handling"
echo "  - ✅ Qwen pipeline instance creation"
echo "  - ✅ Basic Qwen integration functionality"
#!/usr/bin/env node

/**
 * Basic functionality test for RCC Pipeline Framework
 * Tests the core components with the simplified JavaScript implementation
 */

import { PipelineScheduler, ErrorHandlerCenter, PipelineInstance } from './dist/index.js';

console.log('🧪 Testing RCC Pipeline Framework...');
console.log('=====================================');

async function runTests() {
    let passedTests = 0;
    let totalTests = 0;

    // Test 1: PipelineScheduler
    totalTests++;
    console.log('\n📋 Test 1: PipelineScheduler');
    try {
        const scheduler = new PipelineScheduler({
            maxConcurrent: 5,
            timeout: 30000
        });

        await scheduler.initialize();
        console.log('✅ PipelineScheduler initialized successfully');

        const result = await scheduler.execute('test-pipeline', { test: 'data' });
        console.log('✅ PipelineScheduler executed successfully:', result);
        passedTests++;
    } catch (error) {
        console.error('❌ PipelineScheduler test failed:', error.message);
    }

    // Test 2: ErrorHandlerCenter
    totalTests++;
    console.log('\n📋 Test 2: ErrorHandlerCenter');
    try {
        const errorHandler = new ErrorHandlerCenter();
        await errorHandler.initialize();
        console.log('✅ ErrorHandlerCenter initialized successfully');

        const errorResult = await errorHandler.handleError(
            new Error('Test error'),
            { pipeline: 'test-pipeline' }
        );
        console.log('✅ ErrorHandlerCenter handled error successfully:', errorResult);
        passedTests++;
    } catch (error) {
        console.error('❌ ErrorHandlerCenter test failed:', error.message);
    }

    // Test 3: PipelineInstance
    totalTests++;
    console.log('\n📋 Test 3: PipelineInstance');
    try {
        const instance = new PipelineInstance({
            name: 'test-instance',
            config: {}
        });

        await instance.initialize();
        console.log('✅ PipelineInstance initialized successfully');

        const result = await instance.execute({ test: 'payload' });
        console.log('✅ PipelineInstance executed successfully:', result);
        passedTests++;
    } catch (error) {
        console.error('❌ PipelineInstance test failed:', error.message);
    }

    // Test 4: Integration
    totalTests++;
    console.log('\n📋 Test 4: Integration Test');
    try {
        const errorHandler = new ErrorHandlerCenter();
        const scheduler = new PipelineScheduler({ errorHandler });

        await scheduler.initialize();
        await errorHandler.initialize();

        const result = await scheduler.execute('integration-test', { data: 'test' });
        console.log('✅ Integration test passed:', result);
        passedTests++;
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    }

    // Results
    console.log('\n🎯 Test Results:');
    console.log('================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Framework is working correctly.');
        return true;
    } else {
        console.log('\n⚠️  Some tests failed. Check the implementation.');
        return false;
    }
}

// Run tests
runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
});
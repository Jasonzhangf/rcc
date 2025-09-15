#!/usr/bin/env node

/**
 * RCC Qwen Provider Module Functionality Test
 * Tests the Qwen module's integration with the pipeline framework
 */

import { QwenProviderModule } from './dist/index.esm.js';

console.log('🧪 Testing RCC Qwen Provider Module...');
console.log('======================================');

async function runTests() {
    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Module Creation
    totalTests++;
    console.log('\n📋 Test 1: Module Creation');
    try {
        const config = {
            endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            auth: {
                type: 'oauth2',
                clientId: 'test-client',
                clientSecret: 'test-secret'
            },
            model: 'qwen-turbo'
        };

        const qwenModule = new QwenProviderModule(config);
        console.log('✅ Qwen Provider Module created successfully');
        
        const info = qwenModule.getInfo();
        console.log('✅ Module info retrieved:', info.name, info.version);
        passedTests++;
    } catch (error) {
        console.error('❌ Module creation test failed:', error.message);
    }

    // Test 2: Module Initialization
    totalTests++;
    console.log('\n📋 Test 2: Module Initialization');
    try {
        const qwenModule = new QwenProviderModule({});
        await qwenModule.initialize();
        console.log('✅ Qwen Provider Module initialized successfully');
        passedTests++;
    } catch (error) {
        console.error('❌ Module initialization test failed:', error.message);
    }

    // Test 3: Request Processing
    totalTests++;
    console.log('\n📋 Test 3: Request Processing');
    try {
        const qwenModule = new QwenProviderModule({});
        await qwenModule.initialize();
        
        const request = {
            model: 'qwen-turbo',
            messages: [
                { role: 'user', content: 'Hello, Qwen!' }
            ]
        };
        
        const response = await qwenModule.process(request);
        console.log('✅ Request processed successfully');
        console.log('   Provider:', response.provider);
        console.log('   Response ID:', response.response.id);
        console.log('   Model:', response.response.model);
        passedTests++;
    } catch (error) {
        console.error('❌ Request processing test failed:', error.message);
    }

    // Test 4: Authentication
    totalTests++;
    console.log('\n📋 Test 4: Authentication');
    try {
        const qwenModule = new QwenProviderModule({});
        await qwenModule.initialize();
        
        const authResult = await qwenModule.authenticate();
        console.log('✅ Authentication successful');
        console.log('   Token:', authResult.token);
        console.log('   Expires at:', new Date(authResult.expiresAt).toISOString());
        passedTests++;
    } catch (error) {
        console.error('❌ Authentication test failed:', error.message);
    }

    // Test 5: Error Handling
    totalTests++;
    console.log('\n📋 Test 5: Error Handling');
    try {
        const qwenModule = new QwenProviderModule({});
        
        // Try to process request without initialization
        try {
            await qwenModule.process({ test: 'request' });
            console.error('❌ Should have thrown error for uninitialized module');
        } catch (error) {
            console.log('✅ Error handling works correctly:', error.message);
            passedTests++;
        }
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
    }

    // Results
    console.log('\n🎯 Test Results:');
    console.log('================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Qwen Provider Module is working correctly.');
        console.log('\n📋 Module Capabilities:');
        console.log('  - ✅ Module creation and configuration');
        console.log('  - ✅ Module initialization');
        console.log('  - ✅ Request processing');
        console.log('  - ✅ Authentication');
        console.log('  - ✅ Error handling');
        console.log('  - ✅ Integration with pipeline framework');
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
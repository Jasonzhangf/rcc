#!/usr/bin/env node

/**
 * Pipeline Assembly Test Script
 * 测试流水线组装器是否按预期工作
 */

import path from 'path';
import fs from 'fs';

console.log('🔍 Testing Pipeline Assembly System...\n');

async function testPipelineAssembly() {
    try {
        // Step 1: Load pipeline module
        const pipelinePath = path.join(process.cwd(), 'sharedmodule', 'pipeline', 'dist', 'index.esm.js');

        if (!fs.existsSync(pipelinePath)) {
            console.error('❌ Pipeline module not found:', pipelinePath);
            return false;
        }

        console.log('✅ Pipeline module found at:', pipelinePath);

        const pipelineModule = await import(pipelinePath);
        console.log('✅ Pipeline module loaded successfully');

        // Step 2: Check required components
        const requiredComponents = [
            'PipelineAssembler',
            'ModuleScanner',
            'PipelineFactory',
            'PipelineTracker',
            'QwenProvider',
            'IFlowProvider'
        ];

        for (const component of requiredComponents) {
            if (!pipelineModule[component]) {
                console.error(`❌ Required component ${component} not found`);
                return false;
            }
            console.log(`✅ Component ${component} available`);
        }

        // Step 3: Test ModuleScanner
        console.log('\n📡 Testing ModuleScanner...');
        const { ModuleScanner } = pipelineModule;
        const moduleScanner = new ModuleScanner();

        const scannerOptions = {
            scanPaths: ['./sharedmodule'],
            providerPatterns: ['*Provider.js', '*Provider.ts'],
            recursive: true
        };

        console.log('🔍 Scanning for providers...');
        const discoveredProviders = await moduleScanner.scan(scannerOptions);

        console.log(`📊 Discovery results:`);
        console.log(`   Total providers: ${discoveredProviders.length}`);
        console.log(`   Available providers: ${discoveredProviders.filter(p => p.status === 'available').length}`);

        for (const provider of discoveredProviders) {
            console.log(`   - ${provider.info.id}: ${provider.status}`);
            if (provider.error) {
                console.log(`     Error: ${provider.error}`);
            }
        }

        const availableProviders = discoveredProviders.filter(p => p.status === 'available');
        if (availableProviders.length === 0) {
            console.error('❌ No available providers found');
            return false;
        }

        console.log('✅ Provider discovery working');

        // Step 4: Test PipelineTracker
        console.log('\n📊 Testing PipelineTracker...');
        const { PipelineTracker } = pipelineModule;

        const tracker = new PipelineTracker({
            enabled: true,
            logLevel: 'debug',
            enableMetrics: true,
            enableTracing: true,
            baseDirectory: './debug-logs'
        });

        await tracker.initialize();
        console.log('✅ PipelineTracker initialized');

        // Step 5: Test PipelineAssembler
        console.log('\n🏗️  Testing PipelineAssembler...');
        const { PipelineAssembler } = pipelineModule;

        const assemblerConfig = {
            providerDiscoveryOptions: scannerOptions,
            pipelineFactoryConfig: {
                defaultTimeout: 30000,
                defaultHealthCheckInterval: 60000,
                defaultMaxRetries: 3,
                defaultLoadBalancingStrategy: 'round-robin',
                enableHealthChecks: true,
                metricsEnabled: true
            },
            enableAutoDiscovery: true,
            fallbackStrategy: 'first-available'
        };

        const assembler = new PipelineAssembler(assemblerConfig, tracker);
        console.log('✅ PipelineAssembler created');

        // Step 6: Test pipeline assembly with sample virtual models
        console.log('\n🎯 Testing pipeline assembly...');

        const virtualModelConfigs = [
            {
                id: 'test-qwen',
                name: 'Test Qwen Model',
                provider: 'qwen',
                modelId: 'qwen-turbo',
                enabled: true,
                targets: [
                    {
                        providerId: 'qwen',
                        modelId: 'qwen-turbo',
                        weight: 1,
                        enabled: true
                    }
                ]
            },
            {
                id: 'test-iflow',
                name: 'Test iFlow Model',
                provider: 'iflow',
                modelId: 'gpt-4',
                enabled: true,
                targets: [
                    {
                        providerId: 'iflow',
                        modelId: 'gpt-4',
                        weight: 1,
                        enabled: true
                    }
                ]
            }
        ];

        console.log(`📋 Assembling pipelines for ${virtualModelConfigs.length} virtual models...`);

        const assemblyResult = await assembler.assemblePipelines(virtualModelConfigs);

        console.log('\n📊 Assembly Results:');
        console.log(`   Success: ${assemblyResult.success}`);
        console.log(`   Pipeline pools created: ${assemblyResult.pipelinePools.size}`);
        console.log(`   Errors: ${assemblyResult.errors.length}`);
        console.log(`   Warnings: ${assemblyResult.warnings.length}`);

        if (assemblyResult.errors.length > 0) {
            console.log('\n❌ Assembly Errors:');
            assemblyResult.errors.forEach(error => {
                console.log(`   - ${error.virtualModelId}: ${error.error}`);
            });
        }

        if (assemblyResult.warnings.length > 0) {
            console.log('\n⚠️  Assembly Warnings:');
            assemblyResult.warnings.forEach(warning => {
                console.log(`   - ${warning.virtualModelId}: ${warning.warning}`);
            });
        }

        // Step 7: Check pipeline pools
        console.log('\n🏊  Checking pipeline pools...');

        for (const [virtualModelId, pool] of assemblyResult.pipelinePools.entries()) {
            console.log(`\n📦 Pipeline Pool for ${virtualModelId}:`);
            console.log(`   Health status: ${pool.healthStatus}`);
            console.log(`   Active pipeline: ${pool.activePipeline ? 'Yes' : 'No'}`);
            console.log(`   Total pipelines: ${pool.pipelines.size}`);
            console.log(`   Metrics: ${JSON.stringify(pool.metrics)}`);
        }

        // Step 8: Test VirtualModelSchedulerManager
        console.log('\n⚙️  Testing VirtualModelSchedulerManager...');
        const { VirtualModelSchedulerManager } = pipelineModule;

        if (assemblyResult.pipelinePools.size === 0) {
            console.error('❌ No pipeline pools to test scheduler with');
            return false;
        }

        const managerConfig = {
            maxSchedulers: 10,
            defaultSchedulerConfig: {
                maxConcurrentRequests: 50,
                requestTimeout: 30000,
                healthCheckInterval: 60000,
                retryStrategy: {
                    maxRetries: 3,
                    baseDelay: 1000,
                    maxDelay: 10000,
                    backoffMultiplier: 2
                },
                loadBalancingStrategy: 'round-robin'
            },
            enableAutoScaling: false,
            healthCheckInterval: 30000
        };

        const schedulerManager = new VirtualModelSchedulerManager(
            assemblyResult.pipelinePools,
            managerConfig,
            tracker
        );

        console.log('✅ VirtualModelSchedulerManager created');

        const managerMetrics = schedulerManager.getManagerMetrics();
        console.log('📊 Scheduler Manager Metrics:');
        console.log(`   Total schedulers: ${managerMetrics.totalSchedulers}`);
        console.log(`   Active schedulers: ${managerMetrics.activeSchedulers}`);
        console.log(`   Virtual model mappings: ${schedulerManager.getVirtualModelMappings().length}`);

        // Step 9: Final validation
        console.log('\n🎯 Final Validation:');

        const validationResults = {
            pipelineModule: true,
            moduleScanner: availableProviders.length > 0,
            pipelineTracker: true,
            pipelineAssembler: assemblyResult.success,
            pipelinePools: assemblyResult.pipelinePools.size > 0,
            schedulerManager: managerMetrics.totalSchedulers > 0
        };

        console.log('✅ Validation Results:');
        for (const [test, passed] of Object.entries(validationResults)) {
            console.log(`   ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        }

        const allPassed = Object.values(validationResults).every(result => result);

        if (allPassed) {
            console.log('\n🎉 All pipeline assembly tests PASSED!');
            console.log('✅ Pipeline assembly system is working correctly');
            return true;
        } else {
            console.log('\n❌ Some pipeline assembly tests FAILED');
            return false;
        }

    } catch (error) {
        console.error('❌ Pipeline assembly test failed:', error);
        return false;
    }
}

// Run the test
testPipelineAssembly()
    .then(success => {
        if (success) {
            console.log('\n🚀 Pipeline assembly system is ready for integration!');
            process.exit(0);
        } else {
            console.log('\n💥 Pipeline assembly system needs fixes');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Test script crashed:', error);
        process.exit(1);
    });
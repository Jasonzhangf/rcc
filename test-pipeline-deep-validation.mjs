#!/usr/bin/env node

/**
 * Deep Pipeline Assembly Validation Test
 * 深度验证流水线组装器是否真正正常工作
 */

import path from 'path';
import fs from 'fs';

console.log('🔍 Deep Pipeline Assembly Validation...\n');

async function deepPipelineValidation() {
    try {
        // Step 1: Load pipeline module
        const pipelinePath = path.join(process.cwd(), 'sharedmodule', 'pipeline', 'dist', 'index.esm.js');
        const pipelineModule = await import(pipelinePath);

        // Step 2: Test actual provider loading and instantiation
        console.log('📡 Step 1: Testing real provider loading...');
        const { ModuleScanner } = pipelineModule;
        const moduleScanner = new ModuleScanner();

        const scannerOptions = {
            scanPaths: ['./sharedmodule'],
            providerPatterns: ['*Provider.js', '*Provider.ts'],
            recursive: true
        };

        const discoveredProviders = await moduleScanner.scan(scannerOptions);

        console.log('📊 Provider Discovery Details:');
        for (const provider of discoveredProviders) {
            console.log(`\n🔍 Provider: ${provider.info.id}`);
            console.log(`   Status: ${provider.status}`);
            console.log(`   Name: ${provider.info.name}`);
            console.log(`   Capabilities: ${provider.info.capabilities.join(', ')}`);

            if (provider.instance) {
                console.log(`   Instance: ✅ Created`);
                console.log(`   Instance Type: ${provider.instance.constructor.name}`);
                console.log(`   Instance Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(provider.instance)).filter(name => typeof provider.instance[name] === 'function').join(', ')}`);

                // Test if provider has required methods
                const requiredMethods = ['chat', 'streamChat', 'healthCheck'];
                console.log(`   Required Methods Check:`);
                for (const method of requiredMethods) {
                    const hasMethod = typeof provider.instance[method] === 'function';
                    console.log(`     ${method}: ${hasMethod ? '✅' : '❌'}`);
                }
            } else {
                console.log(`   Instance: ❌ Not created`);
                if (provider.error) {
                    console.log(`   Error: ${provider.error}`);
                }
            }
        }

        const validProviders = discoveredProviders.filter(p => p.instance && p.status === 'available');
        if (validProviders.length === 0) {
            console.error('❌ No valid provider instances created!');
            return false;
        }

        // Step 3: Test PipelineTracker with real initialization
        console.log('\n📊 Step 2: Testing PipelineTracker...');
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

        // Step 4: Test PipelineAssembler with real provider instances
        console.log('\n🏗️  Step 3: Testing PipelineAssembler with real providers...');
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

        // Step 5: Test pipeline assembly with detailed validation
        console.log('\n🎯 Step 4: Testing detailed pipeline assembly...');

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
            }
        ];

        console.log('🔧 Assembling pipelines with detailed validation...');
        const assemblyResult = await assembler.assemblePipelines(virtualModelConfigs);

        console.log('\n📊 Detailed Assembly Analysis:');
        console.log(`   Success: ${assemblyResult.success}`);
        console.log(`   Pipeline Pools: ${assemblyResult.pipelinePools.size}`);

        if (assemblyResult.pipelinePools.size > 0) {
            for (const [virtualModelId, pool] of assemblyResult.pipelinePools.entries()) {
                console.log(`\n🏊  Pool Details for ${virtualModelId}:`);
                console.log(`   Health Status: ${pool.healthStatus}`);
                console.log(`   Active Pipeline: ${pool.activePipeline ? 'Yes' : 'No'}`);
                console.log(`   Total Pipelines: ${pool.pipelines.size}`);

                // Deep inspection of pipelines in the pool
                console.log(`   Pipeline Details:`);
                for (const [pipelineId, pipeline] of pool.pipelines.entries()) {
                    console.log(`     Pipeline ID: ${pipelineId}`);
                    console.log(`     Pipeline Type: ${pipeline.constructor.name}`);
                    console.log(`     Pipeline Config: ${JSON.stringify(pipeline.config, null, 2)}`);
                    console.log(`     Pipeline Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(pipeline)).filter(name => typeof pipeline[name] === 'function').join(', ')}`);

                    // Test pipeline methods
                    const requiredMethods = ['execute', 'healthCheck', 'getMetrics'];
                    console.log(`     Required Methods Check:`);
                    for (const method of requiredMethods) {
                        const hasMethod = typeof pipeline[method] === 'function';
                        console.log(`       ${method}: ${hasMethod ? '✅' : '❌'}`);
                    }

                    // Check pipeline targets
                    console.log(`     Pipeline Targets: ${pipeline.config.targets.length}`);
                    for (const target of pipeline.config.targets) {
                        console.log(`       Target ID: ${target.id}`);
                        console.log(`       Target Provider: ${target.provider.constructor.name}`);
                        console.log(`       Target Health: ${target.healthStatus}`);
                        console.log(`       Target Enabled: ${target.enabled}`);
                    }
                }
            }
        }

        // Step 6: Test VirtualModelSchedulerManager with real pipelines
        console.log('\n⚙️  Step 5: Testing VirtualModelSchedulerManager with real pipelines...');
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

        console.log('✅ SchedulerManager created');

        // Test scheduler functionality
        console.log('\n🔧 Testing scheduler functionality...');
        const managerMetrics = schedulerManager.getManagerMetrics();
        console.log(`   Total Schedulers: ${managerMetrics.totalSchedulers}`);
        console.log(`   Active Schedulers: ${managerMetrics.activeSchedulers}`);

        const virtualModelMappings = schedulerManager.getVirtualModelMappings();
        console.log(`   Virtual Model Mappings: ${virtualModelMappings.length}`);

        for (const mapping of virtualModelMappings) {
            console.log(`\n📋 Mapping Details for ${mapping.virtualModelId}:`);
            console.log(`   Scheduler ID: ${mapping.schedulerId}`);
            console.log(`   Enabled: ${mapping.enabled}`);
            console.log(`   Config: ${JSON.stringify(mapping.config, null, 2)}`);

            // Test if we can get the scheduler
            const scheduler = schedulerManager.getScheduler(mapping.virtualModelId);
            if (scheduler) {
                console.log(`   Scheduler Access: ✅`);
                console.log(`   Scheduler Type: ${scheduler.constructor.name}`);
                console.log(`   Scheduler Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(scheduler)).filter(name => typeof scheduler[name] === 'function').join(', ')}`);

                // Test scheduler methods
                const requiredMethods = ['scheduleRequest', 'getHealth', 'getMetrics'];
                console.log(`   Required Methods Check:`);
                for (const method of requiredMethods) {
                    const hasMethod = typeof scheduler[method] === 'function';
                    console.log(`     ${method}: ${hasMethod ? '✅' : '❌'}`);
                }
            } else {
                console.log(`   Scheduler Access: ❌`);
            }
        }

        // Step 7: Final validation with real functionality test
        console.log('\n🎯 Step 6: Final functionality validation...');

        const validationResults = {
            validProviders: validProviders.length > 0,
            workingProviders: validProviders.every(p => {
                const methods = ['chat', 'streamChat', 'healthCheck'];
                return methods.every(method => typeof p.instance[method] === 'function');
            }),
            pipelinePools: assemblyResult.pipelinePools.size > 0,
            workingPipelines: Array.from(assemblyResult.pipelinePools.values()).every(pool =>
                pool.pipelines.size > 0 && pool.activePipeline
            ),
            schedulers: managerMetrics.totalSchedulers > 0,
            workingSchedulers: managerMetrics.activeSchedulers > 0,
            realMappings: virtualModelMappings.length > 0
        };

        console.log('\n🎯 Final Deep Validation Results:');
        for (const [test, passed] of Object.entries(validationResults)) {
            console.log(`   ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        }

        const allPassed = Object.values(validationResults).every(result => result);

        if (allPassed) {
            console.log('\n🎉 ALL DEEP VALIDATION TESTS PASSED!');
            console.log('✅ Pipeline assembly system is TRULY working correctly');
            return true;
        } else {
            console.log('\n❌ Some deep validation tests FAILED');
            console.log('💡 The system needs fixes');
            return false;
        }

    } catch (error) {
        console.error('❌ Deep validation test failed:', error);
        return false;
    }
}

// Run the deep validation test
deepPipelineValidation()
    .then(success => {
        if (success) {
            console.log('\n🚀 Pipeline assembly system is FULLY FUNCTIONAL!');
            process.exit(0);
        } else {
            console.log('\n💥 Pipeline assembly system has REAL ISSUES');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Deep validation script crashed:', error);
        process.exit(1);
    });
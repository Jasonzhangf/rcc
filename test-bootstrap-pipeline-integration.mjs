#!/usr/bin/env node

/**
 * Test script for Bootstrap Service with Pipeline Integration
 * This script tests the complete integration between server, pipeline, and bootstrap modules
 */

import { BootstrapService } from './sharedmodule/bootstrap/src/core/BootstrapService.js';

async function testBootstrapPipelineIntegration() {
  console.log('🚀 Testing Bootstrap Service with Pipeline Integration...\n');

  try {
    // Create bootstrap service
    const bootstrapService = new BootstrapService();
    console.log('✅ BootstrapService created successfully');

    // Configure bootstrap service with pipeline integration enabled
    const config = {
      version: '1.0.0',
      systemName: 'RCC Test System',
      environment: 'development',
      configurationPath: '/Users/fanzhang/.rcc/rcc-config.json',
      enableTwoPhaseDebug: true,
      debugBaseDirectory: './debug-logs',
      services: [
        {
          id: 'rcc-server',
          type: 'http-server',
          name: 'RCC HTTP Server',
          description: 'Main HTTP API server for RCC system',
          version: '1.0.0',
          modulePath: 'rcc-server',
          dependencies: ['rcc-basemodule', 'rcc-config-parser'],
          startupOrder: 1,
          enabled: true,
          required: true,
          autoRestart: true,
          maxRestartAttempts: 3,
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000
          },
          startupTimeout: 30000,
          shutdownTimeout: 10000,
          config: {
            port: 5506,
            host: '0.0.0.0',
            enableVirtualModels: true,
            enablePipeline: true,
            debug: {
              enabled: true,
              logDirectory: './debug-logs',
              maxLogSize: 10485760,
              maxLogFiles: 10,
              logLevel: 'debug',
              logRequests: true,
              logResponses: true,
              logErrors: true,
              logPerformance: true,
              logToolCalls: true,
              logAuth: true,
              logPipelineState: true,
              filterSensitiveData: true
            }
          }
        }
      ]
    };

    console.log('📝 Configuring BootstrapService...');
    await bootstrapService.configure(config);
    console.log('✅ BootstrapService configured successfully');

    // Test pipeline system components
    console.log('\n🔍 Testing pipeline system components...');

    const pipelineAssembler = bootstrapService.getPipelineAssembler();
    const pipelineScheduler = bootstrapService.getVirtualModelScheduler();

    console.log('Pipeline System Status:', {
      assembler: !!pipelineAssembler,
      scheduler: !!pipelineScheduler,
      tracker: !!bootstrapService['pipelineTracker']
    });

    if (pipelineAssembler && pipelineScheduler) {
      console.log('✅ Pipeline system components are available');

      // Test assembler status
      const assemblerStatus = pipelineAssembler.getStatus();
      console.log('📊 Pipeline Assembler Status:', {
        initialized: assemblerStatus.initialized,
        totalPools: assemblerStatus.totalPools,
        totalPipelines: assemblerStatus.totalPipelines,
        healthyPools: assemblerStatus.healthyPools,
        discoveredProviders: assemblerStatus.discoveredProviders,
        routingEnabled: assemblerStatus.routingEnabled,
        schedulerInitialized: assemblerStatus.schedulerInitialized,
        configModuleIntegration: assemblerStatus.configModuleIntegration
      });
    } else {
      console.warn('⚠️ Pipeline system components not fully available');
    }

    console.log('\n🚀 Starting BootstrapService...');
    await bootstrapService.start();
    console.log('✅ BootstrapService started successfully');

    // Test system status
    console.log('\n📊 System Status:');
    const systemStatus = bootstrapService.getSystemStatus();
    console.log({
      overall: systemStatus.status,
      services: {
        total: systemStatus.totalServices,
        running: systemStatus.runningServices,
        failed: systemStatus.failedServices
      },
      pipelineSystem: systemStatus.pipelineSystem,
      uptime: `${Math.round(systemStatus.uptime / 1000)}s`
    });

    // Test pipeline pools
    console.log('\n🔍 Testing pipeline pools...');
    const pipelinePools = bootstrapService.getPipelinePools();
    console.log(`Pipeline Pools: ${pipelinePools.size} pools available`);

    for (const [virtualModelId, pool] of pipelinePools.entries()) {
      console.log(`📋 Pool ${virtualModelId}:`, {
        pipelines: pool.pipelines.size,
        activePipeline: !!pool.activePipeline,
        healthStatus: pool.healthStatus,
        metrics: pool.metrics
      });
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🔄 Testing graceful shutdown...');
    await bootstrapService.stop();
    console.log('✅ BootstrapService stopped successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBootstrapPipelineIntegration().catch(console.error);
#!/usr/bin/env node

/**
 * Quick System Validation Script
 * Validates that the RCC system is working correctly with the new configuration wrapper system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

class SystemValidator {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async testModuleAvailability() {
    this.log('Testing module availability...');

    const modules = [
      { name: 'ConfigParser', path: './sharedmodule/config-parser/dist/index.js' },
      { name: 'ServerModule', path: './sharedmodule/server/dist/index.js' },
      { name: 'PipelineModule', path: './sharedmodule/pipeline/dist/index.js' }
    ];

    const results = [];

    for (const module of modules) {
      try {
        await import(module.path);
        results.push({ name: module.name, success: true, error: null });
        this.log(`✅ ${module.name} loaded successfully`);
      } catch (error) {
        results.push({ name: module.name, success: false, error: error.message });
        this.log(`❌ ${module.name} failed to load: ${error.message}`, 'error');
      }
    }

    return results;
  }

  async testWrapperGeneration() {
    this.log('Testing wrapper generation...');

    try {
      const configModule = await import('./sharedmodule/config-parser/dist/index.js');
      const { createConfigParser } = configModule;
      const parser = createConfigParser();

      await parser.initialize();

      const testConfig = {
        version: "1.0.0",
        providers: {
          "test": {
            id: "test",
            name: "Test Provider",
            type: "openai",
            endpoint: "https://api.test.com/v1",
            models: {
              "test-model": {
                id: "test-model",
                name: "Test Model",
                contextLength: 4096,
                supportsFunctions: true
              }
            },
            auth: {
              type: "apikey",
              keys: ["test-key"]
            }
          }
        },
        virtualModels: {
          "test-vm": {
            id: "test-vm",
            enabled: true,
            targets: [{
              providerId: "test",
              modelId: "test-model",
              keyIndex: 0
            }],
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const configData = await parser.parseConfig(testConfig);
      const wrappers = parser.generateAllWrappers(configData);

      await parser.destroy();

      const results = {
        configParsed: true,
        serverWrapper: !!wrappers.server,
        pipelineWrapper: !!wrappers.pipeline,
        serverConfig: {
          port: wrappers.server.port,
          host: wrappers.server.host,
          hasCors: !!wrappers.server.cors
        },
        pipelineConfig: {
          virtualModelCount: wrappers.pipeline.virtualModels.length,
          moduleCount: wrappers.pipeline.modules.length,
          hasRouting: !!wrappers.pipeline.routing
        }
      };

      this.log('✅ Wrapper generation test passed');
      return { success: true, results };

    } catch (error) {
      this.log(`❌ Wrapper generation test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testConfigurationSeparation() {
    this.log('Testing configuration separation...');

    try {
      const configModule = await import('./sharedmodule/config-parser/dist/index.js');
      const { createConfigParser } = configModule;
      const parser = createConfigParser();

      await parser.initialize();

      const testConfig = {
        version: "1.0.0",
        providers: {
          "openai": {
            id: "openai",
            name: "OpenAI",
            type: "openai",
            endpoint: "https://api.openai.com/v1",
            models: {
              "gpt-4": {
                id: "gpt-4",
                name: "GPT-4",
                contextLength: 8192,
                supportsFunctions: true
              }
            },
            auth: {
              type: "apikey",
              keys: ["test-key"]
            }
          }
        },
        virtualModels: {
          "gpt-4-virtual": {
            id: "gpt-4-virtual",
            enabled: true,
            targets: [{
              providerId: "openai",
              modelId: "gpt-4",
              keyIndex: 0
            }],
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const configData = await parser.parseConfig(testConfig);
      const { server, pipeline } = parser.generateAllWrappers(configData);

      await parser.destroy();

      const serverKeys = Object.keys(server);
      const pipelineKeys = Object.keys(pipeline);

      const results = {
        serverHasVirtualModels: serverKeys.some(k => k.includes('virtual') || k.includes('model')),
        serverHasProviders: serverKeys.some(k => k.includes('provider')),
        pipelineHasRouting: pipelineKeys.includes('routing'),
        pipelineHasVirtualModels: pipelineKeys.includes('virtualModels'),
        separationValid: !serverKeys.some(k => k.includes('virtual') || k.includes('provider')) &&
                         pipelineKeys.includes('routing') &&
                         pipelineKeys.includes('virtualModels')
      };

      if (results.separationValid) {
        this.log('✅ Configuration separation test passed');
        return { success: true, results };
      } else {
        this.log('❌ Configuration separation test failed', 'error');
        return { success: false, results };
      }

    } catch (error) {
      this.log(`❌ Configuration separation test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testPerformance() {
    this.log('Testing performance...');

    try {
      const configModule = await import('./sharedmodule/config-parser/dist/index.js');
      const { createConfigParser } = configModule;
      const parser = createConfigParser();

      await parser.initialize();

      const testConfig = {
        version: "1.0.0",
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const configData = await parser.parseConfig(testConfig);

      const times = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        parser.generateAllWrappers(configData);
        times.push(performance.now() - start);
      }

      await parser.destroy();

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const threshold = 10; // 10ms threshold

      const results = {
        averageTime: avgTime,
        maxTime: maxTime,
        withinThreshold: avgTime < threshold,
        times: times
      };

      if (results.withinThreshold) {
        this.log(`✅ Performance test passed (${avgTime.toFixed(2)}ms avg, < ${threshold}ms threshold)`);
        return { success: true, results };
      } else {
        this.log(`❌ Performance test failed (${avgTime.toFixed(2)}ms avg, > ${threshold}ms threshold)`, 'error');
        return { success: false, results };
      }

    } catch (error) {
      this.log(`❌ Performance test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    this.log('🚀 Starting RCC System Validation\n');

    const testResults = [];

    // Test module availability
    const moduleResults = await this.testModuleAvailability();
    testResults.push(...moduleResults);

    // Test wrapper generation
    const wrapperResults = await this.testWrapperGeneration();
    testResults.push(wrapperResults);

    // Test configuration separation
    const separationResults = await this.testConfigurationSeparation();
    testResults.push(separationResults);

    // Test performance
    const performanceResults = await this.testPerformance();
    testResults.push(performanceResults);

    // Generate summary
    const passedTests = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(2);

    const totalDuration = performance.now() - this.startTime;

    this.log('\n📊 Validation Summary:');
    this.log(`   Total Tests: ${totalTests}`);
    this.log(`   Passed: ${passedTests}`);
    this.log(`   Failed: ${totalTests - passedTests}`);
    this.log(`   Success Rate: ${successRate}%`);
    this.log(`   Duration: ${totalDuration.toFixed(2)}ms`);

    // Detailed results
    this.log('\n📋 Detailed Results:');
    testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const name = result.name || 'Test ' + (index + 1);
      this.log(`   ${status} ${name}: ${result.success ? 'Passed' : result.error || 'Failed'}`);
    });

    // Final determination
    if (passedTests === totalTests) {
      this.log('\n🎉 All tests passed! RCC system is ready for production.');
      return { success: true, testResults, summary: { passedTests, totalTests, successRate, duration: totalDuration } };
    } else {
      this.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review issues before deployment.`);
      return { success: false, testResults, summary: { passedTests, totalTests, successRate, duration: totalDuration } };
    }
  }
}

// Main execution
async function main() {
  const validator = new SystemValidator();

  try {
    const result = await validator.runAllTests();

    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SystemValidator;
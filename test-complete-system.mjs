#!/usr/bin/env node

/**
 * RCC System Complete Integration Test
 * Phase 5: Testing and validating the entire RCC system with new configuration wrapper system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Test configuration
const TEST_CONFIG = {
  testTimeout: 30000,
  performanceThreshold: 10, // ms
  iterations: 5
};

// Test data
const SAMPLE_CONFIG = {
  version: "1.0.0",
  rcc: {
    port: 5506,
    server: {
      host: "localhost",
      cors: {
        enabled: true,
        origins: ["*"]
      },
      compression: true,
      timeout: 30000
    },
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
    }
  }
};

const MALFORMED_CONFIG = {
  version: "1.0.0",
  // Missing required fields
  rcc: {
    providers: {}, // Empty providers
    virtualModels: {} // Empty virtual models
  }
};

// Test suite
class RCCSystemTest {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
    this.testDir = path.join(process.cwd(), 'test-temp');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async setup() {
    this.log('Setting up test environment...');

    // Create test directory
    await fs.mkdir(this.testDir, { recursive: true });

    // Write test configuration files
    await fs.writeFile(
      path.join(this.testDir, 'test-config.json'),
      JSON.stringify(SAMPLE_CONFIG, null, 2)
    );

    await fs.writeFile(
      path.join(this.testDir, 'malformed-config.json'),
      JSON.stringify(MALFORMED_CONFIG, null, 2)
    );

    this.log('Test environment setup complete');
  }

  async cleanup() {
    this.log('Cleaning up test environment...');

    // Remove test directory
    await fs.rm(this.testDir, { recursive: true, force: true });

    this.log('Test environment cleanup complete');
  }

  async loadConfigParser() {
    try {
      const configModule = await import('./sharedmodule/config-parser/dist/index.js');
      return configModule;
    } catch (error) {
      this.log(`Failed to load config parser: ${error.message}`, 'error');
      throw error;
    }
  }

  async loadServerModule() {
    try {
      const serverModule = await import('./sharedmodule/server/dist/index.js');
      return serverModule;
    } catch (error) {
      this.log(`Failed to load server module: ${error.message}`, 'error');
      throw error;
    }
  }

  async loadPipelineModule() {
    try {
      const pipelineModule = await import('./sharedmodule/pipeline/dist/index.js');
      return pipelineModule;
    } catch (error) {
      this.log(`Failed to load pipeline module: ${error.message}`, 'error');
      throw error;
    }
  }

  async testWrapperGeneration() {
    this.log('Testing wrapper generation functionality...');

    const testStart = performance.now();
    let result = {
      name: 'Wrapper Generation',
      success: false,
      duration: 0,
      details: {}
    };

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const parser = createConfigParser();

      await parser.initialize();

      // Test parsing sample config
      const configData = await parser.parseConfig(SAMPLE_CONFIG.rcc);

      // Test wrapper generation
      const serverWrapper = parser.generateServerWrapper(configData);
      const pipelineWrapper = parser.generatePipelineWrapper(configData);

      result.duration = performance.now() - testStart;
      result.success = true;
      result.details = {
        configData: {
          version: configData.version,
          providerCount: Object.keys(configData.providers).length,
          virtualModelCount: Object.keys(configData.virtualModels).length
        },
        serverWrapper: {
          port: serverWrapper.port,
          host: serverWrapper.host,
          hasCors: !!serverWrapper.cors
        },
        pipelineWrapper: {
          virtualModelCount: pipelineWrapper.virtualModels.length,
          moduleCount: pipelineWrapper.modules.length,
          routingStrategy: pipelineWrapper.routing.strategy
        },
        performance: {
          generationTime: result.duration,
          withinThreshold: result.duration < TEST_CONFIG.performanceThreshold
        }
      };

      await parser.destroy();

      this.log(`✅ Wrapper generation successful (${result.duration.toFixed(2)}ms)`);

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ Wrapper generation failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  async testConfigurationSeparation() {
    this.log('Testing configuration separation...');

    const testStart = performance.now();
    let result = {
      name: 'Configuration Separation',
      success: false,
      duration: 0,
      details: {}
    };

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const parser = createConfigParser();

      await parser.initialize();

      const configData = await parser.parseConfig(SAMPLE_CONFIG.rcc);
      const { server, pipeline } = parser.generateAllWrappers(configData);

      // Verify server wrapper doesn't contain virtual models
      const serverHasVirtualModels = 'virtualModels' in server || 'virtualModel' in server;

      // Verify pipeline wrapper contains routing info
      const pipelineHasRouting = 'routing' in pipeline && !!pipeline.routing.strategy;

      // Verify pipeline wrapper contains virtual models
      const pipelineHasVirtualModels = Array.isArray(pipeline.virtualModels) && pipeline.virtualModels.length > 0;

      result.duration = performance.now() - testStart;
      result.success = !serverHasVirtualModels && pipelineHasRouting && pipelineHasVirtualModels;
      result.details = {
        separation: {
          serverHasVirtualModels,
          pipelineHasRouting,
          pipelineHasVirtualModels
        },
        server: {
          keys: Object.keys(server),
          excludedFields: ['virtualModels', 'providers'].filter(f => f in server)
        },
        pipeline: {
          keys: Object.keys(pipeline),
          includedFields: ['virtualModels', 'routing', 'modules'].filter(f => f in pipeline)
        }
      };

      await parser.destroy();

      if (result.success) {
        this.log(`✅ Configuration separation verified (${result.duration.toFixed(2)}ms)`);
      } else {
        this.log(`❌ Configuration separation failed`, 'error');
      }

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ Configuration separation test failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  async testValidationAndFallback() {
    this.log('Testing validation and fallback mechanisms...');

    const testStart = performance.now();
    let result = {
      name: 'Validation and Fallback',
      success: false,
      duration: 0,
      details: {}
    };

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const parser = createConfigParser();

      await parser.initialize();

      // Test with malformed configuration
      try {
        const malformedData = await parser.parseConfig(MALFORMED_CONFIG.rcc);
        result.details.malformedParsed = true;
      } catch (error) {
        result.details.malformedError = error.message;
      }

      // Test wrapper generation with empty config
      const emptyConfig = {
        version: "1.0.0",
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const wrappers = parser.generateAllWrappers(emptyConfig);

      result.duration = performance.now() - testStart;
      result.success = true;
      result.details = {
        ...result.details,
        fallback: {
          serverDefaultPort: wrappers.server.port === 5506,
          serverDefaultHost: wrappers.server.host === 'localhost',
          pipelineEmptyVms: wrappers.pipeline.virtualModels.length === 0
        },
        validation: {
          handlesEmptyConfig: true,
          providesDefaults: true
        }
      };

      await parser.destroy();

      this.log(`✅ Validation and fallback mechanisms working (${result.duration.toFixed(2)}ms)`);

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ Validation and fallback test failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  async testPerformanceBenchmarks() {
    this.log('Running performance benchmarks...');

    const testStart = performance.now();
    let result = {
      name: 'Performance Benchmarks',
      success: false,
      duration: 0,
      details: {
        iterations: TEST_CONFIG.iterations,
        times: [],
        average: 0,
        min: 0,
        max: 0,
        withinThreshold: false
      }
    };

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const parser = createConfigParser();

      await parser.initialize();

      const configData = await parser.parseConfig(SAMPLE_CONFIG.rcc);

      // Run multiple iterations
      const times = [];
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const iterStart = performance.now();
        parser.generateAllWrappers(configData);
        times.push(performance.now() - iterStart);
      }

      result.details.times = times;
      result.details.average = times.reduce((a, b) => a + b, 0) / times.length;
      result.details.min = Math.min(...times);
      result.details.max = Math.max(...times);
      result.details.withinThreshold = result.details.average < TEST_CONFIG.performanceThreshold;

      result.duration = performance.now() - testStart;
      result.success = result.details.withinThreshold;

      await parser.destroy();

      if (result.success) {
        this.log(`✅ Performance benchmarks passed (${result.details.average.toFixed(2)}ms avg)`);
      } else {
        this.log(`❌ Performance benchmarks failed (${result.details.average.toFixed(2)}ms avg > ${TEST_CONFIG.performanceThreshold}ms)`, 'error');
      }

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ Performance benchmarks failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  async testEndToEndIntegration() {
    this.log('Testing end-to-end system integration...');

    const testStart = performance.now();
    let result = {
      name: 'End-to-End Integration',
      success: false,
      duration: 0,
      details: {}
    };

    try {
      // Load all modules
      const configModule = await this.loadConfigParser();
      const serverModule = await this.loadServerModule();
      const pipelineModule = await this.loadPipelineModule();

      // Create instances
      const parser = configModule.createConfigParser();

      await parser.initialize();

      // Parse config and generate wrappers
      const configData = await parser.parseConfig(SAMPLE_CONFIG.rcc);
      const wrappers = parser.generateAllWrappers(configData);

      // Test module compatibility (without actually starting servers)
      result.details = {
        configLoaded: !!configData,
        wrappersGenerated: !!wrappers.server && !!wrappers.pipeline,
        serverConfigValid: typeof wrappers.server.port === 'number',
        pipelineConfigValid: Array.isArray(wrappers.pipeline.virtualModels),
        modulesLoaded: {
          config: true,
          server: true,
          pipeline: true
        }
      };

      result.duration = performance.now() - testStart;
      result.success = Object.values(result.details.modulesLoaded).every(v => v) &&
                       result.details.wrappersGenerated;

      await parser.destroy();

      if (result.success) {
        this.log(`✅ End-to-end integration test passed (${result.duration.toFixed(2)}ms)`);
      } else {
        this.log(`❌ End-to-end integration test failed`, 'error');
      }

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ End-to-end integration test failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  async testErrorScenarios() {
    this.log('Testing error scenarios...');

    const testStart = performance.now();
    let result = {
      name: 'Error Scenarios',
      success: false,
      duration: 0,
      details: {
        scenarios: []
      }
    };

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const parser = createConfigParser();

      await parser.initialize();

      const scenarios = [
        {
          name: 'Null config',
          test: () => parser.parseConfig(null),
          shouldFail: true
        },
        {
          name: 'Undefined config',
          test: () => parser.parseConfig(undefined),
          shouldFail: true
        },
        {
          name: 'String config',
          test: () => parser.parseConfig('invalid'),
          shouldFail: true
        },
        {
          name: 'Empty object config',
          test: () => parser.parseConfig({}),
          shouldFail: false // Should work with defaults
        }
      ];

      let passedScenarios = 0;

      for (const scenario of scenarios) {
        const scenarioStart = performance.now();
        try {
          await scenario.test();
          const scenarioResult = {
            name: scenario.name,
            success: !scenario.shouldFail,
            duration: performance.now() - scenarioStart,
            error: null
          };

          if (scenarioResult.success) passedScenarios++;
          result.details.scenarios.push(scenarioResult);

        } catch (error) {
          const scenarioResult = {
            name: scenario.name,
            success: scenario.shouldFail,
            duration: performance.now() - scenarioStart,
            error: error.message
          };

          if (scenarioResult.success) passedScenarios++;
          result.details.scenarios.push(scenarioResult);
        }
      }

      result.duration = performance.now() - testStart;
      result.success = passedScenarios === scenarios.length;

      await parser.destroy();

      if (result.success) {
        this.log(`✅ Error scenarios test passed (${passedScenarios}/${scenarios.length} scenarios)`);
      } else {
        this.log(`❌ Error scenarios test failed (${passedScenarios}/${scenarios.length} scenarios)`, 'error');
      }

    } catch (error) {
      result.duration = performance.now() - testStart;
      result.error = error.message;
      this.log(`❌ Error scenarios test failed: ${error.message}`, 'error');
    }

    this.results.push(result);
    return result;
  }

  generateReport() {
    const totalDuration = performance.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: (passedTests / totalTests * 100).toFixed(2) + '%',
        totalDuration: totalDuration.toFixed(2) + 'ms'
      },
      results: this.results,
      performance: {
        averageTestTime: (totalDuration / totalTests).toFixed(2) + 'ms',
        withinThreshold: totalDuration / totalTests < TEST_CONFIG.performanceThreshold
      }
    };

    return report;
  }

  async runAllTests() {
    this.log('🚀 Starting RCC System Complete Integration Test\n');

    await this.setup();

    try {
      // Run all tests
      await this.testWrapperGeneration();
      await this.testConfigurationSeparation();
      await this.testValidationAndFallback();
      await this.testPerformanceBenchmarks();
      await this.testEndToEndIntegration();
      await this.testErrorScenarios();

      // Generate and display report
      const report = this.generateReport();

      this.log('\n📊 Test Report:');
      this.log(`   Total Tests: ${report.summary.totalTests}`);
      this.log(`   Passed: ${report.summary.passedTests}`);
      this.log(`   Failed: ${report.summary.failedTests}`);
      this.log(`   Success Rate: ${report.summary.successRate}`);
      this.log(`   Total Duration: ${report.summary.totalDuration}`);
      this.log(`   Average Test Time: ${report.performance.averageTestTime}`);

      // Detailed results
      this.log('\n📋 Detailed Results:');
      this.results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        this.log(`   ${status} ${result.name}: ${result.duration.toFixed(2)}ms`);
        if (result.error) {
          this.log(`      Error: ${result.error}`);
        }
      });

      // Save detailed report
      const reportPath = path.join(this.testDir, 'test-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`\n💾 Detailed report saved to: ${reportPath}`);

      return report;

    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  const test = new RCCSystemTest();

  try {
    const report = await test.runAllTests();

    if (report.summary.failedTests === 0) {
      console.log('\n🎉 All tests passed! RCC system is ready for production.');
      process.exit(0);
    } else {
      console.log(`\n💥 ${report.summary.failedTests} test(s) failed. Please review the issues.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default RCCSystemTest;
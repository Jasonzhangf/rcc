#!/usr/bin/env node

/**
 * RCC System Error Scenarios Testing
 * Phase 5: Comprehensive Error Handling and Recovery Testing
 */

import { promises as fs } from 'fs';
import path from 'path';

class ErrorScenarioTest {
  constructor() {
    this.results = [];
    this.testDir = path.join(process.cwd(), 'error-test-temp');
    this.errorCases = this.generateErrorCases();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  generateErrorCases() {
    return [
      {
        name: 'Invalid JSON Configuration',
        category: 'Configuration Loading',
        scenario: async () => {
          const invalidJson = '{ "invalid": json, "missing": quote }';
          await fs.writeFile(path.join(this.testDir, 'invalid.json'), invalidJson);
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfigFromFile(path.join(this.testDir, 'invalid.json'));
          } finally {
            await parser.destroy();
          }
        },
        expectedError: 'SyntaxError'
      },
      {
        name: 'Missing Configuration File',
        category: 'Configuration Loading',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfigFromFile(path.join(this.testDir, 'nonexistent.json'));
          } finally {
            await parser.destroy();
          }
        },
        expectedError: 'ENOENT'
      },
      {
        name: 'Empty Configuration Object',
        category: 'Configuration Validation',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig({});
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null, // Should work with defaults
        shouldFail: false
      },
      {
        name: 'Null Configuration',
        category: 'Configuration Validation',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig(null);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: 'TypeError'
      },
      {
        name: 'Malformed Provider Configuration',
        category: 'Configuration Validation',
        scenario: async () => {
          const malformedConfig = {
            rcc: {
              providers: {
                "bad-provider": {
                  // Missing required fields
                  type: "openai"
                  // Missing id, name, endpoint, auth
                }
              },
              virtualModels: {}
            }
          };
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig(malformedConfig.rcc);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null // Should handle gracefully
      },
      {
        name: 'Circular Reference in Configuration',
        category: 'Configuration Validation',
        scenario: async () => {
          const circularConfig = {
            rcc: {
              providers: {},
              virtualModels: {}
            }
          };
          // Create circular reference
          circularConfig.rcc.providers = circularConfig;

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig(circularConfig.rcc);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: 'RangeError'
      },
      {
        name: 'Extremely Large Configuration',
        category: 'Performance Limits',
        scenario: async () => {
          const largeConfig = {
            rcc: {
              providers: {},
              virtualModels: {}
            }
          };

          // Generate 1000 providers with 100 models each
          for (let i = 0; i < 1000; i++) {
            const providerId = `provider-${i}`;
            largeConfig.rcc.providers[providerId] = {
              id: providerId,
              name: `Provider ${i}`,
              type: "openai",
              endpoint: `https://api.provider${i}.com/v1`,
              models: {}
            };

            for (let j = 0; j < 100; j++) {
              const modelId = `model-${i}-${j}`;
              largeConfig.rcc.providers[providerId].models[modelId] = {
                id: modelId,
                name: `Model ${i}-${j}`,
                contextLength: 8192,
                supportsFunctions: true
              };
            }
          }

          // Generate 5000 virtual models
          for (let i = 0; i < 5000; i++) {
            const vmId = `vm-${i}`;
            largeConfig.rcc.virtualModels[vmId] = {
              id: vmId,
              enabled: true,
              targets: Array(5).fill(0).map((_, j) => ({
                providerId: `provider-${j % 1000}`,
                modelId: `model-${j % 100}-${j % 100}`,
                keyIndex: j % 3
              })),
              priority: Math.floor(Math.random() * 10) + 1
            };
          }

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            const configData = await parser.parseConfig(largeConfig.rcc);
            parser.generateAllWrappers(configData);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null,
        shouldFail: false,
        timeout: 30000
      },
      {
        name: 'Invalid Virtual Model Targets',
        category: 'Configuration Validation',
        scenario: async () => {
          const invalidVmConfig = {
            rcc: {
              providers: {
                "test-provider": {
                  id: "test-provider",
                  name: "Test Provider",
                  type: "openai",
                  endpoint: "https://api.test.com/v1",
                  models: {
                    "test-model": {
                      id: "test-model",
                      name: "Test Model",
                      contextLength: 4096,
                      supportsFunctions: false
                    }
                  },
                  auth: { type: "apikey", keys: ["test-key"] }
                }
              },
              virtualModels: {
                "invalid-vm": {
                  id: "invalid-vm",
                  enabled: true,
                  targets: [
                    {
                      providerId: "nonexistent-provider",
                      modelId: "nonexistent-model",
                      keyIndex: 999
                    }
                  ],
                  priority: 1
                }
              }
            }
          };

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            const configData = await parser.parseConfig(invalidVmConfig.rcc);
            parser.generateAllWrappers(configData);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null, // Should handle gracefully
        shouldFail: false
      },
      {
        name: 'Wrapper Generation with Invalid Data',
        category: 'Wrapper Generation',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            parser.generateServerWrapper(null);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: 'TypeError'
      },
      {
        name: 'Memory Pressure Scenario',
        category: 'Resource Limits',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();

          try {
            // Create multiple parser instances to simulate memory pressure
            const parsers = [];
            for (let i = 0; i < 50; i++) {
              const newParser = createConfigParser();
              await newParser.initialize();
              parsers.push(newParser);
            }

            // Use all parsers
            const testConfig = {
              version: "1.0.0",
              providers: {
                "test": {
                  id: "test",
                  name: "Test",
                  type: "openai",
                  endpoint: "https://api.test.com/v1",
                  models: {},
                  auth: { type: "apikey", keys: ["test"] }
                }
              },
              virtualModels: {}
            };

            await Promise.all(parsers.map(async p => {
              const configData = await p.parseConfig(testConfig);
              p.generateAllWrappers(configData);
            }));

            // Clean up
            await Promise.all(parsers.map(p => p.destroy()));

          } finally {
            await parser.destroy();
          }
        },
        expectedError: null,
        shouldFail: false
      },
      {
        name: 'Module Loading Failure',
        category: 'Module Integration',
        scenario: async () => {
          try {
            // Try to import a non-existent module
            await import('./nonexistent-module');
          } catch (error) {
            // This is expected, but we want to test the error handling
            throw error;
          }
        },
        expectedError: 'MODULE_NOT_FOUND'
      },
      {
        name: 'Configuration File Permission Denied',
        category: 'File System Errors',
        scenario: async () => {
          const testConfig = { version: "1.0.0", rcc: { providers: {}, virtualModels: {} } };
          const configPath = path.join(this.testDir, 'restricted.json');

          await fs.writeFile(configPath, JSON.stringify(testConfig));

          // Change file permissions to make it unreadable
          await fs.chmod(configPath, 0o000);

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();

          try {
            await parser.parseConfigFromFile(configPath);
          } finally {
            // Restore permissions for cleanup
            await fs.chmod(configPath, 0o644);
            await parser.destroy();
          }
        },
        expectedError: 'EACCES'
      },
      {
        name: 'Invalid Configuration Schema',
        category: 'Schema Validation',
        scenario: async () => {
          const invalidSchemaConfig = {
            rcc: {
              providers: "not-an-object", // Should be an object
              virtualModels: [],
              server: {
                port: "not-a-number" // Should be a number
              }
            }
          };

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig(invalidSchemaConfig.rcc);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null, // Should handle gracefully
        shouldFail: false
      },
      {
        name: 'Network Configuration Errors',
        category: 'External Dependencies',
        scenario: async () => {
          const networkErrorConfig = {
            rcc: {
              providers: {
                "network-provider": {
                  id: "network-provider",
                  name: "Network Provider",
                  type: "openai",
                  endpoint: "https://nonexistent-domain-that-does-not-exist.com/v1",
                  models: {
                    "test-model": {
                      id: "test-model",
                      name: "Test Model",
                      contextLength: 4096,
                      supportsFunctions: false
                    }
                  },
                  auth: { type: "apikey", keys: ["test-key"] }
                }
              },
              virtualModels: {
                "network-vm": {
                  id: "network-vm",
                  enabled: true,
                  targets: [{
                    providerId: "network-provider",
                    modelId: "test-model",
                    keyIndex: 0
                  }],
                  priority: 1
                }
              }
            }
          };

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            const configData = await parser.parseConfig(networkErrorConfig.rcc);
            parser.generateAllWrappers(configData);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null, // Should handle gracefully
        shouldFail: false
      },
      {
        name: 'Duplicate Configuration Keys',
        category: 'Data Integrity',
        scenario: async () => {
          const duplicateConfig = {
            rcc: {
              providers: {
                "provider-1": {
                  id: "provider-1",
                  name: "Provider 1",
                  type: "openai",
                  endpoint: "https://api.provider1.com/v1",
                  models: {},
                  auth: { type: "apikey", keys: ["key1"] }
                },
                "provider-1": { // Duplicate key
                  id: "provider-2",
                  name: "Provider 2",
                  type: "openai",
                  endpoint: "https://api.provider2.com/v1",
                  models: {},
                  auth: { type: "apikey", keys: ["key2"] }
                }
              },
              virtualModels: {}
            }
          };

          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();
          try {
            await parser.parseConfig(duplicateConfig.rcc);
          } finally {
            await parser.destroy();
          }
        },
        expectedError: null, // Should handle gracefully
        shouldFail: false
      },
      {
        name: 'Wrapper Generation Failure Recovery',
        category: 'Error Recovery',
        scenario: async () => {
          const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
          const parser = createConfigParser();
          await parser.initialize();

          try {
            // First, generate valid wrappers
            const validConfig = {
              version: "1.0.0",
              providers: {
                "test": {
                  id: "test",
                  name: "Test",
                  type: "openai",
                  endpoint: "https://api.test.com/v1",
                  models: {},
                  auth: { type: "apikey", keys: ["test"] }
                }
              },
              virtualModels: {}
            };

            const configData = await parser.parseConfig(validConfig);
            const validWrappers = parser.generateAllWrappers(configData);

            // Then try to generate wrappers with invalid data
            try {
              parser.generateServerWrapper(null);
            } catch (error) {
              // Expected error, test if parser can still function
              const anotherConfigData = await parser.parseConfig(validConfig);
              const recoveryWrappers = parser.generateAllWrappers(anotherConfigData);

              if (!recoveryWrappers.server || !recoveryWrappers.pipeline) {
                throw new Error('Failed to recover from wrapper generation error');
              }
            }

          } finally {
            await parser.destroy();
          }
        },
        expectedError: null,
        shouldFail: false
      }
    ];
  }

  async setup() {
    this.log('Setting up error scenario test environment...');
    await fs.mkdir(this.testDir, { recursive: true });
    this.log('Test environment setup complete');
  }

  async cleanup() {
    this.log('Cleaning up error scenario test environment...');
    await fs.rm(this.testDir, { recursive: true, force: true });
    this.log('Test environment cleanup complete');
  }

  async runErrorTest(errorCase) {
    const result = {
      name: errorCase.name,
      category: errorCase.category,
      success: false,
      duration: 0,
      error: null,
      expectedBehavior: errorCase.expectedError,
      recovered: false
    };

    const startTime = Date.now();

    try {
      await errorCase.scenario();

      if (errorCase.shouldFail === false) {
        result.success = true;
        result.recovered = true;
      } else {
        result.error = `Expected error '${errorCase.expectedError}' but none occurred`;
      }
    } catch (error) {
      if (errorCase.expectedError === null || errorCase.shouldFail === false) {
        result.error = `Unexpected error: ${error.message}`;
      } else if (error.message.includes(errorCase.expectedError) ||
                 error.constructor.name === errorCase.expectedError) {
        result.success = true;
        result.error = error.message;
      } else {
        result.error = `Expected '${errorCase.expectedError}' but got '${error.message}'`;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async testFallbackMechanisms() {
    this.log('Testing fallback mechanisms...');

    const results = [];

    try {
      const { createConfigParser } = await import('./sharedmodule/config-parser/dist/index.js');
      const parser = createConfigParser();
      await parser.initialize();

      // Test 1: Empty configuration fallback
      try {
        const emptyConfig = {
          version: "1.0.0",
          providers: {},
          virtualModels: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const wrappers = parser.generateAllWrappers(emptyConfig);

        results.push({
          test: 'Empty Config Fallback',
          success: wrappers.server.port === 5506 &&
                   wrappers.server.host === 'localhost' &&
                   wrappers.pipeline.virtualModels.length === 0,
          details: { serverPort: wrappers.server.port, pipelineVmCount: wrappers.pipeline.virtualModels.length }
        });
      } catch (error) {
        results.push({
          test: 'Empty Config Fallback',
          success: false,
          error: error.message
        });
      }

      // Test 2: Partial configuration fallback
      try {
        const partialConfig = {
          version: "1.0.0",
          providers: {},
          virtualModels: {
            "test-vm": {
              id: "test-vm",
              enabled: true,
              targets: [{
                providerId: "nonexistent",
                modelId: "nonexistent",
                keyIndex: 0
              }],
              priority: 1
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const wrappers = parser.generateAllWrappers(partialConfig);

        results.push({
          test: 'Partial Config Fallback',
          success: wrappers.pipeline.virtualModels.length === 1,
          details: { vmCount: wrappers.pipeline.virtualModels.length }
        });
      } catch (error) {
        results.push({
          test: 'Partial Config Fallback',
          success: false,
          error: error.message
        });
      }

      // Test 3: Corrupted data recovery
      try {
        // Generate valid wrappers first
        const validConfig = {
          version: "1.0.0",
          providers: {
            "test": {
              id: "test",
              name: "Test",
              type: "openai",
              endpoint: "https://api.test.com/v1",
              models: {},
              auth: { type: "apikey", keys: ["test"] }
            }
          },
          virtualModels: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const configData = await parser.parseConfig(validConfig);
        const validWrappers = parser.generateAllWrappers(configData);

        // Try to recover from error
        try {
          parser.generateServerWrapper(null);
        } catch (error) {
          // Should still be able to generate valid wrappers
          const recoveryWrappers = parser.generateAllWrappers(configData);

          results.push({
            test: 'Error Recovery',
            success: !!recoveryWrappers.server && !!recoveryWrappers.pipeline,
            details: { recovered: true }
          });
        }
      } catch (error) {
        results.push({
          test: 'Error Recovery',
          success: false,
          error: error.message
        });
      }

      await parser.destroy();

    } catch (error) {
      results.push({
        test: 'Fallback Mechanisms',
        success: false,
        error: error.message
      });
    }

    this.logFallbackResults(results);
    return results;
  }

  logFallbackResults(results) {
    this.log('\n🛡️  Fallback Mechanism Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      this.log(`   ${status} ${result.test}: ${result.success ? 'Passed' : result.error || 'Failed'}`);
      if (result.details) {
        this.log(`      Details: ${JSON.stringify(result.details)}`);
      }
    });
  }

  async runAllErrorTests() {
    this.log('🚨 Starting RCC System Error Scenarios Testing\n');

    await this.setup();

    try {
      // Test individual error scenarios
      for (const errorCase of this.errorCases) {
        this.log(`Testing: ${errorCase.name} (${errorCase.category})`);

        const timeout = errorCase.timeout || 5000;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout);
        });

        let result;
        try {
          result = await Promise.race([
            this.runErrorTest(errorCase),
            timeoutPromise
          ]);
        } catch (error) {
          result = {
            name: errorCase.name,
            category: errorCase.category,
            success: false,
            duration: timeout,
            error: error.message
          };
        }

        this.results.push(result);

        const status = result.success ? '✅' : '❌';
        this.log(`   ${status} ${result.name}: ${result.success ? 'Passed' : result.error || 'Failed'} (${result.duration}ms)`);
      }

      // Test fallback mechanisms
      this.log('\nTesting fallback mechanisms...');
      const fallbackResults = await this.testFallbackMechanisms();
      this.results.push(...fallbackResults.map(r => ({
        name: r.test,
        category: 'Fallback Mechanisms',
        success: r.success,
        duration: 0,
        error: r.error
      })));

      // Generate summary report
      this.generateErrorReport();

    } finally {
      await this.cleanup();
    }
  }

  generateErrorReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests * 100).toFixed(2) + '%'
      },
      results: this.results,
      categories: this.groupResultsByCategory(),
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(this.testDir, 'error-test-report.json');
    const reportJson = JSON.stringify(report, null, 2);

    try {
      fs.writeFileSync(reportPath, reportJson);
      this.log(`\n💾 Error test report saved to: ${reportPath}`);
    } catch (error) {
      this.log(`Failed to save report: ${error.message}`, 'error');
    }

    // Display summary
    this.log('\n📊 Error Test Summary:');
    this.log(`   Total Tests: ${totalTests}`);
    this.log(`   Passed: ${passedTests}`);
    this.log(`   Failed: ${failedTests}`);
    this.log(`   Success Rate: ${report.summary.successRate}`);

    // Display category breakdown
    this.log('\n📋 Category Breakdown:');
    Object.entries(report.categories).forEach(([category, stats]) => {
      this.log(`   ${category}: ${stats.passed}/${stats.total} passed (${stats.successRate}%)`);
    });

    // Display recommendations
    if (report.recommendations.length > 0) {
      this.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => this.log(`   - ${rec}`));
    }

    return report;
  }

  groupResultsByCategory() {
    const categories = {};

    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = {
          total: 0,
          passed: 0,
          failed: 0
        };
      }

      categories[result.category].total++;
      if (result.success) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    // Calculate success rates
    Object.keys(categories).forEach(category => {
      const stats = categories[category];
      stats.successRate = (stats.passed / stats.total * 100).toFixed(2) + '%';
    });

    return categories;
  }

  generateRecommendations() {
    const recommendations = [];
    const categories = this.groupResultsByCategory();

    // Analyze each category
    Object.entries(categories).forEach(([category, stats]) => {
      if (stats.successRate < '80%') {
        recommendations.push(`Improve error handling in ${category} - currently ${stats.successRate} success rate`);
      }
    });

    // Specific recommendations based on common patterns
    const failedTests = this.results.filter(r => !r.success);
    const commonErrors = {};

    failedTests.forEach(test => {
      const errorType = test.error ? test.error.split(':')[0] : 'Unknown';
      commonErrors[errorType] = (commonErrors[errorType] || 0) + 1;
    });

    Object.entries(commonErrors).forEach(([errorType, count]) => {
      if (count > 2) {
        recommendations.push(`Address frequent '${errorType}' errors (occurred ${count} times)`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Error handling is robust across all test scenarios');
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const test = new ErrorScenarioTest();

  try {
    await test.runAllErrorTests();

    const successRate = test.results.filter(r => r.success).length / test.results.length * 100;
    if (successRate >= 80) {
      console.log('\n🎉 Error scenario testing completed with acceptable success rate!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Error scenario testing completed with low success rate: ${successRate.toFixed(2)}%`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Error scenario testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ErrorScenarioTest;
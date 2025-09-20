#!/usr/bin/env node

/**
 * RCC System Performance Benchmarking
 * Phase 5: Performance and Reliability Testing
 */

import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import path from 'path';

class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.benchmarks = [];
    this.configurations = this.generateTestConfigurations();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  generateTestConfigurations() {
    const baseConfig = {
      version: "1.0.0",
      rcc: {
        port: 5506,
        server: {
          host: "localhost",
          cors: { enabled: true, origins: ["*"] },
          compression: true,
          timeout: 30000
        }
      }
    };

    return [
      {
        name: "Minimal",
        config: {
          ...baseConfig,
          rcc: {
            ...baseConfig.rcc,
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
              "test-vm": {
                id: "test-vm",
                enabled: true,
                targets: [{
                  providerId: "test-provider",
                  modelId: "test-model",
                  keyIndex: 0
                }],
                priority: 1
              }
            }
          }
        }
      },
      {
        name: "Medium",
        config: {
          ...baseConfig,
          rcc: {
            ...baseConfig.rcc,
            providers: this.generateProviders(5, 3),
            virtualModels: this.generateVirtualModels(10, 5)
          }
        }
      },
      {
        name: "Large",
        config: {
          ...baseConfig,
          rcc: {
            ...baseConfig.rcc,
            providers: this.generateProviders(10, 5),
            virtualModels: this.generateVirtualModels(25, 10)
          }
        }
      },
      {
        name: "Extra Large",
        config: {
          ...baseConfig,
          rcc: {
            ...baseConfig.rcc,
            providers: this.generateProviders(20, 8),
            virtualModels: this.generateVirtualModels(50, 15)
          }
        }
      }
    ];
  }

  generateProviders(providerCount, modelsPerProvider) {
    const providers = {};
    for (let i = 0; i < providerCount; i++) {
      const providerId = `provider-${i}`;
      providers[providerId] = {
        id: providerId,
        name: `Provider ${i}`,
        type: "openai",
        endpoint: `https://api.provider${i}.com/v1`,
        models: this.generateModels(modelsPerProvider, i),
        auth: {
          type: "apikey",
          keys: Array(3).fill(0).map((_, j) => `key-${i}-${j}`)
        }
      };
    }
    return providers;
  }

  generateModels(count, providerIndex) {
    const models = {};
    for (let i = 0; i < count; i++) {
      models[`model-${providerIndex}-${i}`] = {
        id: `model-${providerIndex}-${i}`,
        name: `Model ${providerIndex}-${i}`,
        contextLength: [4096, 8192, 32768, 128000][i % 4],
        supportsFunctions: i % 2 === 0
      };
    }
    return models;
  }

  generateVirtualModels(vmCount, maxTargets) {
    const virtualModels = {};
    for (let i = 0; i < vmCount; i++) {
      const targetCount = Math.floor(Math.random() * maxTargets) + 1;
      virtualModels[`vm-${i}`] = {
        id: `vm-${i}`,
        enabled: true,
        targets: Array(targetCount).fill(0).map((_, j) => ({
          providerId: `provider-${j % 10}`,
          modelId: `model-${j % 10}-${j % 5}`,
          keyIndex: j % 3,
          weight: Math.random() + 0.5
        })),
        priority: Math.floor(Math.random() * 10) + 1,
        weight: Math.random() + 0.5
      };
    }
    return virtualModels;
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

  async benchmarkMemoryUsage() {
    this.log('🧠 Benchmarking memory usage...');

    const results = [];

    for (const config of this.configurations) {
      const startMemory = process.memoryUsage();

      try {
        const { createConfigParser } = await this.loadConfigParser();
        const parser = createConfigParser();

        await parser.initialize();

        // Parse config and generate wrappers
        const configData = await parser.parseConfig(config.config.rcc);
        const wrappers = parser.generateAllWrappers(configData);

        const endMemory = process.memoryUsage();
        const memoryDiff = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external
        };

        results.push({
          config: config.name,
          memoryUsage: memoryDiff,
          configSize: JSON.stringify(config.config).length,
          providerCount: Object.keys(config.config.rcc.providers || {}).length,
          virtualModelCount: Object.keys(config.config.rcc.virtualModels || {}).length
        });

        await parser.destroy();

      } catch (error) {
        this.log(`Memory benchmark failed for ${config.name}: ${error.message}`, 'error');
      }
    }

    this.logMemoryResults(results);
    return results;
  }

  logMemoryResults(results) {
    this.log('\n📊 Memory Usage Results:');
    results.forEach(result => {
      this.log(`   ${result.config}:`);
      this.log(`     RSS: ${(result.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
      this.log(`     Heap: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      this.log(`     Config Size: ${(result.configSize / 1024).toFixed(2)} KB`);
      this.log(`     Providers: ${result.providerCount}, VMs: ${result.virtualModelCount}`);
    });
  }

  async benchmarkParsingSpeed() {
    this.log('⚡ Benchmarking parsing speed...');

    const iterations = 100;
    const results = [];

    for (const config of this.configurations) {
      const times = [];

      try {
        const { createConfigParser } = await this.loadConfigParser();

        for (let i = 0; i < iterations; i++) {
          const parser = createConfigParser();
          await parser.initialize();

          const start = performance.now();
          const configData = await parser.parseConfig(config.config.rcc);
          const wrappers = parser.generateAllWrappers(configData);
          const end = performance.now();

          times.push(end - start);
          await parser.destroy();
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        results.push({
          config: config.name,
          averageTime: avgTime,
          minTime,
          maxTime,
          iterations,
          configSize: JSON.stringify(config.config).length,
          providerCount: Object.keys(config.config.rcc.providers || {}).length,
          virtualModelCount: Object.keys(config.config.rcc.virtualModels || {}).length
        });

      } catch (error) {
        this.log(`Speed benchmark failed for ${config.name}: ${error.message}`, 'error');
      }
    }

    this.logSpeedResults(results);
    return results;
  }

  logSpeedResults(results) {
    this.log('\n⚡ Parsing Speed Results:');
    results.forEach(result => {
      this.log(`   ${result.config}:`);
      this.log(`     Average: ${result.averageTime.toFixed(3)}ms`);
      this.log(`     Min: ${result.minTime.toFixed(3)}ms, Max: ${result.maxTime.toFixed(3)}ms`);
      this.log(`     Config Size: ${(result.configSize / 1024).toFixed(2)} KB`);
      this.log(`     Throughput: ${(result.configSize / result.averageTime).toFixed(2)} KB/ms`);
    });
  }

  async benchmarkWrapperGeneration() {
    this.log('🔄 Benchmarking wrapper generation...');

    const iterations = 1000;
    const results = [];

    for (const config of this.configurations) {
      const serverTimes = [];
      const pipelineTimes = [];
      const allWrappersTimes = [];

      try {
        const { createConfigParser } = await this.loadConfigParser();
        const parser = createConfigParser();
        await parser.initialize();

        const configData = await parser.parseConfig(config.config.rcc);

        // Benchmark individual wrapper generation
        for (let i = 0; i < iterations; i++) {
          let start = performance.now();
          const serverWrapper = parser.generateServerWrapper(configData);
          let end = performance.now();
          serverTimes.push(end - start);

          start = performance.now();
          const pipelineWrapper = parser.generatePipelineWrapper(configData);
          end = performance.now();
          pipelineTimes.push(end - start);

          start = performance.now();
          const allWrappers = parser.generateAllWrappers(configData);
          end = performance.now();
          allWrappersTimes.push(end - start);
        }

        results.push({
          config: config.name,
          serverWrapper: {
            average: serverTimes.reduce((a, b) => a + b, 0) / serverTimes.length,
            min: Math.min(...serverTimes),
            max: Math.max(...serverTimes)
          },
          pipelineWrapper: {
            average: pipelineTimes.reduce((a, b) => a + b, 0) / pipelineTimes.length,
            min: Math.min(...pipelineTimes),
            max: Math.max(...pipelineTimes)
          },
          allWrappers: {
            average: allWrappersTimes.reduce((a, b) => a + b, 0) / allWrappersTimes.length,
            min: Math.min(...allWrappersTimes),
            max: Math.max(...allWrappersTimes)
          },
          iterations,
          configSize: JSON.stringify(config.config).length
        });

        await parser.destroy();

      } catch (error) {
        this.log(`Wrapper generation benchmark failed for ${config.name}: ${error.message}`, 'error');
      }
    }

    this.logWrapperResults(results);
    return results;
  }

  logWrapperResults(results) {
    this.log('\n🔄 Wrapper Generation Results:');
    results.forEach(result => {
      this.log(`   ${result.config}:`);
      this.log(`     Server Wrapper: ${result.serverWrapper.average.toFixed(4)}ms (avg)`);
      this.log(`     Pipeline Wrapper: ${result.pipelineWrapper.average.toFixed(4)}ms (avg)`);
      this.log(`     All Wrappers: ${result.allWrappers.average.toFixed(4)}ms (avg)`);
      this.log(`     Combined vs Separate: ${(result.allWrappers.average / (result.serverWrapper.average + result.pipelineWrapper.average)).toFixed(2)}x`);
    });
  }

  async benchmarkConcurrency() {
    this.log('🚀 Benchmarking concurrency performance...');

    const concurrentUsers = [1, 5, 10, 20, 50];
    const results = [];

    for (const config of this.configurations) {
      for (const concurrentCount of concurrentUsers) {
        const times = [];

        try {
          const { createConfigParser } = await this.loadConfigParser();
          const configData = await parser.parseConfig(config.config.rcc);

          // Run concurrent requests
          const promises = Array(concurrentCount).fill(0).map(async () => {
            const parser = createConfigParser();
            await parser.initialize();

            const start = performance.now();
            const wrappers = parser.generateAllWrappers(configData);
            const end = performance.now();

            await parser.destroy();
            return end - start;
          });

          const concurrentTimes = await Promise.all(promises);
          const avgTime = concurrentTimes.reduce((a, b) => a + b, 0) / concurrentTimes.length;

          results.push({
            config: config.name,
            concurrentUsers: concurrentCount,
            averageTime: avgTime,
            totalTime: concurrentTimes.reduce((a, b) => a + b, 0),
            throughput: concurrentCount / (concurrentTimes.reduce((a, b) => a + b, 0) / 1000)
          });

        } catch (error) {
          this.log(`Concurrency benchmark failed for ${config.name} with ${concurrentCount} users: ${error.message}`, 'error');
        }
      }
    }

    this.logConcurrencyResults(results);
    return results;
  }

  logConcurrencyResults(results) {
    this.log('\n🚀 Concurrency Results:');
    const byConfig = {};
    results.forEach(result => {
      if (!byConfig[result.config]) byConfig[result.config] = [];
      byConfig[result.config].push(result);
    });

    Object.entries(byConfig).forEach(([config, configResults]) => {
      this.log(`   ${config}:`);
      configResults.forEach(result => {
        this.log(`     ${result.concurrentUsers} users: ${result.averageTime.toFixed(3)}ms avg, ${result.throughput.toFixed(2)} req/s`);
      });
    });
  }

  async benchmarkStability() {
    this.log('🛡️  Benchmarking stability and reliability...');

    const iterations = 10000;
    const errors = [];
    const times = [];

    try {
      const { createConfigParser } = await this.loadConfigParser();
      const config = this.configurations[1]; // Use medium config

      for (let i = 0; i < iterations; i++) {
        try {
          const parser = createConfigParser();
          await parser.initialize();

          const start = performance.now();
          const configData = await parser.parseConfig(config.config.rcc);
          const wrappers = parser.generateAllWrappers(configData);
          const end = performance.now();

          times.push(end - start);
          await parser.destroy();

          // Log progress every 1000 iterations
          if (i % 1000 === 0) {
            this.log(`   Progress: ${i}/${iterations} iterations completed`);
          }

        } catch (error) {
          errors.push({
            iteration: i,
            error: error.message
          });
        }
      }

      const stabilityResults = {
        totalIterations: iterations,
        successfulIterations: times.length,
        errorCount: errors.length,
        successRate: (times.length / iterations * 100).toFixed(4) + '%',
        averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        minTime: times.length > 0 ? Math.min(...times) : 0,
        maxTime: times.length > 0 ? Math.max(...times) : 0,
        timePercentile95: times.length > 0 ? this.percentile(times, 95) : 0,
        timePercentile99: times.length > 0 ? this.percentile(times, 99) : 0,
        errors: errors.slice(0, 10) // First 10 errors
      };

      this.logStabilityResults(stabilityResults);
      return stabilityResults;

    } catch (error) {
      this.log(`Stability benchmark failed: ${error.message}`, 'error');
      throw error;
    }
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  logStabilityResults(results) {
    this.log('\n🛡️  Stability Results:');
    this.log(`   Total Iterations: ${results.totalIterations}`);
    this.log(`   Successful: ${results.successfulIterations} (${results.successRate})`);
    this.log(`   Errors: ${results.errorCount}`);
    this.log(`   Average Time: ${results.averageTime.toFixed(3)}ms`);
    this.log(`   Min/Max: ${results.minTime.toFixed(3)}ms / ${results.maxTime.toFixed(3)}ms`);
    this.log(`   95th Percentile: ${results.timePercentile95.toFixed(3)}ms`);
    this.log(`   99th Percentile: ${results.timePercentile99.toFixed(3)}ms`);

    if (results.errors.length > 0) {
      this.log(`   Sample Errors:`);
      results.errors.forEach((error, i) => {
        this.log(`     ${i + 1}. Iteration ${error.iteration}: ${error.error}`);
      });
    }
  }

  async generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      benchmarks: {
        memory: await this.benchmarkMemoryUsage(),
        speed: await this.benchmarkParsingSpeed(),
        wrappers: await this.benchmarkWrapperGeneration(),
        stability: await this.benchmarkStability()
      },
      configurations: this.configurations.map(c => ({
        name: c.name,
        providerCount: Object.keys(c.config.rcc.providers || {}).length,
        virtualModelCount: Object.keys(c.config.rcc.virtualModels || {}).length,
        configSize: JSON.stringify(c.config).length
      })),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n💾 Performance report saved to: ${reportPath}`);

    return report;
  }

  async runAllBenchmarks() {
    this.log('🚀 Starting RCC System Performance Benchmarking\n');

    try {
      const report = await this.generatePerformanceReport();

      this.log('\n🎯 Performance Summary:');
      this.log(`   Memory benchmarks completed: ${report.benchmarks.memory.length} configurations`);
      this.log(`   Speed benchmarks completed: ${report.benchmarks.speed.length} configurations`);
      this.log(`   Wrapper benchmarks completed: ${report.benchmarks.wrappers.length} configurations`);
      this.log(`   Stability test: ${report.benchmarks.stability.successRate} success rate`);

      // Performance recommendations
      this.log('\n💡 Performance Recommendations:');
      this.analyzePerformance(report);

      return report;

    } catch (error) {
      this.log(`💥 Performance benchmarking failed: ${error.message}`, 'error');
      throw error;
    }
  }

  analyzePerformance(report) {
    const recommendations = [];

    // Memory analysis
    const memoryResults = report.benchmarks.memory;
    const avgMemoryUsage = memoryResults.reduce((sum, r) => sum + r.memoryUsage.heapUsed, 0) / memoryResults.length;
    if (avgMemoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('⚠️  High memory usage detected. Consider optimizing data structures.');
    }

    // Speed analysis
    const speedResults = report.benchmarks.speed;
    const avgSpeed = speedResults.reduce((sum, r) => sum + r.averageTime, 0) / speedResults.length;
    if (avgSpeed > 10) { // 10ms
      recommendations.push('⚠️  Slow parsing detected. Consider caching parsed configurations.');
    }

    // Stability analysis
    const stability = report.benchmarks.stability;
    if (stability.successRate < 99.9) {
      recommendations.push('⚠️  Low stability detected. Review error handling and resource management.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance is within acceptable limits.');
    }

    recommendations.forEach(rec => this.log(`   ${rec}`));
  }
}

// Main execution
async function main() {
  const benchmark = new PerformanceBenchmark();

  try {
    await benchmark.runAllBenchmarks();
    console.log('\n🎉 Performance benchmarking completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Performance benchmarking failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default PerformanceBenchmark;
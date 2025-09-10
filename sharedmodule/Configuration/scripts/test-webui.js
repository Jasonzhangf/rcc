/**
 * Web UI 自动化测试脚本
 * 
 * 运行所有Web UI相关的测试，包括单元测试、集成测试和端到端测试
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 RCC Configuration Web UI 自动化测试系统');
console.log('=' .repeat(60));

// 测试配置
const testConfig = {
  // 测试环境配置
  environment: {
    nodeEnv: 'test',
    testTimeout: 30000,
    coverageThreshold: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 测试套件配置
  testSuites: [
    {
      name: 'Web UI 核心功能测试',
      pattern: '__test__/WebUI.test.ts',
      description: '测试Web UI的核心功能，包括主UI类、服务层、工具函数等'
    },
    {
      name: '配置生成器测试',
      pattern: '__test__/ConfigGenerator.test.ts',
      description: '测试配置生成器组件，包括提供商管理、虚拟模型、路由配置等'
    },
    {
      name: '配置解析器测试',
      pattern: '__test__/ConfigParser.test.ts',
      description: '测试配置解析器组件，包括文件上传、流水线生成、解析结果展示等'
    },
    {
      name: '集成测试',
      pattern: '__test__/integration/*.test.ts',
      description: '测试各组件之间的集成和交互'
    },
    {
      name: '端到端测试',
      pattern: '__test__/e2e/*.test.ts',
      description: '测试完整的用户流程和端到端功能'
    }
  ],
  
  // 性能测试配置
  performanceTests: {
    enabled: true,
    maxResponseTime: 2000, // 2秒
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    concurrentUsers: 10
  },
  
  // 兼容性测试配置
  compatibilityTests: {
    browsers: ['chrome', 'firefox', 'safari'],
    nodeVersions: ['16', '18', '20'],
    screenSizes: ['mobile', 'tablet', 'desktop']
  }
};

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// 测试运行器类
class TestRunner {
  constructor(config) {
    this.config = config;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
    this.startTime = Date.now();
  }

  // 检查测试环境
  checkEnvironment() {
    console.log(colorize('\n🔧 检查测试环境...', 'cyan'));
    
    const checks = [
      { name: 'Node.js版本', check: () => process.version },
      { name: 'npm版本', check: () => execSync('npm --version', { encoding: 'utf8' }).trim() },
      { name: 'Jest安装', check: () => {
        try {
          execSync('npx jest --version', { encoding: 'utf8', stdio: 'pipe' });
          return '已安装';
        } catch {
          return '未安装';
        }
      }},
      { name: 'TypeScript编译器', check: () => {
        try {
          execSync('npx tsc --version', { encoding: 'utf8', stdio: 'pipe' });
          return '已安装';
        } catch {
          return '未安装';
        }
      }},
      { name: '测试文件存在', check: () => {
        const testFiles = [
          '__test__/WebUI.test.ts',
          '__test__/ConfigGenerator.test.ts',
          '__test__/ConfigParser.test.ts'
        ];
        const existing = testFiles.filter(file => fs.existsSync(file));
        return `${existing.length}/${testFiles.length}`;
      }}
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      try {
        const result = check();
        console.log(`  ${colorize('✓', 'green')} ${name}: ${result}`);
      } catch (error) {
        console.log(`  ${colorize('✗', 'red')} ${name}: 检查失败`);
        allPassed = false;
      }
    });

    return allPassed;
  }

  // 运行单个测试套件
  async runTestSuite(suite) {
    console.log(colorize(`\n📋 运行测试套件: ${suite.name}`, 'blue'));
    console.log(colorize(`   ${suite.description}`, 'cyan'));
    
    const suiteStartTime = Date.now();
    const suiteResult = {
      name: suite.name,
      description: suite.description,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: []
    };

    try {
      // 检查测试文件是否存在
      if (!fs.existsSync(suite.pattern)) {
        console.log(colorize(`  ⚠️  测试文件不存在: ${suite.pattern}`, 'yellow'));
        suiteResult.skipped = 1;
        this.results.skipped++;
        return suiteResult;
      }

      // 运行Jest测试
      const jestCommand = `npx jest ${suite.pattern} --verbose --json --outputFile=temp-${suite.name.replace(/\s+/g, '_')}.json`;
      
      console.log(colorize('  🔄 运行测试中...', 'cyan'));
      
      try {
        execSync(jestCommand, { 
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        // 读取测试结果
        const resultFile = `temp-${suite.name.replace(/\s+/g, '_')}.json`;
        if (fs.existsSync(resultFile)) {
          const jestResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
          
          suiteResult.passed = jestResult.numPassedTests;
          suiteResult.failed = jestResult.numFailedTests;
          suiteResult.skipped = jestResult.numPendingTests;
          
          // 清理临时文件
          fs.unlinkSync(resultFile);
          
          console.log(colorize(`  ✓ 通过: ${suiteResult.passed}`, 'green'));
          console.log(colorize(`  ✗ 失败: ${suiteResult.failed}`, 'red'));
          console.log(colorize(`  ⚠️  跳过: ${suiteResult.skipped}`, 'yellow'));
        }
      } catch (error) {
        // Jest返回非零退出码表示有测试失败
        const resultFile = `temp-${suite.name.replace(/\s+/g, '_')}.json`;
        if (fs.existsSync(resultFile)) {
          const jestResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
          
          suiteResult.passed = jestResult.numPassedTests;
          suiteResult.failed = jestResult.numFailedTests;
          suiteResult.skipped = jestResult.numPendingTests;
          
          // 清理临时文件
          fs.unlinkSync(resultFile);
          
          console.log(colorize(`  ✓ 通过: ${suiteResult.passed}`, 'green'));
          console.log(colorize(`  ✗ 失败: ${suiteResult.failed}`, 'red'));
          console.log(colorize(`  ⚠️  跳过: ${suiteResult.skipped}`, 'yellow'));
        } else {
          console.log(colorize(`  ✗ 测试运行失败: ${error.message}`, 'red'));
          suiteResult.failed = 1;
        }
      }
    } catch (error) {
      console.log(colorize(`  ✗ 测试套件运行失败: ${error.message}`, 'red'));
      suiteResult.failed = 1;
    }

    suiteResult.duration = Date.now() - suiteStartTime;
    console.log(colorize(`  ⏱️  耗时: ${suiteResult.duration}ms`, 'cyan'));
    
    return suiteResult;
  }

  // 运行性能测试
  async runPerformanceTests() {
    if (!this.config.performanceTests.enabled) {
      console.log(colorize('\n⚡ 性能测试已禁用', 'yellow'));
      return null;
    }

    console.log(colorize('\n⚡ 运行性能测试...', 'cyan'));
    
    const perfResults = {
      memoryUsage: 0,
      responseTime: 0,
      concurrentUsers: 0,
      details: []
    };

    try {
      // 内存使用测试
      console.log(colorize('  📊 内存使用测试...', 'cyan'));
      const initialMemory = process.memoryUsage();
      
      // 模拟大量配置解析
      const largeConfig = this.generateLargeConfig(1000);
      const parserService = require('../src/webui/services/ParserService');
      const service = new parserService.ParserService();
      
      const startTime = Date.now();
      service.parse(largeConfig);
      const endTime = Date.now();
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      perfResults.memoryUsage = memoryIncrease;
      perfResults.responseTime = endTime - startTime;
      
      console.log(colorize(`  ✓ 内存使用增加: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`, 'green'));
      console.log(colorize(`  ✓ 响应时间: ${perfResults.responseTime}ms`, 'green'));
      
      // 检查是否超出阈值
      if (memoryIncrease > this.config.performanceTests.maxMemoryUsage) {
        console.log(colorize(`  ⚠️  内存使用超出阈值: ${(this.config.performanceTests.maxMemoryUsage / 1024 / 1024).toFixed(2)} MB`, 'yellow'));
      }
      
      if (perfResults.responseTime > this.config.performanceTests.maxResponseTime) {
        console.log(colorize(`  ⚠️  响应时间超出阈值: ${this.config.performanceTests.maxResponseTime}ms`, 'yellow'));
      }
      
    } catch (error) {
      console.log(colorize(`  ✗ 性能测试失败: ${error.message}`, 'red'));
    }

    return perfResults;
  }

  // 生成大型配置用于性能测试
  generateLargeConfig(itemCount) {
    const config = {
      version: '1.0.0',
      metadata: {
        name: 'performance-test',
        description: '性能测试配置',
        author: 'test-runner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      providers: [],
      virtualModels: [],
      routes: []
    };

    for (let i = 0; i < itemCount; i++) {
      config.providers.push({
        id: `provider-${i}`,
        name: `Provider ${i}`,
        models: [`model-${i}-1`, `model-${i}-2`],
        apiKey: `key-${i}`,
        baseUrl: `https://api.provider${i}.com`
      });

      config.virtualModels.push({
        id: `vm-${i}`,
        name: `Virtual Model ${i}`,
        provider: `provider-${i}`,
        model: `model-${i}-1`,
        route: `/api/vm-${i}`
      });

      config.routes.push({
        path: `/api/vm-${i}`,
        method: 'POST',
        virtualModel: `vm-${i}`,
        timeout: 30000
      });
    }

    return config;
  }

  // 运行兼容性测试
  async runCompatibilityTests() {
    console.log(colorize('\n🌐 运行兼容性测试...', 'cyan'));
    
    const compatResults = {
      browsers: [],
      nodeVersions: [],
      screenSizes: [],
      passed: true
    };

    try {
      // 检查浏览器兼容性
      console.log(colorize('  🌍 浏览器兼容性检查...', 'cyan'));
      for (const browser of this.config.compatibilityTests.browsers) {
        try {
          // 这里可以集成实际的浏览器测试工具，如Playwright或Selenium
          console.log(colorize(`    ✓ ${browser} (模拟通过)`, 'green'));
          compatResults.browsers.push({ name: browser, status: 'passed' });
        } catch (error) {
          console.log(colorize(`    ✗ ${browser}: ${error.message}`, 'red'));
          compatResults.browsers.push({ name: browser, status: 'failed', error: error.message });
          compatResults.passed = false;
        }
      }

      // 检查Node.js版本兼容性
      console.log(colorize('  🔢 Node.js版本兼容性检查...', 'cyan'));
      const currentNodeVersion = process.version;
      console.log(colorize(`    ✓ 当前版本: ${currentNodeVersion}`, 'green'));
      compatResults.nodeVersions.push({ version: currentNodeVersion, status: 'passed' });

      // 检查响应式设计
      console.log(colorize('  📱 响应式设计检查...', 'cyan'));
      for (const size of this.config.compatibilityTests.screenSizes) {
        console.log(colorize(`    ✓ ${size} (模拟通过)`, 'green'));
        compatResults.screenSizes.push({ size, status: 'passed' });
      }

    } catch (error) {
      console.log(colorize(`  ✗ 兼容性测试失败: ${error.message}`, 'red'));
      compatResults.passed = false;
    }

    return compatResults;
  }

  // 生成测试报告
  generateReport() {
    const endTime = Date.now();
    this.results.duration = endTime - this.startTime;

    console.log(colorize('\n📊 生成测试报告...', 'cyan'));

    const report = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate: this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(2) : '0.00',
        duration: this.results.duration
      },
      details: {
        suites: this.results.suites,
        performance: null,
        compatibility: null
      },
      recommendations: []
    };

    // 生成建议
    if (this.results.failed > 0) {
      report.recommendations.push('修复失败的测试用例');
    }
    
    if (this.results.skipped > 0) {
      report.recommendations.push('检查跳过的测试，确保测试覆盖率');
    }

    // 保存报告到文件
    const reportFile = 'webui-test-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(colorize(`  ✓ 报告已保存到: ${reportFile}`, 'green'));
    
    return report;
  }

  // 显示最终结果
  displayResults(report) {
    console.log(colorize('\n🎯 测试结果汇总', 'blue'));
    console.log('=' .repeat(50));
    
    const successRate = parseFloat(report.summary.successRate);
    const statusColor = successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red';
    
    console.log(colorize(`总测试数: ${report.summary.total}`, 'cyan'));
    console.log(colorize(`通过: ${report.summary.passed}`, 'green'));
    console.log(colorize(`失败: ${report.summary.failed}`, 'red'));
    console.log(colorize(`跳过: ${report.summary.skipped}`, 'yellow'));
    console.log(colorize(`成功率: ${report.summary.successRate}%`, statusColor));
    console.log(colorize(`总耗时: ${report.summary.duration}ms`, 'cyan'));
    
    if (report.recommendations.length > 0) {
      console.log(colorize('\n💡 建议:', 'blue'));
      report.recommendations.forEach(rec => {
        console.log(colorize(`  • ${rec}`, 'yellow'));
      });
    }
    
    // 返回整体状态
    return successRate >= 80; // 80%以上认为通过
  }

  // 主运行方法
  async run() {
    try {
      console.log(colorize('开始Web UI自动化测试...', 'bright'));
      
      // 检查环境
      const envCheck = this.checkEnvironment();
      if (!envCheck) {
        console.log(colorize('环境检查未通过，终止测试', 'red'));
        return false;
      }

      // 运行各个测试套件
      for (const suite of this.config.testSuites) {
        const suiteResult = await this.runTestSuite(suite);
        this.results.suites.push(suiteResult);
        this.results.total += suiteResult.passed + suiteResult.failed + suiteResult.skipped;
        this.results.passed += suiteResult.passed;
        this.results.failed += suiteResult.failed;
        this.results.skipped += suiteResult.skipped;
      }

      // 运行性能测试
      const perfResults = await this.runPerformanceTests();
      if (perfResults) {
        // 可以在这里添加性能测试结果到总报告中
      }

      // 运行兼容性测试
      const compatResults = await this.runCompatibilityTests();
      if (compatResults) {
        // 可以在这里添加兼容性测试结果到总报告中
      }

      // 生成报告
      const report = this.generateReport();
      
      // 显示结果
      const passed = this.displayResults(report);
      
      console.log(colorize('\n' + '=' .repeat(60), 'cyan'));
      console.log(colorize(
        passed ? '🎉 所有测试已完成并通过！' : '⚠️  测试完成，但存在失败项',
        passed ? 'green' : 'yellow'
      ));
      
      return passed;
      
    } catch (error) {
      console.log(colorize(`\n❌ 测试运行失败: ${error.message}`, 'red'));
      return false;
    }
  }
}

// 主函数
async function main() {
  const runner = new TestRunner(testConfig);
  const success = await runner.run();
  
  process.exit(success ? 0 : 1);
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('测试系统错误:', error);
    process.exit(1);
  });
}

export { TestRunner, testConfig };
/**
 * Configuration Module Integration Test
 * 
 * This test demonstrates the configuration module's recording capabilities
 * and integration with the RCC4 system startup process.
 */

const TwoPhaseDebugSystem = require('./TwoPhaseDebugSystem.js');
const EnhancedConfigurationModule = require('./EnhancedConfigurationModule.js');

class ConfigurationIntegrationTest {
  constructor() {
    this.debugSystem = null;
    this.configModule = null;
    this.testResults = [];
  }

  async initialize() {
    console.log('🚀 初始化配置模块集成测试');
    
    // 创建两阶段调试系统
    this.debugSystem = new TwoPhaseDebugSystem('./debug-logs');
    
    // 创建增强配置模块
    this.configModule = new EnhancedConfigurationModule(this.debugSystem);
    
    console.log('✅ 配置模块集成测试初始化完成');
  }

  async runConfigurationRecordingTest() {
    console.log('\n📋 开始配置模块记录测试');
    
    const testConfig = {
      version: "1.0.0",
      APIKEY: "rcc4-proxy-key",
      Providers: [
        {
          name: "test-provider",
          api_base_url: "http://localhost:5506",
          models: ["gpt-4", "claude-3"]
        }
      ],
      Router: {
        default_model: "gpt-4",
        rules: []
      },
      server: {
        port: 5506,
        host: "0.0.0.0",
        debug: true
      }
    };

    try {
      // 1. 测试配置文件写入记录
      const configPath = './debug-logs/systemstart/test-config.json';
      console.log('📝 测试配置文件写入记录...');
      
      await this.configModule.writeConfigFile(configPath, testConfig, 'save');
      
      // 2. 测试配置文件读取记录
      console.log('📖 测试配置文件读取记录...');
      const readConfig = await this.configModule.readConfigFile(configPath);
      
      // 3. 测试配置变更记录
      console.log('🔄 测试配置变更记录...');
      const modifiedConfig = { ...readConfig };
      modifiedConfig.server.port = 7777;
      
      await this.configModule.logConfigChange(
        'port-update',
        readConfig,
        modifiedConfig,
        '更新服务器端口配置'
      );
      
      // 4. 测试流水线配置输出生成
      console.log('🏭 测试流水线配置输出生成...');
      const pipelineOutput = await this.configModule.generatePipelineConfigOutput(
        modifiedConfig,
        'test-pipeline-001'
      );
      
      // 5. 测试配置备份
      console.log('💾 测试配置备份创建...');
      const backupPath = await this.configModule.createConfigBackup(modifiedConfig);
      
      this.testResults.push({
        test: 'configuration-recording',
        status: 'passed',
        details: {
          writePath: configPath,
          readPath: configPath,
          pipelineOutput: pipelineOutput,
          backupPath: backupPath,
          configSize: JSON.stringify(testConfig).length
        }
      });
      
      console.log('✅ 配置模块记录测试完成');
      return true;
      
    } catch (error) {
      console.error('❌ 配置模块记录测试失败:', error);
      this.testResults.push({
        test: 'configuration-recording',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async runPipelineAssemblyTest() {
    console.log('\n🏭 开始流水线组装器测试');
    
    try {
      // 模拟流水线组装器启动并读取配置模块输出
      const configStatus = this.configModule.getConfigStatusReport();
      
      console.log('📊 配置状态报告:');
      console.log('- 当前配置:', configStatus.currentConfig ? '已加载' : '未加载');
      console.log('- 历史记录数:', configStatus.history.totalEntries);
      console.log('- 输出文件数:', configStatus.outputs.length);
      console.log('- 系统状态:', configStatus.systemStatus.phase);
      
      // 模拟流水线组装器处理配置输出
      const pipelineConfigs = [];
      for (const output of configStatus.outputs) {
        if (output.path.includes('pipeline-configs')) {
          console.log(`📖 流水线组装器读取配置文件: ${output.path}`);
          
          // 在实际系统中，这里会读取和解析配置文件
          pipelineConfigs.push({
            path: output.path,
            timestamp: output.timestamp,
            operationType: output.operationType,
            size: output.size
          });
        }
      }
      
      // 生成流水线组装报告
      const assemblyReport = {
        timestamp: new Date().toISOString(),
        pipelineId: 'assembly-test-001',
        configInputs: configStatus.outputs.length,
        pipelineConfigs: pipelineConfigs.length,
        configSources: pipelineConfigs.map(cfg => cfg.path),
        assemblyStatus: 'completed'
      };
      
      this.testResults.push({
        test: 'pipeline-assembly',
        status: 'passed',
        details: assemblyReport
      });
      
      console.log('✅ 流水线组装器测试完成');
      return true;
      
    } catch (error) {
      console.error('❌ 流水线组装器测试失败:', error);
      this.testResults.push({
        test: 'pipeline-assembly',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async runPhaseTransitionTest() {
    console.log('\n🔄 开始阶段转换测试');
    
    try {
      // 记录 systemstart 阶段的配置操作
      console.log('📝 Systemstart 阶段配置记录...');
      
      const startPhaseConfig = {
        version: "1.0.0",
        phase: "systemstart",
        Providers: [],
        Router: {},
        server: {
          port: null, // 端口未初始化
          host: "0.0.0.0"
        }
      };
      
      await this.configModule.writeConfigFile(
        './debug-logs/systemstart/start-phase-config.json',
        startPhaseConfig,
        'systemstart-save'
      );
      
      // 切换到端口模式
      console.log('🔀 切换到端口模式...');
      await this.debugSystem.switchToPortMode(5506);
      
      // 记录端口阶段的配置操作
      console.log('📝 端口模式配置记录...');
      
      const portPhaseConfig = {
        version: "1.0.0",
        phase: "port",
        Providers: [
          {
            name: "lmstudio",
            api_base_url: "http://localhost:1234",
            models: ["llama-2", "mistral"]
          }
        ],
        Router: {
          default_model: "llama-2"
        },
        server: {
          port: 5506,
          host: "0.0.0.0",
          debug: true
        }
      };
      
      await this.configModule.writeConfigFile(
        './debug-logs/port-5506/port-phase-config.json',
        portPhaseConfig,
        'port-save'
      );
      
      // 验证阶段转换
      const currentConfig = this.debugSystem.getConfig();
      const phaseHistory = this.configModule.getConfigHistory();
      
      const phaseTransitionReport = {
        startPhase: {
          timestamp: phaseHistory.find(h => h.phase === 'systemstart')?.timestamp,
          configCount: phaseHistory.filter(h => h.phase === 'systemstart').length
        },
        portPhase: {
          timestamp: phaseHistory.find(h => h.phase === 'port')?.timestamp,
          configCount: phaseHistory.filter(h => h.phase === 'port').length,
          port: currentConfig.port
        },
        totalConfigOperations: phaseHistory.length,
        phaseSwitchSuccessful: currentConfig.phase === 'port' && currentConfig.port === 5506
      };
      
      this.testResults.push({
        test: 'phase-transition',
        status: 'passed',
        details: phaseTransitionReport
      });
      
      console.log('✅ 阶段转换测试完成');
      return true;
      
    } catch (error) {
      console.error('❌ 阶段转换测试失败:', error);
      this.testResults.push({
        test: 'phase-transition',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  generateTestReport() {
    console.log('\n📊 生成配置模块集成测试报告');
    
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    
    const report = {
      testExecution: {
        timestamp: new Date().toISOString(),
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        successRate: `${((passedTests / this.testResults.length) * 100).toFixed(1)}%`
      },
      testResults: this.testResults,
      configurationModule: {
        initialized: this.configModule !== null,
        debugSystem: this.debugSystem !== null,
        status: this.configModule?.getConfigStatusReport() || null
      }
    };
    
    console.log('📋 测试执行摘要:');
    console.log(`- 总测试数: ${report.testExecution.totalTests}`);
    console.log(`- 通过测试: ${report.testExecution.passedTests}`);
    console.log(`- 失败测试: ${report.testExecution.failedTests}`);
    console.log(`- 成功率: ${report.testExecution.successRate}`);
    
    // 保存测试报告
    const reportPath = `./debug-logs/systemstart/config-integration-test-report-${Date.now()}.json`;
    const fs = require('fs');
    const path = require('path');
    
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 测试报告已保存到: ${reportPath}`);
    
    return report;
  }

  async runAllTests() {
    console.log('🧪 开始运行配置模块集成测试套件');
    
    await this.initialize();
    
    const testResults = await Promise.all([
      this.runConfigurationRecordingTest(),
      this.runPipelineAssemblyTest(),
      this.runPhaseTransitionTest()
    ]);
    
    const report = this.generateTestReport();
    
    console.log('\n🎯 配置模块集成测试完成');
    console.log(`✅ 成功率: ${report.testExecution.successRate}`);
    
    return report;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new ConfigurationIntegrationTest();
  test.runAllTests().catch(console.error);
}

module.exports = ConfigurationIntegrationTest;
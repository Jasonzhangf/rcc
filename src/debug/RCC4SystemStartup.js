/**
 * RCC4 System Startup with Enhanced Configuration Logging
 * 
 * This script demonstrates the complete RCC4 system startup process
 * with enhanced configuration module recording and pipeline assembly.
 */

const TwoPhaseDebugSystem = require('./TwoPhaseDebugSystem.js');
const EnhancedConfigurationModule = require('./EnhancedConfigurationModule.js');
const fs = require('fs');
const path = require('path');

class RCC4SystemStartup {
  constructor() {
    this.debugSystem = null;
    this.configModule = null;
    this.startupLog = [];
    this.pipelineConfigs = new Map();
  }

  logStartupEvent(phase, event, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      phase,
      event,
      details
    };
    this.startupLog.push(logEntry);
    console.log(`[${phase.toUpperCase()}] ${event}:`, JSON.stringify(details, null, 2));
  }

  async initializeSystem() {
    console.log('🚀 初始化RCC4系统');
    
    // 第一阶段：systemstart初始化
    this.logStartupEvent('systemstart', 'system-initialization', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });

    // 初始化两阶段调试系统
    this.debugSystem = new TwoPhaseDebugSystem('./debug-logs');
    this.logStartupEvent('systemstart', 'debug-system-initialized', {
      baseDirectory: './debug-logs',
      phase: 'systemstart'
    });

    // 初始化增强配置模块
    this.configModule = new EnhancedConfigurationModule(this.debugSystem);
    this.logStartupEvent('systemstart', 'config-module-initialized', {
      status: 'ready'
    });
  }

  async loadSystemConfiguration(configPath) {
    console.log('\n📋 加载系统配置');
    
    try {
      // 检查配置文件是否存在
      if (!fs.existsSync(configPath)) {
        throw new Error(`配置文件不存在: ${configPath}`);
      }

      // 记录配置文件读取操作
      this.logStartupEvent('systemstart', 'loading-configuration', {
        configPath,
        fileExists: true
      });

      // 读取配置文件
      const configData = await this.configModule.readConfigFile(configPath);
      
      this.logStartupEvent('systemstart', 'configuration-loaded', {
        configPath,
        configSize: JSON.stringify(configData).length,
        providers: configData.Providers?.length || 0,
        serverConfig: configData.server
      });

      return configData;
    } catch (error) {
      this.logStartupEvent('systemstart', 'configuration-load-failed', {
        configPath,
        error: error.message
      });
      throw error;
    }
  }

  async validateConfiguration(configData) {
    console.log('\n✅ 验证系统配置');
    
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 验证必需字段
    const requiredFields = ['version', 'Providers', 'Router'];
    for (const field of requiredFields) {
      if (!configData[field]) {
        validationResults.errors.push(`缺少必需字段: ${field}`);
        validationResults.isValid = false;
      }
    }

    // 验证Providers配置
    if (configData.Providers && Array.isArray(configData.Providers)) {
      for (let i = 0; i < configData.Providers.length; i++) {
        const provider = configData.Providers[i];
        if (!provider.name || !provider.api_base_url) {
          validationResults.errors.push(`Provider[${i}]缺少name或api_base_url字段`);
          validationResults.isValid = false;
        }
      }
    }

    // 验证服务器配置
    if (configData.server) {
      if (!configData.server.port || configData.server.port <= 0) {
        validationResults.warnings.push('服务器端口配置可能无效');
      }
    }

    this.logStartupEvent('systemstart', 'configuration-validation', validationResults);
    
    if (!validationResults.isValid) {
      throw new Error(`配置验证失败: ${validationResults.errors.join(', ')}`);
    }

    return validationResults;
  }

  async initializePort(configData) {
    console.log('\n🔌 初始化端口服务');
    
    const port = configData.server?.port || 5506;
    
    this.logStartupEvent('systemstart', 'port-initialization-start', {
      port,
      host: configData.server?.host || '0.0.0.0'
    });

    // 切换调试系统到端口模式
    await this.debugSystem.switchToPortMode(port);
    
    this.logStartupEvent('port', 'port-mode-activated', {
      port,
      portDirectory: `debug-logs/port-${port}`
    });

    // 生成端口特定配置
    const portConfig = {
      ...configData,
      startup: {
        timestamp: new Date().toISOString(),
        port,
        phase: 'port',
        debugDirectory: `debug-logs/port-${port}`
      }
    };

    // 保存端口配置
    const portConfigPath = `./debug-logs/port-${port}/system-config.json`;
    await this.configModule.writeConfigFile(portConfigPath, portConfig, 'port-system-save');
    
    this.logStartupEvent('port', 'port-configuration-saved', {
      portConfigPath,
      configSize: JSON.stringify(portConfig).length
    });

    return port;
  }

  async generatePipelineConfiguration(configData, port) {
    console.log('\n🏭 生成流水线配置');
    
    const pipelineId = `rcc4-pipeline-${Date.now()}`;
    
    try {
      // 为每个Provider生成流水线配置
      const pipelineConfigs = [];
      
      for (const provider of configData.Providers) {
        const pipelineConfig = {
          pipelineId: `${pipelineId}-${provider.name}`,
          timestamp: new Date().toISOString(),
          provider: provider.name,
          apiBaseUrl: provider.api_base_url,
          models: provider.models || [],
          extractedConfig: {
            providers: [provider],
            router: configData.Router,
            server: configData.server,
            apiKey: configData.APIKEY || 'rcc4-proxy-key'
          },
          validation: {
            isValid: true,
            validatedAt: new Date().toISOString(),
            errors: []
          },
          port: port
        };
        
        pipelineConfigs.push(pipelineConfig);
        this.pipelineConfigs.set(pipelineConfig.pipelineId, pipelineConfig);
      }

      // 生成主流水线配置
      const mainPipelineConfig = {
        pipelineId,
        timestamp: new Date().toISOString(),
        systemConfig: configData,
        providerConfigs: pipelineConfigs,
        startup: {
          phase: 'port',
          port: port,
          debugDirectory: `debug-logs/port-${port}`
        },
        validation: {
          isValid: true,
          validatedAt: new Date().toISOString(),
          errors: []
        }
      };

      // 保存流水线配置
      const pipelineConfigPath = await this.configModule.generatePipelineConfigOutput(
        mainPipelineConfig,
        pipelineId
      );

      this.logStartupEvent('port', 'pipeline-configuration-generated', {
        pipelineId,
        configPath: pipelineConfigPath,
        providerCount: pipelineConfigs.length
      });

      return { pipelineId, pipelineConfigs, mainPipelineConfig };
    } catch (error) {
      this.logStartupEvent('port', 'pipeline-configuration-failed', {
        error: error.message
      });
      throw error;
    }
  }

  async simulatePipelineAssembly(pipelineConfigs) {
    console.log('\n🔧 模拟流水线组装器启动');
    
    const assemblyResults = {
      totalConfigs: pipelineConfigs.length,
      assembledConfigs: 0,
      failedConfigs: 0,
      assemblyErrors: []
    };

    for (const pipelineConfig of pipelineConfigs) {
      try {
        // 模拟流水线组装器读取配置文件
        this.logStartupEvent('port', 'pipeline-assembly-reading-config', {
          pipelineId: pipelineConfig.pipelineId,
          provider: pipelineConfig.provider,
          configSize: JSON.stringify(pipelineConfig).length
        });

        // 在实际系统中，这里会：
        // 1. 读取配置文件
        // 2. 验证配置结构
        // 3. 初始化Provider连接
        // 4. 设置路由规则
        // 5. 启动服务实例
        
        assemblyResults.assembledConfigs++;
        
        this.logStartupEvent('port', 'pipeline-assembly-success', {
          pipelineId: pipelineConfig.pipelineId,
          provider: pipelineConfig.provider,
          status: 'assembled'
        });
        
      } catch (error) {
        assemblyResults.failedConfigs++;
        assemblyResults.assemblyErrors.push({
          pipelineId: pipelineConfig.pipelineId,
          error: error.message
        });
        
        this.logStartupEvent('port', 'pipeline-assembly-failed', {
          pipelineId: pipelineConfig.pipelineId,
          error: error.message
        });
      }
    }

    this.logStartupEvent('port', 'pipeline-assembly-complete', assemblyResults);
    return assemblyResults;
  }

  async generateStartupReport() {
    console.log('\n📊 生成系统启动报告');
    
    const configStatus = this.configModule.getConfigStatusReport();
    
    const report = {
      startupSummary: {
        timestamp: new Date().toISOString(),
        totalStartupEvents: this.startupLog.length,
        pipelineConfigsGenerated: this.pipelineConfigs.size,
        systemPhase: this.debugSystem.getConfig().phase,
        systemPort: this.debugSystem.getConfig().port
      },
      configurationModule: {
        totalConfigOperations: configStatus.history.totalEntries,
        configOutputs: configStatus.outputs.length,
        currentConfig: configStatus.currentConfig ? 'loaded' : 'not-loaded',
        memoryUsage: configStatus.systemStatus.memoryUsage
      },
      startupTimeline: this.startupLog.map(entry => ({
        timestamp: entry.timestamp,
        phase: entry.phase,
        event: entry.event,
        summary: Object.keys(entry.details).join(', ')
      })),
      pipelineAssembly: {
        totalConfigs: this.pipelineConfigs.size,
        configDetails: Array.from(this.pipelineConfigs.entries()).map(([id, config]) => ({
          id,
          provider: config.provider,
          port: config.port,
          timestamp: config.timestamp
        }))
      },
      systemStatus: {
        phase: this.debugSystem.getConfig().phase,
        port: this.debugSystem.getConfig().port,
        debugDirectory: this.debugSystem.getCurrentLogDirectory(),
        uptime: process.uptime()
      }
    };

    // 保存启动报告
    const reportPath = `./debug-logs/port-${this.debugSystem.getConfig().port}/startup-report-${Date.now()}.json`;
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.logStartupEvent('port', 'startup-report-generated', {
      reportPath,
      reportSize: JSON.stringify(report).length
    });

    return report;
  }

  async startup(configPath) {
    console.log('🚀 RCC4系统启动开始');
    
    try {
      // 1. 系统初始化
      await this.initializeSystem();
      
      // 2. 加载配置
      const configData = await this.loadSystemConfiguration(configPath);
      
      // 3. 验证配置
      await this.validateConfiguration(configData);
      
      // 4. 初始化端口
      const port = await this.initializePort(configData);
      
      // 5. 生成流水线配置
      const { pipelineId, pipelineConfigs, mainPipelineConfig } = await this.generatePipelineConfiguration(configData, port);
      
      // 6. 模拟流水线组装
      const assemblyResults = await this.simulatePipelineAssembly(pipelineConfigs);
      
      // 7. 生成启动报告
      const startupReport = await this.generateStartupReport();
      
      console.log('\n✅ RCC4系统启动完成');
      console.log(`📊 系统状态: ${startupReport.systemStatus.phase} 模式`);
      console.log(`🔌 服务端口: ${startupReport.systemStatus.port}`);
      console.log(`🏭 流水线配置: ${startupReport.pipelineAssembly.totalConfigs} 个`);
      console.log(`📝 配置操作: ${startupReport.configurationModule.totalConfigOperations} 次`);
      console.log(`📄 启动报告: ${reportPath}`);
      
      return {
        success: true,
        port,
        pipelineId,
        startupReport,
        configData
      };
      
    } catch (error) {
      console.error('❌ RCC4系统启动失败:', error);
      
      // 生成错误报告
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        startupLog: this.startupLog,
        systemPhase: this.debugSystem?.getConfig()?.phase || 'unknown'
      };
      
      const errorReportPath = './debug-logs/systemstart/startup-error-report.json';
      fs.writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));
      
      return {
        success: false,
        error: error.message,
        errorReportPath
      };
    }
  }
}

// 如果直接运行此文件，执行系统启动
if (require.main === module) {
  const startup = new RCC4SystemStartup();
  
  // 使用默认配置路径或从命令行参数获取
  const configPath = process.argv[2] || './debug-logs/systemstart/test-config.json';
  
  startup.startup(configPath).then((result) => {
    if (result.success) {
      console.log('\n🎉 RCC4系统启动成功！');
      process.exit(0);
    } else {
      console.log('\n💥 RCC4系统启动失败！');
      process.exit(1);
    }
  }).catch((error) => {
    console.error('💥 系统启动异常:', error);
    process.exit(1);
  });
}

module.exports = RCC4SystemStartup;
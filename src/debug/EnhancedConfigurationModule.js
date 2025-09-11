/**
 * Enhanced Configuration Module with Detailed Logging
 * 
 * This module provides comprehensive configuration file reading and writing logging,
 * integrated with the two-phase debug system for RCC4.
 */

const TwoPhaseDebugSystem = require('./TwoPhaseDebugSystem.js');
const fs = require('fs');
const path = require('path');

class EnhancedConfigurationModule {
  constructor(debugSystem) {
    this.debugSystem = debugSystem;
    this.configHistory = [];
    this.currentConfig = null;
    this.configOutputs = new Map();
  }
  
  /**
   * 记录配置文件读取操作
   * @param configPath - 配置文件路径
   * @param configData - 读取到的配置数据
   * @param source - 配置来源（systemstart/port）
   */
  async logConfigRead(configPath, configData, source = 'system') {
    const logEntry = {
      operation: 'CONFIG_READ',
      timestamp: new Date().toISOString(),
      configPath,
      configSize: JSON.stringify(configData).length,
      source,
      configKeys: Object.keys(configData),
      providers: configData.Providers?.length || 0,
      routerKeys: configData.Router ? Object.keys(configData.Router) : [],
      serverConfig: configData.server ? {
        port: configData.server.port,
        host: configData.server.host,
        debug: configData.server.debug
      } : null
    };
    
    this.debugSystem.log('info', `配置文件读取完成: ${configPath}`, logEntry, 'logConfigRead');
    this.configHistory.push(logEntry);
    
    return logEntry;
  }
  
  /**
   * 记录配置文件写入操作
   * @param configPath - 配置文件路径
   * @param configData - 写入的配置数据
   * @param operationType - 操作类型（save/update/export）
   */
  async logConfigWrite(configPath, configData, operationType = 'save') {
    const logEntry = {
      operation: 'CONFIG_WRITE',
      timestamp: new Date().toISOString(),
      configPath,
      operationType,
      configSize: JSON.stringify(configData).length,
      configKeys: Object.keys(configData),
      providers: configData.Providers?.length || 0,
      routerKeys: configData.Router ? Object.keys(configData.Router) : [],
      serverConfig: configData.server ? {
        port: configData.server.port,
        host: configData.server.host,
        debug: configData.server.debug
      } : null
    };
    
    this.debugSystem.log('info', `配置文件写入完成: ${configPath}`, logEntry, 'logConfigWrite');
    this.configHistory.push(logEntry);
    
    return logEntry;
  }
  
  /**
   * 读取配置文件并记录详细日志
   * @param configPath - 配置文件路径
   */
  async readConfigFile(configPath) {
    try {
      this.debugSystem.log('info', `开始读取配置文件: ${configPath}`, {}, 'readConfigFile');
      
      // 检查文件是否存在
      if (!fs.existsSync(configPath)) {
        throw new Error(`配置文件不存在: ${configPath}`);
      }
      
      // 读取文件
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const configData = JSON.parse(fileContent);
      
      // 记录读取操作
      await this.logConfigRead(configPath, configData, this.debugSystem.getConfig().phase);
      
      // 验证配置结构
      await this.validateConfigStructure(configData);
      
      this.currentConfig = configData;
      
      this.debugSystem.log('info', `配置文件读取成功: ${configPath}`, {
        fileSize: fileContent.length,
        configKeys: Object.keys(configData)
      }, 'readConfigFile');
      
      return configData;
    } catch (error) {
      this.debugSystem.log('error', `配置文件读取失败: ${configPath}`, {
        error: error.message,
        stack: error.stack
      }, 'readConfigFile');
      throw error;
    }
  }
  
  /**
   * 写入配置文件并记录详细日志
   * @param configPath - 配置文件路径
   * @param configData - 配置数据
   * @param operationType - 操作类型
   */
  async writeConfigFile(configPath, configData, operationType = 'save') {
    try {
      this.debugSystem.log('info', `开始写入配置文件: ${configPath}`, {
        operationType,
        configKeys: Object.keys(configData)
      }, 'writeConfigFile');
      
      // 验证配置结构
      await this.validateConfigStructure(configData);
      
      // 创建目录（如果不存在）
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // 写入文件
      const configContent = JSON.stringify(configData, null, 2);
      fs.writeFileSync(configPath, configContent);
      
      // 记录写入操作
      await this.logConfigWrite(configPath, configData, operationType);
      
      // 保存输出文件记录
      this.configOutputs.set(configPath, {
        timestamp: new Date().toISOString(),
        operationType,
        size: configContent.length
      });
      
      this.debugSystem.log('info', `配置文件写入成功: ${configPath}`, {
        fileSize: configContent.length
      }, 'writeConfigFile');
      
      return configPath;
    } catch (error) {
      this.debugSystem.log('error', `配置文件写入失败: ${configPath}`, {
        error: error.message,
        stack: error.stack
      }, 'writeConfigFile');
      throw error;
    }
  }
  
  /**
   * 验证配置结构
   * @param configData - 配置数据
   */
  async validateConfigStructure(configData) {
    const requiredFields = ['version', 'Providers', 'Router'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!configData[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`配置结构无效，缺少必需字段: ${missingFields.join(', ')}`);
    }
    
    // 验证Providers结构
    if (!Array.isArray(configData.Providers)) {
      throw new Error('Providers必须是数组');
    }
    
    for (const provider of configData.Providers) {
      if (!provider.name || !provider.api_base_url) {
        throw new Error('Provider必须包含name和api_base_url字段');
      }
    }
    
    this.debugSystem.log('debug', '配置结构验证通过', {
      requiredFields,
      providersCount: configData.Providers.length,
      routerKeys: Object.keys(configData.Router)
    }, 'validateConfigStructure');
  }
  
  /**
   * 生成配置输出文件供流水线组装器使用
   * @param configData - 配置数据
   * @param pipelineId - 流水线ID
   */
  async generatePipelineConfigOutput(configData, pipelineId) {
    try {
      const outputDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'pipeline-configs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, `pipeline-${pipelineId}-config.json`);
      
      // 生成流水线特定配置
      const pipelineConfig = {
        pipelineId,
        timestamp: new Date().toISOString(),
        sourceConfig: configData,
        extractedConfig: {
          providers: configData.Providers,
          router: configData.Router,
          server: configData.server || { port: 5506, host: '0.0.0.0' },
          apiKey: configData.APIKEY || 'rcc4-proxy-key'
        },
        validation: {
          isValid: true,
          validatedAt: new Date().toISOString(),
          errors: []
        }
      };
      
      await this.writeConfigFile(outputPath, pipelineConfig, 'pipeline-export');
      
      this.debugSystem.log('info', `流水线配置输出文件生成: ${outputPath}`, {
        pipelineId,
        outputPath,
        providersCount: configData.Providers.length
      }, 'generatePipelineConfigOutput');
      
      return outputPath;
    } catch (error) {
      this.debugSystem.log('error', `流水线配置输出文件生成失败: ${pipelineId}`, {
        error: error.message,
        stack: error.stack
      }, 'generatePipelineConfigOutput');
      throw error;
    }
  }
  
  /**
   * 记录配置变更历史
   * @param changeType - 变更类型
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   * @param description - 变更描述
   */
  async logConfigChange(changeType, oldConfig, newConfig, description) {
    const changeEntry = {
      operation: 'CONFIG_CHANGE',
      changeType,
      timestamp: new Date().toISOString(),
      description,
      oldConfigSize: oldConfig ? JSON.stringify(oldConfig).length : 0,
      newConfigSize: newConfig ? JSON.stringify(newConfig).length : 0,
      changes: this.calculateConfigChanges(oldConfig, newConfig),
      phase: this.debugSystem.getConfig().phase
    };
    
    this.debugSystem.log('info', `配置变更: ${changeType}`, changeEntry, 'logConfigChange');
    this.configHistory.push(changeEntry);
    
    return changeEntry;
  }
  
  /**
   * 计算配置变更
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   */
  calculateConfigChanges(oldConfig, newConfig) {
    const changes = [];
    
    if (!oldConfig || !newConfig) {
      return changes;
    }
    
    // 比较顶级字段
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
    
    for (const key of allKeys) {
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'modified',
          oldValue,
          newValue
        });
      }
    }
    
    return changes;
  }
  
  /**
   * 获取配置历史记录
   * @param limit - 限制条数
   */
  getConfigHistory(limit = 100) {
    return this.configHistory.slice(-limit);
  }
  
  /**
   * 获取配置输出文件列表
   */
  getConfigOutputs() {
    return Array.from(this.configOutputs.entries()).map(([path, info]) => ({
      path,
      ...info
    }));
  }
  
  /**
   * 创建配置备份
   * @param configData - 配置数据
   */
  async createConfigBackup(configData) {
    try {
      const backupDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'config-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `config-backup-${timestamp}.json`);
      
      const backupData = {
        originalConfig: configData,
        backupTimestamp: timestamp,
        phase: this.debugSystem.getConfig().phase,
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        }
      };
      
      await this.writeConfigFile(backupPath, backupData, 'backup');
      
      this.debugSystem.log('info', `配置备份创建: ${backupPath}`, {
        backupPath,
        timestamp
      }, 'createConfigBackup');
      
      return backupPath;
    } catch (error) {
      this.debugSystem.log('error', '配置备份创建失败', {
        error: error.message,
        stack: error.stack
      }, 'createConfigBackup');
      throw error;
    }
  }
  
  /**
   * 获取当前配置状态报告
   */
  getConfigStatusReport() {
    return {
      currentConfig: this.currentConfig,
      history: {
        totalEntries: this.configHistory.length,
        recentEntries: this.configHistory.slice(-10)
      },
      outputs: this.getConfigOutputs(),
      systemStatus: {
        phase: this.debugSystem.getConfig().phase,
        port: this.debugSystem.getConfig().port,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }
}

module.exports = EnhancedConfigurationModule;
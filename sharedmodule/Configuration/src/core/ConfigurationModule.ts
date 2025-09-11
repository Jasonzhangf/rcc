/**
 * 配置模块主类
 * 
 * 负责配置的加载、解析和流水线表生成
 */

import { ConfigData } from './ConfigData';
import { PipelineTable, PipelineEntry } from './PipelineTable';
import { ConfigLoader } from './ConfigLoader';
import { ConfigParser } from './ConfigParser';
import { PipelineTableGenerator } from './PipelineTableGenerator';
import { VirtualModelRulesModule, VirtualModelValidationResult } from './VirtualModelRulesModule';

/**
 * 配置模块选项
 */
export interface ConfigurationModuleOptions {
  /** 配置文件路径 */
  configPath?: string;
  /** 是否启用自动加载 */
  autoLoad?: boolean;
  /** 固定虚拟模型列表 */
  fixedVirtualModels?: string[];
}

/**
 * 配置模块主类
 */
export class ConfigurationModule {
  private configLoader: ConfigLoader;
  private configParser: ConfigParser;
  private pipelineTableGenerator: PipelineTableGenerator;
  private virtualModelRulesModule: VirtualModelRulesModule;
  private currentConfig: ConfigData | null = null;
  private currentPipelineTable: PipelineTable | null = null;
  private options: ConfigurationModuleOptions;
  private initialized = false;

  constructor(options?: ConfigurationModuleOptions) {
    this.options = {
      configPath: './config.json',
      autoLoad: false,
      fixedVirtualModels: ['default', 'longcontext', 'thinking', 'background', 'websearch', 'vision', 'coding'],
      ...options
    };

    this.configLoader = new ConfigLoader();
    this.configParser = new ConfigParser();
    this.pipelineTableGenerator = new PipelineTableGenerator(this.options.fixedVirtualModels);
    this.virtualModelRulesModule = new VirtualModelRulesModule();
  }

  /**
   * 初始化配置模块
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化各组件
      await this.configLoader.initialize();
      await this.configParser.initialize();
      await this.pipelineTableGenerator.initialize();
      await this.virtualModelRulesModule.initialize();

      // 如果启用自动加载，尝试加载配置
      if (this.options.autoLoad && this.options.configPath) {
        await this.loadConfiguration(this.options.configPath);
      }

      this.initialized = true;
      console.log('ConfigurationModule initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigurationModule:', error);
      throw error;
    }
  }

  /**
   * 加载配置文件
   */
  public async loadConfiguration(configPath: string): Promise<ConfigData> {
    try {
      const rawData = await this.configLoader.loadConfig(configPath);
      this.currentConfig = await this.configParser.parseConfig(rawData);
      console.log('Configuration loaded successfully');
      return this.currentConfig;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * 保存配置文件
   */
  public async saveConfiguration(config: ConfigData, configPath: string): Promise<void> {
    try {
      await this.configLoader.saveConfig(config, configPath);
      this.currentConfig = config;
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * 生成流水线表
   */
  public async generatePipelineTable(): Promise<PipelineTable> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    try {
      this.currentPipelineTable = await this.pipelineTableGenerator.generatePipelineTable(this.currentConfig);
      console.log('Pipeline table generated successfully');
      return this.currentPipelineTable;
    } catch (error) {
      console.error('Failed to generate pipeline table:', error);
      throw error;
    }
  }

  /**
   * 获取当前配置
   */
  public getCurrentConfig(): ConfigData | null {
    return this.currentConfig;
  }

  /**
   * 获取当前流水线表
   */
  public getCurrentPipelineTable(): PipelineTable | null {
    return this.currentPipelineTable;
  }

  /**
   * 验证配置
   */
  public async validateConfiguration(config: ConfigData): Promise<{ valid: boolean; errors: string[] }> {
    // 使用VirtualModelRulesModule进行验证
    const validationResult = await this.virtualModelRulesModule.validateVirtualModels(config);
    
    const errors: string[] = [...validationResult.errors];

    // 检查必需字段
    if (!config.version) {
      errors.push('Missing version');
    }

    if (!config.providers || Object.keys(config.providers).length === 0) {
      errors.push('No providers configured');
    }

    // 验证供应商配置
    for (const [providerId, provider] of Object.entries(config.providers)) {
      if (!provider.name) {
        errors.push(`Provider ${providerId} missing name`);
      }

      if (!provider.type) {
        errors.push(`Provider ${providerId} missing type`);
      }

      if (!provider.auth || !provider.auth.keys || provider.auth.keys.length === 0) {
        errors.push(`Provider ${providerId} missing authentication keys`);
      }

      if (!provider.models || Object.keys(provider.models).length === 0) {
        errors.push(`Provider ${providerId} has no models`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 创建空配置模板
   */
  public createEmptyConfig(): ConfigData {
    const now = new Date().toISOString();
    
    return {
      version: '1.0.0',
      providers: {},
      virtualModels: {},
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * 销毁模块
   */
  public async destroy(): Promise<void> {
    try {
      await this.configLoader.destroy();
      await this.configParser.destroy();
      await this.pipelineTableGenerator.destroy();
      await this.virtualModelRulesModule.destroy();
      this.initialized = false;
      console.log('ConfigurationModule destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy ConfigurationModule:', error);
      throw error;
    }
  }
}
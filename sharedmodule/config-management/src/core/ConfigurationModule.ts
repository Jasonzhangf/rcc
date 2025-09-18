/**
 * 配置管理模块 - Web UI 和管理层
 * 
 * 主要调用 config-parser 的核心功能，并提供 Web UI 接口
 */

import { 
  ConfigParser, 
  ConfigLoader, 
  PipelineConfigGenerator,
  createConfigParser,
  createConfigLoader,
  createPipelineConfigGenerator
} from '../../../config-parser/src/index';
import { BaseModule } from '../../../basemodule/src/BaseModule';

/**
 * Web UI 配置项
 */
export interface WebUIConfig {
  /** 端口号 */
  port: number;
  /** 主机地址 */
  host: string;
  /** 是否启用 HTTPS */
  https: boolean;
  /** 静态文件目录 */
  staticDir: string;
  /** API 前缀 */
  apiPrefix: string;
}

/**
 * 配置管理模块
 * 
 * 负责：
 * 1. 调用 config-parser 的核心功能
 * 2. 提供 Web UI 管理界面
 * 3. 处理配置的增删改查操作
 */
export class ConfigurationModule extends BaseModule {
  private configParser: ConfigParser | null = null;
  private configLoader: ConfigLoader | null = null;
  private pipelineGenerator: PipelineConfigGenerator | null = null;
  private webUIConfig: WebUIConfig;

  constructor(webUIConfig?: Partial<WebUIConfig>) {
    super({
      name: 'ConfigurationModule',
      version: '1.0.0',
      description: 'Configuration management and Web UI module'
    });
    
    // 默认 Web UI 配置
    this.webUIConfig = {
      port: 3000,
      host: '0.0.0.0',
      https: false,
      staticDir: './public',
      apiPrefix: '/api/v1',
      ...webUIConfig
    };
  }

  /**
   * 初始化模块
   */
  public async initialize(): Promise<void> {
    try {
      await super.initialize();

      // 初始化核心组件（调用 config-parser）
      this.configParser = createConfigParser();
      this.configLoader = createConfigLoader();
      this.pipelineGenerator = createPipelineConfigGenerator();

      await this.configParser.initialize();
      await this.configLoader.initialize();
      await this.pipelineGenerator.initialize();

      console.log('Configuration management module initialized successfully');
      console.log(`Web UI will be available at: ${this.webUIConfig.https ? 'https' : 'http'}://${this.webUIConfig.host}:${this.webUIConfig.port}`);
    } catch (error) {
      console.error('Failed to initialize configuration management module:', error);
      throw error;
    }
  }

  /**
   * 加载配置文件 (调用 config-parser)
   */
  public async loadConfig(filePath: string): Promise<any> {
    if (!this.configLoader) {
      throw new Error('ConfigLoader not initialized');
    }

    try {
      console.log(`Loading configuration from: ${filePath}`);
      const config = await this.configLoader.loadFromFile(filePath, {
        enableCache: true,
        cacheExpiry: 300000, // 5分钟
        watchChanges: true
      });
      
      console.log('Configuration loaded successfully');
      return config;
    } catch (error) {
      console.error(`Failed to load configuration from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 保存配置文件 (调用 config-parser)
   */
  public async saveConfig(config: any, filePath: string): Promise<void> {
    if (!this.configLoader) {
      throw new Error('ConfigLoader not initialized');
    }

    try {
      console.log(`Saving configuration to: ${filePath}`);
      await this.configLoader.saveConfig(config, filePath, { backup: true });
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error(`Failed to save configuration to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 解析配置 (调用 config-parser)
   */
  public async parseConfig(rawData: any): Promise<any> {
    if (!this.configParser) {
      throw new Error('ConfigParser not initialized');
    }

    try {
      console.log('Parsing configuration data');
      const parsedConfig = await this.configParser.parseConfig(rawData);
      console.log('Configuration parsed successfully');
      return parsedConfig;
    } catch (error) {
      console.error('Failed to parse configuration:', error);
      throw error;
    }
  }

  /**
   * 生成流水线表 (调用 config-parser)
   */
  public async generatePipelineTable(config: any): Promise<any> {
    if (!this.pipelineGenerator) {
      throw new Error('PipelineConfigGenerator not initialized');
    }

    try {
      console.log('Generating pipeline table');
      const pipelineTable = await this.pipelineGenerator.generatePipelineTable(config);
      console.log(`Pipeline table generated with ${pipelineTable.size} entries`);
      return pipelineTable;
    } catch (error) {
      console.error('Failed to generate pipeline table:', error);
      throw error;
    }
  }

  /**
   * 启动 Web UI 服务器
   */
  public async startWebUI(): Promise<void> {
    try {
      console.log('Starting Web UI server...');
      
      // 这里将来会集成实际的 Web 服务器
      // 例如 Express.js 或 Fastify
      
      console.log(`Web UI server started on ${this.webUIConfig.host}:${this.webUIConfig.port}`);
    } catch (error) {
      console.error('Failed to start Web UI server:', error);
      throw error;
    }
  }

  /**
   * 停止 Web UI 服务器
   */
  public async stopWebUI(): Promise<void> {
    try {
      console.log('Stopping Web UI server...');
      
      // 这里将来会停止 Web 服务器
      
      console.log('Web UI server stopped');
    } catch (error) {
      console.error('Failed to stop Web UI server:', error);
      throw error;
    }
  }

  /**
   * 获取 Web UI 配置
   */
  public getWebUIConfig(): WebUIConfig {
    return { ...this.webUIConfig };
  }

  /**
   * 更新 Web UI 配置
   */
  public updateWebUIConfig(config: Partial<WebUIConfig>): void {
    this.webUIConfig = { ...this.webUIConfig, ...config };
    console.log('Web UI configuration updated');
  }

  /**
   * 销毁模块
   */
  public async destroy(): Promise<void> {
    try {
      // 停止 Web UI
      await this.stopWebUI();

      // 销毁核心组件
      if (this.configParser) {
        await this.configParser.destroy();
        this.configParser = null;
      }

      if (this.configLoader) {
        await this.configLoader.destroy();
        this.configLoader = null;
      }

      if (this.pipelineGenerator) {
        await this.pipelineGenerator.destroy();
        this.pipelineGenerator = null;
      }

      await super.destroy();
      console.log('Configuration management module destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy configuration management module:', error);
      throw error;
    }
  }
}
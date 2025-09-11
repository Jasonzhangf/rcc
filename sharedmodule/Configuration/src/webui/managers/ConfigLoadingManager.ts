/**
 * 配置加载管理器
 * 
 * 协调配置加载、解析和UI更新的中央管理器
 */

import { ConfigService } from '../services/ConfigService';
import { ParserService } from '../services/ParserService';
import { StorageService } from '../services/StorageService';
import { FileSystemService } from '../services/FileSystemService';
import { ParseResult, UserConfig } from '../types/ui.types';
import { ConfigLoadingState, StateChangeListener } from '../types/state.types';
import { PipelineConfigGenerator } from '../services/PipelineConfigGenerator';

/**
 * 配置加载管理器类
 */
export class ConfigLoadingManager {
  private fileSystemService: FileSystemService;
  private configService: ConfigService;
  private parserService: ParserService;
  private storageService: StorageService;
  private pipelineConfigGenerator: PipelineConfigGenerator;
  private initialized = false;
  private state: ConfigLoadingState = {
    isLoading: false,
    isParsing: false,
    hasConfig: false,
    statusText: '未初始化'
  };
  private stateListeners: StateChangeListener[] = [];

  constructor() {
    this.fileSystemService = new FileSystemService();
    this.configService = new ConfigService();
    this.parserService = new ParserService();
    this.storageService = new StorageService();
    this.pipelineConfigGenerator = new PipelineConfigGenerator();
  }

  /**
   * 初始化管理器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ConfigLoadingManager already initialized');
      return;
    }

    try {
      // 按依赖顺序初始化服务
      await this.fileSystemService.initialize();
      console.log('FileSystemService initialized');
      
      await this.configService.initialize(this.fileSystemService);
      console.log('ConfigService initialized');
      
      await this.parserService.initialize(this.fileSystemService);
      console.log('ParserService initialized');
      
      await this.storageService.initialize(this.fileSystemService);
      console.log('StorageService initialized');
      
      this.initialized = true;
      console.log('ConfigLoadingManager initialized successfully');
      
      // 尝试自动加载最近的配置
      await this.attemptAutoLoad();
    } catch (error) {
      console.error('Failed to initialize ConfigLoadingManager:', error);
      throw error;
    }
  }

  /**
   * 尝试自动加载配置
   */
  private async attemptAutoLoad(): Promise<void> {
    try {
      // 先尝试加载最近保存的解析结果
      const recentResult = await this.loadRecentParseResult();
      if (recentResult) {
        console.log('加载最近保存的解析结果成功');
        this.updateState({ hasConfig: true, statusText: '已加载最近配置' });
        return;
      }

      // 如果没有最近结果，尝试自动加载默认配置文件
      console.log('尝试自动加载默认配置文件...');
      
      // 查找默认配置文件
      const configFiles = await this.fileSystemService.findDefaultConfigFiles();
      if (configFiles.length === 0) {
        console.log('未找到默认配置文件，等待用户手动上传');
        this.updateState({ statusText: '等待上传配置文件' });
        return;
      }

      // 使用第一个找到的配置文件
      const configFile = configFiles[0];
      console.log(`找到默认配置文件: ${configFile}`);
      
      // 更新状态
      this.updateState({ isLoading: true, statusText: `加载配置文件: ${configFile}` });
      
      // 读取配置文件
      const configData = await this.fileSystemService.readConfigFile(configFile);
      console.log('配置文件读取成功');
      
      // 转换为用户配置格式
      const userConfig = this.convertConfigDataToUserConfig(configData);
      
      // 更新状态
      this.updateState({ isParsing: true, statusText: '解析配置文件...' });
      
      // 解析配置
      const parseResult = await this.parserService.parseUserConfig(userConfig);
      
      // 保存解析结果到存储
      await this.saveParseResult(parseResult, configFile);
      
      // 更新最终状态
      this.updateState({ 
        isLoading: false, 
        isParsing: false, 
        hasConfig: true, 
        statusText: '配置加载和解析完成' 
      });
      
      console.log('配置自动加载和解析完成');
    } catch (error) {
      console.error('自动加载配置失败:', error);
      this.updateState({ 
        isLoading: false, 
        isParsing: false, 
        statusText: `加载失败: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  }

  /**
   * 手动加载和解析配置文件
   */
  public async loadAndParseConfigFile(file: File): Promise<ParseResult | null> {
    if (!this.initialized) {
      throw new Error('ConfigLoadingManager not initialized');
    }

    try {
      console.log(`开始加载配置文件: ${file.name}`);
      
      // 更新状态
      this.updateState({ isLoading: true, statusText: `加载文件: ${file.name}` });
      
      // 读取文件内容
      const content = await file.text();
      let configData: any;
      
      if (file.name.endsWith('.json')) {
        configData = JSON.parse(content);
      } else {
        // 对于YAML等其他格式，这里需要解析器
        configData = JSON.parse(content); // 临时处理
      }
      
      console.log('配置文件读取成功');
      
      // 转换为用户配置格式
      const userConfig = this.convertConfigDataToUserConfig(configData);
      
      // 更新状态
      this.updateState({ isParsing: true, statusText: '解析配置...' });
      
      // 解析配置
      const parseResult = await this.parserService.parseUserConfig(userConfig, {
        onProgress: (step: string, progress: number) => {
          this.updateState({ statusText: `解析中: ${step} (${progress}%)` });
        }
      });
      
      // 保存解析结果到存储
      await this.saveParseResult(parseResult, file.name);
      
      // 更新最终状态
      this.updateState({ 
        isLoading: false, 
        isParsing: false, 
        hasConfig: true, 
        statusText: '配置加载和解析完成' 
      });
      
      console.log('配置文件加载和解析完成');
      return parseResult;
    } catch (error) {
      console.error('加载和解析配置文件失败:', error);
      this.updateState({ 
        isLoading: false, 
        isParsing: false, 
        statusText: `解析失败: ${error instanceof Error ? error.message : String(error)}` 
      });
      return null;
    }
  }

  /**
   * 转换配置数据为用户配置格式
   */
  private convertConfigDataToUserConfig(configData: any): UserConfig {
    const userConfig: UserConfig = {
      providers: {}
    };
    
    // 从configData.settings.providers提取供应商信息
    if (configData.settings && configData.settings.providers) {
      for (const [providerId, providerData] of Object.entries(configData.settings.providers)) {
        if (typeof providerData === 'object' && providerData !== null) {
          const providerAny: any = providerData;
          
          userConfig.providers[providerId] = {
            models: {}
          };
          
          // 处理模型和密钥
          if (providerAny.models) {
            for (const [modelId, modelData] of Object.entries(providerAny.models)) {
              const modelAny: any = modelData;
              
              // 提取密钥信息
              let keys: string[] = [];
              if (providerAny.auth && Array.isArray(providerAny.auth.keys)) {
                keys = providerAny.auth.keys;
              }
              
              userConfig.providers[providerId].models[modelId] = {
                keys: keys
              };
            }
          }
        }
      }
    }
    
    // 处理虚拟模型（如果存在）
    if (configData.settings && configData.settings.virtualModels) {
      userConfig.virtualModels = {};
      for (const [vmName, vmData] of Object.entries(configData.settings.virtualModels)) {
        const vmAny: any = vmData;
        userConfig.virtualModels[vmName] = {
          targetProvider: vmAny.targetProvider || '',
          targetModel: vmAny.targetModel || ''
        };
      }
    }
    
    return userConfig;
  }

  /**
   * 保存解析结果
   */
  private async saveParseResult(parseResult: ParseResult, configFile: string): Promise<void> {
    try {
      // 保存到本地存储
      await this.storageService.setValue('last_parse_result', {
        result: parseResult,
        sourceFile: configFile,
        timestamp: Date.now()
      });
      
      // 添加到解析历史
      await this.storageService.addParseHistory(parseResult);
      
      console.log('解析结果已保存');
    } catch (error) {
      console.warn('保存解析结果失败:', error);
    }
  }

  /**
   * 加载最近的解析结果
   */
  public async loadRecentParseResult(): Promise<ParseResult | null> {
    try {
      const savedData = await this.storageService.getValue<any>('last_parse_result');
      if (savedData && savedData.result) {
        console.log('加载最近的解析结果成功');
        return savedData.result;
      }
      return null;
    } catch (error) {
      console.warn('加载最近的解析结果失败:', error);
      return null;
    }
  }

  /**
   * 更新加载状态
   */
  private updateState(newState: Partial<ConfigLoadingState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyStateListeners();
  }

  /**
   * 获取当前加载状态
   */
  public getState(): ConfigLoadingState {
    return { ...this.state };
  }

  /**
   * 添加状态监听器
   */
  public addStateListener(listener: StateChangeListener): void {
    this.stateListeners.push(listener);
  }

  /**
   * 移除状态监听器
   */
  public removeStateListener(listener: StateChangeListener): void {
    const index = this.stateListeners.indexOf(listener);
    if (index !== -1) {
      this.stateListeners.splice(index, 1);
    }
  }

  /**
   * 通知所有状态监听器
   */
  private notifyStateListeners(): void {
    const stateCopy = this.getState();
    for (const listener of this.stateListeners) {
      try {
        listener(stateCopy);
      } catch (error) {
        console.error('状态监听器执行出错:', error);
      }
    }
  }

  /**
   * 监控配置文件变化
   */
  public async watchConfigFileChanges(callback: (parseResult: ParseResult | null) => void): Promise<void> {
    if (!this.initialized) {
      throw new Error('ConfigLoadingManager not initialized');
    }

    try {
      const configFiles = await this.fileSystemService.findDefaultConfigFiles();
      if (configFiles.length === 0) {
        console.log('未找到配置文件进行监控');
        return;
      }

      // 监控第一个配置文件
      const configFile = configFiles[0];
      console.log(`开始监控配置文件: ${configFile}`);
      
      await this.fileSystemService.watchConfigFile(configFile, async (configData: any) => {
        try {
          console.log(`检测到配置文件变化: ${configFile}`);
          
          // 转换并解析配置
          const userConfig = this.convertConfigDataToUserConfig(configData);
          const parseResult = await this.parserService.parseUserConfig(userConfig);
          
          // 保存结果
          await this.saveParseResult(parseResult, configFile);
          
          // 回调通知
          callback(parseResult);
        } catch (error) {
          console.error('处理配置文件变化时出错:', error);
          callback(null);
        }
      });
    } catch (error) {
      console.error('监控配置文件变化失败:', error);
    }
  }

  /**
   * 停止监控配置文件
   */
  public async stopWatchingConfigFile(): Promise<void> {
    try {
      const configFiles = await this.fileSystemService.findDefaultConfigFiles();
      if (configFiles.length > 0) {
        const configFile = configFiles[0];
        await this.fileSystemService.unwatchConfigFile(configFile);
        console.log(`停止监控配置文件: ${configFile}`);
      }
    } catch (error) {
      console.error('停止监控配置文件失败:', error);
    }
  }

  /**
   * 获取服务实例
   */
  public getServices(): {
    fileSystemService: FileSystemService;
    configService: ConfigService;
    parserService: ParserService;
    storageService: StorageService;
    pipelineConfigGenerator: PipelineConfigGenerator;
  } {
    return {
      fileSystemService: this.fileSystemService,
      configService: this.configService,
      parserService: this.parserService,
      storageService: this.storageService,
      pipelineConfigGenerator: this.pipelineConfigGenerator
    };
  }

  /**
   * 销毁管理器
   */
  public async destroy(): Promise<void> {
    try {
      // 停止文件监控
      await this.stopWatchingConfigFile();
      
      // 销毁服务
      console.log('ConfigLoadingManager destroyed');
    } catch (error) {
      console.error('销毁ConfigLoadingManager时出错:', error);
    }
  }
}
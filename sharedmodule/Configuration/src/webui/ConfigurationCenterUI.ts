/**
 * 配置中心UI主类
 * 
 * 协调配置生成器和解析器组件，管理整体UI状态
 */

import { ConfigLoadingManager } from './managers/ConfigLoadingManager';
import { ConfigGeneratorMain } from './components/ConfigGenerator/ConfigGeneratorMain';
import { ConfigParserMain } from './components/ConfigParser/ConfigParserMain';
import { PipelineVisualizationMain } from './components/PipelineVisualization/PipelineVisualizationMain';
import { UIConfig, ConfigurationCenterOptions } from './types/state.types';

/**
 * 配置中心UI主类
 */
export class ConfigurationCenterUI {
  private static instance: ConfigurationCenterUI;
  private container: HTMLElement | null = null;
  private configLoadingManager: ConfigLoadingManager;
  private configParser: ConfigParserMain | null = null;
  private initialized = false;
  private options: ConfigurationCenterOptions | null = null;

  private constructor() {
    this.configLoadingManager = new ConfigLoadingManager();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigurationCenterUI {
    if (!ConfigurationCenterUI.instance) {
      ConfigurationCenterUI.instance = new ConfigurationCenterUI();
    }
    return ConfigurationCenterUI.instance;
  }

  /**
   * 初始化配置中心UI
   */
  public async initialize(options: ConfigurationCenterOptions): Promise<void> {
    if (this.initialized) {
      console.log('ConfigurationCenterUI already initialized');
      return;
    }

    try {
      this.options = options;
      
      // 获取容器元素
      this.container = document.getElementById(options.containerId);
      if (!this.container) {
        throw new Error(`Container element with ID '${options.containerId}' not found`);
      }

      // 初始化配置加载管理器
      await this.configLoadingManager.initialize();

      // 创建UI组件
      await this.createUIComponents();

      // 应用主题
      this.applyTheme(options.theme || 'auto');

      this.initialized = true;
      console.log('ConfigurationCenterUI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigurationCenterUI:', error);
      throw error;
    }
  }

  /**
   * 创建UI组件
   */
  private async createUIComponents(): Promise<void> {
    if (!this.container || !this.options) return;

    // 清空容器
    this.container.innerHTML = `
      <div class="config-center-ui">
        <div class="config-center-header">
          <h1>RCC 配置中心</h1>
          <div class="config-center-status" id="config-center-status">
            <span class="status-text">初始化中...</span>
          </div>
        </div>
        <div class="config-center-tabs">
          <button class="tab-btn active" data-tab="generator">配置生成</button>
          <button class="tab-btn" data-tab="parser">配置解析</button>
          <button class="tab-btn" data-tab="pipeline">流水线可视化</button>
        </div>
        <div class="config-center-content">
          <div id="config-generator-container" class="tab-content active"></div>
          <div id="config-parser-container" class="tab-content"></div>
          <div id="pipeline-visualization-container" class="tab-content"></div>
        </div>
      </div>
    `;

    // 初始化配置生成器组件
    const configGenerator = new ConfigGeneratorMain();
    const generatorContainer = document.getElementById('config-generator-container');
    if (generatorContainer) {
      // 获取服务实例
      const services = this.configLoadingManager.getServices();
      
      await configGenerator.initialize({
        containerId: 'config-generator-container',
        parserService: services.parserService,
        storageService: services.storageService,
        configLoadingManager: this.configLoadingManager
      });
    }

    // 初始化配置解析器组件
    this.configParser = new ConfigParserMain();
    const parserContainer = document.getElementById('config-parser-container');
    if (parserContainer && this.configParser) {
      // 获取服务实例
      const services = this.configLoadingManager.getServices();
      
      await this.configParser.initialize({
        containerId: 'config-parser-container',
        parserService: services.parserService,
        storageService: services.storageService,
        configLoadingManager: this.configLoadingManager
      });
    }

    // 初始化流水线可视化组件
    const pipelineVisualization = new PipelineVisualizationMain();
    const visualizationContainer = document.getElementById('pipeline-visualization-container');
    if (visualizationContainer) {
      // 获取配置数据并设置
      const configData = await this.configLoadingManager.getServices().parserService.parseConfigFile();
      pipelineVisualization.setData(configData);
      
      await pipelineVisualization.render();
    }

    // 绑定标签页切换事件
    this.bindTabEvents();

    // 添加状态监听器以更新UI状态显示
    this.configLoadingManager.addStateListener((state: any) => {
      this.updateUIStatus(state);
    });

    // 加载样式
    this.loadStyles();
  }

  /**
   * 绑定标签页切换事件
   */
  private bindTabEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // 标签页切换
      if (target.classList.contains('tab-btn')) {
        const tab = target.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      }
    });
  }

  /**
   * 切换标签页
   */
  private switchTab(tabName: string): void {
    if (!this.container) return;

    // 更新标签按钮状态
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      }
    });

    // 更新内容区域显示
    const tabContents = this.container.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `config-${tabName}-container`) {
        content.classList.add('active');
      }
    });
  }

  /**
   * 更新UI状态显示
   */
  private updateUIStatus(state: any): void {
    const statusElement = document.getElementById('config-center-status');
    if (statusElement) {
      const statusText = state.statusText || '未知状态';
      const isLoading = state.isLoading || state.isParsing;
      
      statusElement.innerHTML = `
        <span class="status-text">${statusText}</span>
        ${isLoading ? '<span class="status-spinner">🔄</span>' : ''}
      `;
      
      // 根据状态更新样式
      if (state.hasConfig) {
        statusElement.className = 'config-center-status success';
      } else if (state.lastError) {
        statusElement.className = 'config-center-status error';
      } else {
        statusElement.className = 'config-center-status';
      }
    }
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark-theme', isDark);
      root.classList.toggle('light-theme', !isDark);
    } else {
      root.classList.toggle('dark-theme', theme === 'dark');
      root.classList.toggle('light-theme', theme === 'light');
    }
  }

  /**
   * 销毁配置中心UI
   */
  public async destroy(): Promise<void> {
    try {
      if (this.configParser) {
        await this.configParser.destroy();
      }
      
      await this.configLoadingManager.destroy();
      
      if (this.container) {
        this.container.innerHTML = '';
      }
      
      // 移除样式
      const style = document.getElementById('config-center-styles');
      if (style) {
        style.remove();
      }
      
      this.initialized = false;
      console.log('ConfigurationCenterUI destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy ConfigurationCenterUI:', error);
      throw error;
    }
  }

  /**
   * 加载配置中心样式
   */
  private loadStyles(): void {
    const styleId = 'config-center-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .config-center-ui {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .config-center-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--bg-secondary, #ffffff);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .config-center-header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-primary, #212529);
      }

      .config-center-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        background: var(--bg-primary, #f8f9fa);
        color: var(--text-secondary, #6c757d);
        font-size: 0.875rem;
      }

      .config-center-status.success {
        background: var(--success-bg, #d1e7dd);
        color: var(--success-color, #198754);
      }

      .config-center-status.error {
        background: var(--error-bg, #f8d7da);
        color: var(--error-color, #dc3545);
      }

      .status-spinner {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .config-center-tabs {
        display: flex;
        background: var(--bg-secondary, #ffffff);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .tab-btn {
        padding: 1rem 1.5rem;
        border: none;
        background: transparent;
        color: var(--text-secondary, #6c757d);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .tab-btn:hover {
        background: var(--bg-hover, #f8f9fa);
        color: var(--text-primary, #212529);
      }

      .tab-btn.active {
        color: var(--primary-color, #0d6efd);
        border-bottom-color: var(--primary-color, #0d6efd);
      }

      .config-center-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .tab-content {
        display: none;
        flex: 1;
        overflow: auto;
      }

      .tab-content.active {
        display: block;
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .config-center-header {
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .config-center-header h1 {
          font-size: 1.25rem;
        }

        .tab-btn {
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 获取配置加载管理器
   */
  public getConfigLoadingManager(): ConfigLoadingManager {
    return this.configLoadingManager;
  }

  /**
   * 获取当前状态
   */
  public getState(): any {
    return this.configLoadingManager.getState();
  }
}
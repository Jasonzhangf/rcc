/**
 * 配置解析器主组件
 * 
 * 提供用于解析用户配置文件并生成流水线配置的可视化界面
 * 包括文件上传、流水线视图、解析结果等功能
 */

import { 
  UIComponent, 
  ConfigParserOptions, 
  UserConfig, 
  ParseResult 
} from '../../types/ui.types';
import { FileSystemService } from '../../services/FileSystemService';
import { PipelineConfigGenerator } from '../../services/PipelineConfigGenerator';

/**
 * 配置解析器主组件
 */
export class ConfigParserMain implements UIComponent {
  private container: HTMLElement | null = null;
  private parserService: any;
  private storageService: any;
  private fileSystemService: FileSystemService | null = null;
  private pipelineConfigGenerator: PipelineConfigGenerator;
  
  // 数据状态
  private userConfig: UserConfig | null = null;
  private parseResult: ParseResult | null = null;
  private currentStep: 'upload' | 'parse' | 'result' = 'upload';
  private parseHistory: ParseResult[] = [];
  private configLoadingManager: any = null;

  constructor() {
    this.parserService = null;
    this.storageService = null;
    this.fileSystemService = null;
    this.pipelineConfigGenerator = new PipelineConfigGenerator();
  }

  /**
   * 初始化组件
   */
  public async initialize(options: ConfigParserOptions & { configLoadingManager?: any }): Promise<void> {
    try {
      this.parserService = options.parserService;
      this.storageService = options.storageService;
      this.configLoadingManager = options.configLoadingManager;
      
      // 获取容器元素
      this.container = document.getElementById(options.containerId);
      if (!this.container) {
        throw new Error(`Container element with ID '${options.containerId}' not found`);
      }

      // 初始化子组件
      await this.initializeSubComponents();

      // 加载保存的数据
      await this.loadSavedData();
      
      // 如果有配置加载管理器，添加状态监听器
      if (this.configLoadingManager) {
        this.configLoadingManager.addStateListener((state: any) => {
          this.handleConfigLoadingStateChange(state);
        });
        
        // 获取当前状态
        const currentState = this.configLoadingManager.getState();
        this.handleConfigLoadingStateChange(currentState);
      }

      console.log('ConfigParserMain initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigParserMain:', error);
      throw error;
    }
  }

  /**
   * 处理配置加载状态变化
   */
  private handleConfigLoadingStateChange(state: any): void {
    // 更新UI状态显示
    const statusText = this.container?.querySelector('#current-step-text');
    const progressFill = this.container?.querySelector('.progress-fill') as HTMLElement;
    
    if (statusText) {
      statusText.textContent = state.statusText || '未知状态';
    }
    
    // 根据状态更新界面
    if (state.isLoading || state.isParsing) {
      if (this.currentStep !== 'parse') {
        this.currentStep = 'parse';
        this.render();
      }
    } else if (state.hasConfig) {
      // 尝试加载解析结果
      this.loadParseResultFromManager();
    } else if (!state.isLoading && !state.isParsing && !state.hasConfig) {
      // 回到上传界面
      if (this.currentStep !== 'upload') {
        this.currentStep = 'upload';
        this.render();
      }
    }
  }

  /**
   * 从管理器加载解析结果
   */
  private async loadParseResultFromManager(): Promise<void> {
    if (this.configLoadingManager) {
      try {
        const parseResult = await this.configLoadingManager.loadRecentParseResult();
        if (parseResult) {
          await this.handleParseComplete(parseResult);
        }
      } catch (error) {
        console.error('从管理器加载解析结果失败:', error);
      }
    }
  }

  // 已移除自动加载默认配置逻辑，由ConfigLoadingManager统一管理

  /**
   * 转换配置数据为用户配置格式
   */
  private convertConfigDataToUserConfig(configData: any): UserConfig {
    // 这里实现将ConfigData转换为UserConfig的逻辑
    // 根据实际数据结构调整转换逻辑
    
    const userConfig: UserConfig = {
      providers: {}
    };
    
    // 从configData.settings.providers提取供应商信息
    if (configData.settings && configData.settings.providers) {
      for (const [providerId, providerData] of Object.entries(configData.settings.providers)) {
        // 确保providerData是对象且有必要的属性
        if (typeof providerData === 'object' && providerData !== null) {
          const providerAny: any = providerData;
          
          userConfig.providers[providerId] = {
            models: {}
          };
          
          // 处理模型和密钥
          if (providerAny.models) {
            for (const [modelId, modelData] of Object.entries(providerAny.models)) {
              const modelAny: any = modelData;
              
              // 提取密钥信息（假设在auth中）
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
   * 渲染组件
   */
  public async render(): Promise<void> {
    if (!this.container) return;

    // 创建主界面HTML结构
    this.container.innerHTML = `
      <div class="config-parser">
        <!-- 工具栏 -->
        <div class="parser-toolbar">
          <div class="toolbar-left">
            <h2>配置解析器</h2>
            <div class="step-indicator">
              <div class="step ${this.currentStep === 'upload' ? 'active' : this.getStepStatus('upload')}">
                <span class="step-number">1</span>
                <span class="step-label">上传文件</span>
              </div>
              <div class="step ${this.currentStep === 'parse' ? 'active' : this.getStepStatus('parse')}">
                <span class="step-number">2</span>
                <span class="step-label">解析配置</span>
              </div>
              <div class="step ${this.currentStep === 'result' ? 'active' : this.getStepStatus('result')}">
                <span class="step-number">3</span>
                <span class="step-label">查看结果</span>
              </div>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary" data-action="clear" ${!this.parseResult ? 'disabled' : ''}>
              清空
            </button>
            <button class="btn btn-secondary" data-action="history">
              历史记录
            </button>
            <button class="btn btn-primary" data-action="export" ${!this.parseResult ? 'disabled' : ''}>
              导出结果
            </button>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div class="parser-content">
          <!-- 文件上传区域 -->
          <div class="step-content ${this.currentStep === 'upload' ? 'active' : ''}" id="upload-step">
            <div id="file-upload-container"></div>
          </div>

          <!-- 解析进程区域 -->
          <div class="step-content ${this.currentStep === 'parse' ? 'active' : ''}" id="parse-step">
            <div class="parse-progress">
              <h3>正在解析配置文件...</h3>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <div class="parse-status">
                <div class="status-item">
                  <span class="status-label">当前步骤：</span>
                  <span class="status-value" id="current-step-text">初始化...</span>
                </div>
                <div class="status-item">
                  <span class="status-label">已处理：</span>
                  <span class="status-value" id="processed-count">0</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 结果展示区域 -->
          <div class="step-content ${this.currentStep === 'result' ? 'active' : ''}" id="result-step">
            <div class="result-layout">
              <!-- 左侧统计信息 -->
              <div class="result-sidebar">
                <div id="parse-statistics-container"></div>
              </div>
              
              <!-- 右侧流水线列表 -->
              <div class="result-main">
                <div id="pipeline-view-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 绑定事件监听器
    this.bindEventListeners();

    // 渲染子组件
    await this.renderSubComponents();

    // 加载样式
    this.loadStyles();
  }

  /**
   * 获取步骤状态
   */
  private getStepStatus(step: string): string {
    const steps = ['upload', 'parse', 'result'];
    const currentIndex = steps.indexOf(this.currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex > currentIndex) {
      return 'pending';
    }
    return 'active';
  }

  /**
   * 渲染子组件
   */
  private async renderSubComponents(): Promise<void> {
    // 渲染简化的组件内容
    this.renderFileUpload();
    this.renderPipelineView();
    this.renderParseStatistics();
  }

  /**
   * 渲染文件上传组件
   */
  private renderFileUpload(): void {
    const container = this.container?.querySelector('#file-upload-container');
    if (!container) return;

    container.innerHTML = `
      <div class="upload-section">
        <div class="upload-area" id="upload-area">
          <div class="upload-content">
            <div class="upload-icon">📁</div>
            <h3>拖拽文件到这里或点击选择</h3>
            <p>支持 JSON、YAML 格式的配置文件</p>
            <button class="btn btn-primary" id="select-file-btn">选择文件</button>
          </div>
        </div>
        <input type="file" id="file-input" accept=".json,.yaml,.yml" style="display: none;">
      </div>
    `;

    // 绑定文件上传事件
    this.bindFileUploadEvents();
  }

  /**
   * 渲染流水线视图
   */
  private renderPipelineView(): void {
    const container = this.container?.querySelector('#pipeline-view-container');
    if (!container) return;

    if (!this.parseResult || !this.parseResult.pipelines.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>暂无流水线配置，请先上传配置文件</p>
        </div>
      `;
      return;
    }

    // 生成流水线配置用于可视化
    let pipelineConfig: any = null;
    if (this.pipelineConfigGenerator) {
      try {
        pipelineConfig = this.pipelineConfigGenerator.generatePipelineConfigs(this.parseResult);
      } catch (error) {
        console.error('生成流水线配置失败:', error);
      }
    }

    container.innerHTML = `
      <div class="pipeline-section">
        <div class="section-header">
          <h3>生成的流水线 (${this.parseResult.pipelines.length})</h3>
          <button class="btn btn-secondary" id="generate-pipeline-config-btn">
            生成流水线配置
          </button>
        </div>
        <div class="pipeline-list">
          ${this.parseResult.pipelines.map((pipeline, index) => `
            <div class="pipeline-item" data-index="${index}">
              <div class="pipeline-header">
                <h4>${pipeline.id}</h4>
                <span class="pipeline-provider ${pipeline.llmswitch.provider}">${pipeline.llmswitch.provider}</span>
              </div>
              <div class="pipeline-details">
                <div class="detail-row">
                  <span class="label">模型:</span>
                  <span class="value">${pipeline.llmswitch.model}</span>
                </div>
                <div class="detail-row">
                  <span class="label">虚拟模型:</span>
                  <span class="value">${pipeline.virtualModels.join(', ') || '无'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">密钥索引:</span>
                  <span class="value">${pipeline.llmswitch.keyIndex}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        ${pipelineConfig ? `
          <div class="pipeline-config-preview">
            <h4>流水线配置预览</h4>
            <div class="config-info">
              <div class="info-item">
                <span class="info-label">供应商:</span>
                <span class="info-value">${pipelineConfig.providers.length}</span>
              </div>
              <div class="info-item">
                <span class="info-label">虚拟模型:</span>
                <span class="info-value">${pipelineConfig.virtualModels.length}</span>
              </div>
              <div class="info-item">
                <span class="info-label">路由:</span>
                <span class="info-value">${pipelineConfig.routes.length}</span>
              </div>
              <div class="info-item">
                <span class="info-label">流水线:</span>
                <span class="info-value">${pipelineConfig.pipelines.length}</span>
              </div>
            </div>
            <button class="btn btn-primary" id="export-pipeline-config-btn">
              导出流水线配置
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    // 绑定生成流水线配置按钮事件
    const generateBtn = this.container?.querySelector('#generate-pipeline-config-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        try {
          const pipelineConfig = await this.generatePipelineConfig();
          if (pipelineConfig) {
            alert('流水线配置已生成，可通过导出功能保存');
          } else {
            alert('生成流水线配置失败');
          }
        } catch (error) {
          console.error('生成流水线配置失败:', error);
          alert(`生成失败: ${error}`);
        }
      });
    }
    
    // 绑定导出流水线配置按钮事件
    const exportBtn = this.container?.querySelector('#export-pipeline-config-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const exportData = await this.exportPipelineConfig();
          if (exportData) {
            // 创建下载链接
            const blob = new Blob([exportData], {
              type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rcc-pipeline-config-${new Date().toISOString().split('T')[0]}.json`;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } else {
            alert('导出流水线配置失败');
          }
        } catch (error) {
          console.error('导出流水线配置失败:', error);
          alert(`导出失败: ${error}`);
        }
      });
    }
  }

  /**
   * 渲染统计信息
   */
  private renderParseStatistics(): void {
    const container = this.container?.querySelector('#parse-statistics-container');
    if (!container) return;

    if (!this.parseResult) {
      container.innerHTML = `
        <div class="stats-section">
          <h3>统计信息</h3>
          <p>暂无统计数据</p>
        </div>
      `;
      return;
    }

    const stats = this.parseResult.statistics;
    
    // 生成流水线配置用于统计
    let pipelineConfig: any = null;
    if (this.pipelineConfigGenerator) {
      try {
        pipelineConfig = this.pipelineConfigGenerator.generatePipelineConfigs(this.parseResult);
      } catch (error) {
        console.error('生成流水线配置失败:', error);
      }
    }
    
    container.innerHTML = `
      <div class="stats-section">
        <h3>解析统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${stats.totalPipelines}</div>
            <div class="stat-label">流水线</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.totalProviders}</div>
            <div class="stat-label">供应商</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.totalModels}</div>
            <div class="stat-label">模型</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.totalKeys}</div>
            <div class="stat-label">密钥</div>
          </div>
        </div>
        
        ${pipelineConfig ? `
          <div class="pipeline-stats">
            <h4>流水线配置统计</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">${pipelineConfig.providers.length}</div>
                <div class="stat-label">配置供应商</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${pipelineConfig.virtualModels.length}</div>
                <div class="stat-label">虚拟模型</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${pipelineConfig.routes.length}</div>
                <div class="stat-label">路由配置</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${pipelineConfig.pipelines.length}</div>
                <div class="stat-label">流水线</div>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${this.parseResult.errors?.length ? `
          <div class="errors-section">
            <h4>错误 (${this.parseResult.errors.length})</h4>
            <ul class="error-list">
              ${this.parseResult.errors.map(error => `<li class="error-item">${error}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${this.parseResult.warnings?.length ? `
          <div class="warnings-section">
            <h4>警告 (${this.parseResult.warnings.length})</h4>
            <ul class="warning-list">
              ${this.parseResult.warnings.map(warning => `<li class="warning-item">${warning}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 绑定文件上传事件
   */
  private bindFileUploadEvents(): void {
    const uploadArea = this.container?.querySelector('#upload-area');
    const fileInput = this.container?.querySelector('#file-input') as HTMLInputElement;
    const selectBtn = this.container?.querySelector('#select-file-btn');

    if (!uploadArea || !fileInput || !selectBtn) return;

    // 点击选择文件
    selectBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (event) => {
      event.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (event: Event) => {
      event.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const dragEvent = event as DragEvent;
      const file = dragEvent.dataTransfer?.files[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });
  }

  /**
   * 绑定事件监听器
   */
  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      // 工具栏操作
      if (target.classList.contains('btn')) {
        const action = target.getAttribute('data-action');
        if (action) {
          this.handleToolbarAction(action);
        }
      }

      // 步骤切换
      if (target.closest('.step')) {
        const stepElement = target.closest('.step') as HTMLElement;
        const stepIndex = Array.from(stepElement.parentElement!.children).indexOf(stepElement);
        const steps = ['upload', 'parse', 'result'];
        const targetStep = steps[stepIndex];
        
        // 只允许跳转到已完成的步骤或当前步骤
        if (targetStep && this.canNavigateToStep(targetStep)) {
          this.navigateToStep(targetStep as 'upload' | 'parse' | 'result');
        }
      }
    });
  }

  /**
   * 判断是否可以导航到指定步骤
   */
  private canNavigateToStep(targetStep: string): boolean {
    const steps = ['upload', 'parse', 'result'];
    const currentIndex = steps.indexOf(this.currentStep);
    const targetIndex = steps.indexOf(targetStep);
    
    // 允许跳转到当前步骤或之前的步骤
    return targetIndex <= currentIndex || (targetStep === 'result' && !!this.parseResult);
  }

  /**
   * 导航到指定步骤
   */
  private async navigateToStep(step: 'upload' | 'parse' | 'result'): Promise<void> {
    this.currentStep = step;
    
    // 更新步骤指示器
    await this.render();
  }

  /**
   * 处理工具栏操作
   */
  private async handleToolbarAction(action: string): Promise<void> {
    try {
      switch (action) {
        case 'clear':
          await this.clearResults();
          break;
        case 'history':
          await this.showHistory();
          break;
        case 'export':
          await this.exportResults();
          break;
        default:
          console.warn(`Unknown toolbar action: ${action}`);
      }
    } catch (error) {
      console.error(`Failed to handle toolbar action '${action}':`, error);
    }
  }

  /**
   * 清空结果
   */
  private async clearResults(): Promise<void> {
    if (confirm('确定要清空当前的解析结果吗？')) {
      this.userConfig = null;
      this.parseResult = null;
      this.currentStep = 'upload';
      
      await this.render();
      await this.saveData();
    }
  }

  /**
   * 显示历史记录
   */
  private async showHistory(): Promise<void> {
    const historyHTML = `
      <div class="history-dialog">
        <div class="dialog-overlay">
          <div class="dialog-content">
            <h3>解析历史记录</h3>
            <div class="history-list">
              ${this.parseHistory.length === 0 ? `
                <div class="empty-state">
                  <p>暂无历史记录</p>
                </div>
              ` : this.parseHistory.map((result, index) => `
                <div class="history-item" data-index="${index}">
                  <div class="history-info">
                    <div class="history-title">解析结果 #${index + 1}</div>
                    <div class="history-stats">
                      流水线: ${result.statistics.totalPipelines} | 
                      供应商: ${result.statistics.totalProviders} | 
                      模型: ${result.statistics.totalModels}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" data-action="load-history" data-index="${index}">
                    加载
                  </button>
                </div>
              `).join('')}
            </div>
            <div class="dialog-actions">
              <button class="btn btn-secondary" data-action="close">关闭</button>
              <button class="btn btn-danger" data-action="clear-history" ${this.parseHistory.length === 0 ? 'disabled' : ''}>
                清空历史
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 显示对话框
    const dialog = document.createElement('div');
    dialog.innerHTML = historyHTML;
    document.body.appendChild(dialog);

    // 绑定事件
    dialog.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'close') {
        document.body.removeChild(dialog);
      } else if (action === 'clear-history') {
        if (confirm('确定要清空所有历史记录吗？')) {
          this.parseHistory = [];
          await this.saveData();
          document.body.removeChild(dialog);
        }
      } else if (action === 'load-history') {
        const index = parseInt(target.getAttribute('data-index') || '0');
        const historyResult = this.parseHistory[index];
        if (historyResult) {
          this.parseResult = historyResult;
          this.currentStep = 'result';
          await this.render();
        }
        document.body.removeChild(dialog);
      }
    });
  }

  /**
   * 导出结果
   */
  private async exportResults(): Promise<void> {
    if (!this.parseResult) return;

    try {
      // 创建导出选项对话框
      const exportType = prompt('选择导出类型:\n1. 解析结果\n2. 流水线配置', '1');
      
      let exportData: any;
      let filename: string;
      
      if (exportType === '2' && this.pipelineConfigGenerator) {
        // 导出流水线配置
        const pipelineConfig = this.pipelineConfigGenerator.generatePipelineConfigs(this.parseResult);
        exportData = pipelineConfig;
        filename = `rcc-pipeline-config-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // 导出解析结果
        exportData = {
          pipelines: this.parseResult.pipelines,
          statistics: this.parseResult.statistics,
          timestamp: new Date().toISOString()
        };
        filename = `rcc-pipelines-${new Date().toISOString().split('T')[0]}.json`;
      }

      // 创建下载链接
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export results:', error);
      alert(`导出失败: ${error}`);
    }
  }

  /**
   * 处理文件选择
   */
  private async handleFileSelected(file: File): Promise<void> {
    try {
      if (this.configLoadingManager) {
        // 使用配置加载管理器处理文件
        this.currentStep = 'parse';
        await this.render();
        
        const parseResult = await this.configLoadingManager.loadAndParseConfigFile(file);
        
        if (parseResult) {
          await this.handleParseComplete(parseResult);
        } else {
          // 解析失败，返回上传界面
          setTimeout(async () => {
            this.currentStep = 'upload';
            await this.render();
          }, 2000);
        }
      } else {
        // 如果没有配置加载管理器，使用原来的逻辑
        this.currentStep = 'parse';
        await this.render();
        
        // 更新解析状态
        this.updateParseStatus('读取文件内容...', 10);
        
        const content = await file.text();
        this.updateParseStatus('解析文件格式...', 30);
        
        // 解析文件内容
        let config: any;
        if (file.name.endsWith('.json')) {
          config = JSON.parse(content);
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          // 这里需要引入YAML解析器
          config = JSON.parse(content); // 临时用JSON格式
        } else {
          throw new Error(`不支持的文件格式: ${file.name}`);
        }
        
        this.userConfig = config;
        this.updateParseStatus('开始解析配置...', 50);
        
        // 调用解析服务
        const parseResult = await this.parserService.parseUserConfig(config, {
          onProgress: (step: string, progress: number) => {
            this.updateParseStatus(step, 50 + progress * 0.5);
          }
        });
        
        await this.handleParseComplete(parseResult);
      }
    } catch (error) {
      console.error('Failed to handle file selection:', error);
      this.updateParseStatus(`解析失败: ${error}`, 0);
      
      // 返回到上传步骤
      setTimeout(async () => {
        this.currentStep = 'upload';
        await this.render();
      }, 2000);
    }
  }


  /**
   * 处理解析完成
   */
  public async handleParseComplete(result: ParseResult): Promise<void> {
    this.parseResult = result;
    
    // 添加到历史记录
    this.parseHistory.unshift(result);
    if (this.parseHistory.length > 10) {
      this.parseHistory = this.parseHistory.slice(0, 10);
    }
    
    this.currentStep = 'result';
    await this.render();
    await this.saveData();
  }

  /**
   * 更新解析状态
   */
  private updateParseStatus(step: string, progress: number): void {
    const stepText = this.container?.querySelector('#current-step-text');
    const progressFill = this.container?.querySelector('.progress-fill') as HTMLElement;
    
    if (stepText) {
      stepText.textContent = step;
    }
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }

  /**
   * 加载保存的数据
   */
  private async loadSavedData(): Promise<void> {
    try {
      const savedData = await this.storageService.getConfigParserData();
      if (savedData) {
        this.userConfig = savedData.userConfig || null;
        this.parseResult = savedData.parseResult || null;
        this.currentStep = savedData.currentStep || 'upload';
        this.parseHistory = savedData.parseHistory || [];
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
    }
  }

  /**
   * 保存数据
   */
  private async saveData(): Promise<void> {
    try {
      await this.storageService.saveConfigParserData({
        userConfig: this.userConfig,
        parseResult: this.parseResult,
        currentStep: this.currentStep,
        parseHistory: this.parseHistory
      });
    } catch (error) {
      console.warn('Failed to save data:', error);
    }
  }

  /**
   * 加载配置文件
   */
  public async loadConfigurationFile(file: File): Promise<void> {
    await this.handleFileSelected(file);
  }

  /**
   * 获取解析结果
   */
  public async getParseResults(): Promise<ParseResult | null> {
    return this.parseResult;
  }

  /**
   * 生成流水线配置
   */
  public async generatePipelineConfig(): Promise<any | null> {
    if (!this.parseResult) {
      return null;
    }

    try {
      const pipelineConfig = this.pipelineConfigGenerator.generatePipelineConfigs(this.parseResult);
      return pipelineConfig;
    } catch (error) {
      console.error('Failed to generate pipeline config:', error);
      return null;
    }
  }

  /**
   * 导出流水线配置
   */
  public async exportPipelineConfig(format: 'json' | 'yaml' = 'json'): Promise<string | null> {
    const pipelineConfig = await this.generatePipelineConfig();
    if (!pipelineConfig) {
      return null;
    }

    try {
      return this.pipelineConfigGenerator.exportPipelineConfig(pipelineConfig, format);
    } catch (error) {
      console.error('Failed to export pipeline config:', error);
      return null;
    }
  }

  /**
   * 加载CSS样式
   */
  private loadStyles(): void {
    const styleId = 'config-parser-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .config-parser {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary, #f8f9fa);
      }

      .parser-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--bg-secondary, #ffffff);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .parser-toolbar h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary, #212529);
      }

      .step-indicator {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .step {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .step.pending {
        color: var(--text-muted, #adb5bd);
      }

      .step.active {
        background: var(--primary-color, #0d6efd);
        color: white;
      }

      .step.completed {
        background: var(--success-color, #198754);
        color: white;
      }

      .step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        font-size: 0.75rem;
        font-weight: bold;
      }

      .step-label {
        font-size: 0.875rem;
        font-weight: 500;
      }

      .toolbar-right {
        display: flex;
        gap: 0.5rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--primary-color, #0d6efd);
        color: white;
        border-color: var(--primary-color, #0d6efd);
      }

      .btn-secondary {
        background: var(--bg-secondary, #ffffff);
        color: var(--text-primary, #212529);
      }

      .btn-danger {
        background: var(--error-color, #dc3545);
        color: white;
        border-color: var(--error-color, #dc3545);
      }

      .btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .parser-content {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .step-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: none;
        padding: 2rem;
      }

      .step-content.active {
        display: block;
      }

      .parse-progress {
        max-width: 600px;
        margin: 0 auto;
        text-align: center;
      }

      .parse-progress h3 {
        margin: 0 0 2rem 0;
        color: var(--text-primary, #212529);
      }

      .progress-bar {
        width: 100%;
        height: 1rem;
        background: var(--bg-secondary, #e9ecef);
        border-radius: 0.5rem;
        overflow: hidden;
        margin-bottom: 2rem;
      }

      .progress-fill {
        height: 100%;
        background: var(--primary-color, #0d6efd);
        transition: width 0.3s ease;
        width: 0%;
      }

      .parse-status {
        display: flex;
        justify-content: space-between;
        gap: 2rem;
      }

      .status-item {
        text-align: left;
      }

      .status-label {
        display: block;
        font-size: 0.875rem;
        color: var(--text-secondary, #6c757d);
        margin-bottom: 0.25rem;
      }

      .status-value {
        display: block;
        font-size: 1rem;
        font-weight: 500;
        color: var(--text-primary, #212529);
      }

      .result-layout {
        display: flex;
        height: 100%;
        gap: 1rem;
      }

      .result-sidebar {
        width: 300px;
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.5rem;
        border: 1px solid var(--border-color, #dee2e6);
      }

      .result-main {
        flex: 1;
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.5rem;
        border: 1px solid var(--border-color, #dee2e6);
      }

      /* 历史对话框样式 */
      .history-dialog .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .history-dialog .dialog-content {
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.5rem;
        padding: 2rem;
        min-width: 500px;
        max-width: 700px;
        max-height: 80vh;
        overflow: auto;
      }

      .history-dialog h3 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
      }

      .history-list {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 1.5rem;
      }

      .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
      }

      .history-info {
        flex: 1;
      }

      .history-title {
        font-weight: 500;
        color: var(--text-primary, #212529);
        margin-bottom: 0.25rem;
      }

      .history-stats {
        font-size: 0.875rem;
        color: var(--text-secondary, #6c757d);
      }

      .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary, #6c757d);
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
      }

      /* 文件上传样式 */
      .upload-section {
        padding: 2rem;
      }

      .upload-area {
        border: 2px dashed var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 3rem 2rem;
        text-align: center;
        background: var(--bg-secondary, #ffffff);
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .upload-area:hover,
      .upload-area.drag-over {
        border-color: var(--primary-color, #0d6efd);
        background: var(--bg-hover, #f8f9fa);
      }

      .upload-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .upload-content h3 {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary, #212529);
      }

      .upload-content p {
        margin: 0 0 1.5rem 0;
        color: var(--text-secondary, #6c757d);
      }

      /* 流水线样式 */
      .pipeline-section {
        padding: 1.5rem;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .section-header h3 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .pipeline-list {
        display: grid;
        gap: 1rem;
      }

      .pipeline-item {
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1rem;
        background: var(--bg-secondary, #ffffff);
      }

      .pipeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .pipeline-header h4 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .pipeline-provider {
        background: var(--primary-color, #0d6efd);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
      }

      .pipeline-provider.openai {
        background: #19c37d;
      }

      .pipeline-provider.anthropic {
        background: #d09a3f;
      }

      .pipeline-provider.google {
        background: #4285f4;
      }

      .detail-row {
        display: flex;
        margin-bottom: 0.5rem;
      }

      .detail-row:last-child {
        margin-bottom: 0;
      }

      .detail-row .label {
        width: 100px;
        color: var(--text-secondary, #6c757d);
        font-weight: 500;
      }

      .detail-row .value {
        color: var(--text-primary, #212529);
      }

      /* 流水线配置预览 */
      .pipeline-config-preview {
        margin-top: 2rem;
        padding: 1.5rem;
        background: var(--bg-primary, #f8f9fa);
        border-radius: 0.5rem;
        border: 1px solid var(--border-color, #dee2e6);
      }

      .pipeline-config-preview h4 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
      }

      .config-info {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem;
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.375rem;
      }

      .info-label {
        font-weight: 500;
        color: var(--text-secondary, #6c757d);
      }

      .info-value {
        font-weight: 500;
        color: var(--text-primary, #212529);
      }

      /* 统计样式 */
      .stats-section {
        padding: 1.5rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin: 1rem 0;
      }

      .stat-item {
        text-align: center;
        padding: 1rem;
        background: var(--bg-primary, #f8f9fa);
        border-radius: 0.5rem;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-color, #0d6efd);
        margin-bottom: 0.25rem;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--text-secondary, #6c757d);
      }

      .pipeline-stats {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border-color, #dee2e6);
      }

      .pipeline-stats h4 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
      }

      .errors-section,
      .warnings-section {
        margin-top: 1.5rem;
      }

      .errors-section h4 {
        color: var(--error-color, #dc3545);
        margin: 0 0 0.75rem 0;
      }

      .warnings-section h4 {
        color: #ffc107;
        margin: 0 0 0.75rem 0;
      }

      .error-list,
      .warning-list {
        margin: 0;
        padding-left: 1.5rem;
      }

      .error-item {
        color: var(--error-color, #dc3545);
        margin-bottom: 0.5rem;
      }

      .warning-item {
        color: #856404;
        margin-bottom: 0.5rem;
      }
      
      /* 配置中心UI样式 */
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
      
      .config-center-content {
        flex: 1;
        overflow: auto;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 获取组件数据
   */
  public getData(): any {
    return {
      userConfig: this.userConfig,
      parseResult: this.parseResult,
      currentStep: this.currentStep,
      parseHistory: this.parseHistory
    };
  }

  /**
   * 设置组件数据
   */
  public setData(data: any): void {
    if (data.userConfig) this.userConfig = data.userConfig;
    if (data.parseResult) this.parseResult = data.parseResult;
    if (data.currentStep) this.currentStep = data.currentStep;
    if (data.parseHistory) this.parseHistory = data.parseHistory;
  }

  /**
   * 验证组件数据
   */
  public validate(): boolean | string[] {
    // 解析器不需要特殊验证，只要有解析结果即可
    return this.parseResult !== null;
  }

  /**
   * 销毁组件
   */
  public async destroy(): Promise<void> {
    try {
      // 清理事件监听器和数据

      // 清理DOM
      if (this.container) {
        this.container.innerHTML = '';
      }

      // 移除样式
      const style = document.getElementById('config-parser-styles');
      if (style) {
        style.remove();
      }

      console.log('ConfigParserMain destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy ConfigParserMain:', error);
      throw error;
    }
  }
}
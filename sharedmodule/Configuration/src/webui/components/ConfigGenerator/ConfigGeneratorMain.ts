/**
 * 配置生成器主组件
 * 
 * 提供用于生成RCC配置文件的可视化界面
 * 包括供应商管理、路由配置、密钥管理等功能
 */

import { 
  UIComponent, 
  ConfigGeneratorOptions, 
  ProviderConfig, 
  ModelConfig, 
  VirtualModelConfig, 
  RouteConfig 
} from '../../types/ui.types';

/**
 * 配置生成器主组件
 */
export class ConfigGeneratorMain implements UIComponent {
  private container: HTMLElement | null = null;
  private options: ConfigGeneratorOptions;
  private configService: any;
  private storageService: any;
  
  // 数据状态
  private providers: ProviderConfig[] = [];
  private virtualModels: VirtualModelConfig[] = [];
  private routes: RouteConfig[] = [];
  private currentConfig: any = null;
  private activeTab: string = 'providers';

  constructor() {
    this.options = {} as ConfigGeneratorOptions;
    this.configService = null;
    this.storageService = null;
  }

  /**
   * 初始化组件
   */
  public async initialize(options: ConfigGeneratorOptions): Promise<void> {
    try {
      this.options = options;
      this.configService = options.configService;
      this.storageService = options.storageService;

      // 获取容器元素
      this.container = document.getElementById(options.containerId);
      if (!this.container) {
        throw new Error(`Container element with ID '${options.containerId}' not found`);
      }

      // 初始化子组件
      await this.initializeSubComponents();

      // 加载保存的数据
      await this.loadSavedData();

      console.log('ConfigGeneratorMain initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigGeneratorMain:', error);
      throw error;
    }
  }

  /**
   * 初始化子组件
   */
  private async initializeSubComponents(): Promise<void> {
    // 暂时不需要初始化复杂的子组件，直接使用基础的HTML表单
    console.log('Sub-components initialized (simplified)');
  }

  /**
   * 渲染组件
   */
  public async render(): Promise<void> {
    if (!this.container) return;

    // 创建主界面HTML结构
    this.container.innerHTML = `
      <div class="config-generator">
        <!-- 工具栏 -->
        <div class="generator-toolbar">
          <div class="toolbar-left">
            <h2>配置生成器</h2>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary" data-action="reset">重置</button>
            <button class="btn btn-secondary" data-action="load-template">加载模板</button>
            <button class="btn btn-primary" data-action="generate">生成配置</button>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div class="generator-content">
          <!-- 左侧编辑区 -->
          <div class="generator-editor">
            <!-- 选项卡导航 -->
            <div class="tab-navigation">
              <button class="tab-btn ${this.activeTab === 'providers' ? 'active' : ''}" data-tab="providers">
                供应商配置
              </button>
              <button class="tab-btn ${this.activeTab === 'models' ? 'active' : ''}" data-tab="models">
                模型配置
              </button>
              <button class="tab-btn ${this.activeTab === 'virtual-models' ? 'active' : ''}" data-tab="virtual-models">
                虚拟模型
              </button>
              <button class="tab-btn ${this.activeTab === 'routes' ? 'active' : ''}" data-tab="routes">
                路由配置
              </button>
            </div>

            <!-- 选项卡内容 -->
            <div class="tab-content">
              <div id="providers-tab" class="tab-panel ${this.activeTab === 'providers' ? 'active' : ''}">
                <div id="provider-form-container"></div>
              </div>
              <div id="models-tab" class="tab-panel ${this.activeTab === 'models' ? 'active' : ''}">
                <div id="model-form-container"></div>
              </div>
              <div id="virtual-models-tab" class="tab-panel ${this.activeTab === 'virtual-models' ? 'active' : ''}">
                <div id="virtual-model-form-container"></div>
              </div>
              <div id="routes-tab" class="tab-panel ${this.activeTab === 'routes' ? 'active' : ''}">
                <div id="routes-form-container"></div>
              </div>
            </div>
          </div>

          <!-- 右侧预览区 -->
          <div class="generator-preview">
            <div id="config-preview-container"></div>
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
   * 渲染子组件
   */
  private async renderSubComponents(): Promise<void> {
    // 渲染简化的表单内容
    this.renderProviderForm();
    this.renderModelForm();
    this.renderVirtualModelForm();
    this.renderConfigPreview();
  }

  /**
   * 渲染供应商表单
   */
  private renderProviderForm(): void {
    const container = this.container?.querySelector('#provider-form-container');
    if (!container) return;

    container.innerHTML = `
      <div class="form-section">
        <h3>供应商配置</h3>
        <div class="provider-list">
          ${this.providers.map((provider, index) => `
            <div class="provider-item" data-index="${index}">
              <div class="provider-header">
                <h4>${provider.name}</h4>
                <button class="btn-remove" data-action="remove-provider" data-index="${index}">删除</button>
              </div>
              <div class="provider-details">
                <p>类型: ${provider.type}</p>
                <p>端点: ${provider.endpoint || 'N/A'}</p>
                <p>模型数量: ${provider.models.length}</p>
                <p>密钥数量: ${provider.auth.keys.length}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary" data-action="add-provider">添加供应商</button>
      </div>
    `;
  }

  /**
   * 渲染模型表单
   */
  private renderModelForm(): void {
    const container = this.container?.querySelector('#model-form-container');
    if (!container) return;

    container.innerHTML = `
      <div class="form-section">
        <h3>模型配置</h3>
        <div class="model-summary">
          <p>总计: ${this.providers.reduce((sum, p) => sum + p.models.length, 0)} 个模型</p>
        </div>
      </div>
    `;
  }

  /**
   * 渲染虚拟模型表单
   */
  private renderVirtualModelForm(): void {
    const container = this.container?.querySelector('#virtual-model-form-container');
    if (!container) return;

    container.innerHTML = `
      <div class="form-section">
        <h3>虚拟模型配置</h3>
        <div class="virtual-model-list">
          ${this.virtualModels.map((vm, index) => `
            <div class="virtual-model-item" data-index="${index}">
              <div class="vm-header">
                <h4>${vm.name}</h4>
                <button class="btn-remove" data-action="remove-vm" data-index="${index}">删除</button>
              </div>
              <div class="vm-details">
                <p>目标提供商: ${vm.targetProvider}</p>
                <p>目标模型: ${vm.targetModel}</p>
                <p>权重: ${vm.weight || 1}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary" data-action="add-vm">添加虚拟模型</button>
      </div>
    `;
  }

  /**
   * 渲染配置预览
   */
  private renderConfigPreview(): void {
    const container = this.container?.querySelector('#config-preview-container');
    if (!container) return;

    container.innerHTML = `
      <div class="preview-section">
        <h3>配置预览</h3>
        <div class="preview-content">
          ${this.currentConfig ? `
            <pre class="config-json">${JSON.stringify(this.currentConfig, null, 2)}</pre>
          ` : `
            <p class="no-config">点击"生成配置"按钮生成预览</p>
          `}
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件监听器
   */
  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      // 选项卡切换
      if (target.classList.contains('tab-btn')) {
        const tab = target.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      }

      // 工具栏操作
      if (target.classList.contains('btn')) {
        const action = target.getAttribute('data-action');
        if (action) {
          this.handleToolbarAction(action);
        }
      }
    });
  }

  /**
   * 切换选项卡
   */
  private switchTab(tab: string): void {
    this.activeTab = tab;

    // 更新选项卡按钮状态
    const tabButtons = this.container?.querySelectorAll('.tab-btn');
    tabButtons?.forEach(btn => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 更新选项卡面板状态
    const tabPanels = this.container?.querySelectorAll('.tab-panel');
    tabPanels?.forEach(panel => {
      if (panel.id === `${tab}-tab`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  /**
   * 处理工具栏操作
   */
  private async handleToolbarAction(action: string): Promise<void> {
    try {
      switch (action) {
        case 'reset':
          await this.resetConfiguration();
          break;
        case 'load-template':
          await this.loadTemplate();
          break;
        case 'generate':
          await this.generateConfiguration();
          break;
        default:
          console.warn(`Unknown toolbar action: ${action}`);
      }
    } catch (error) {
      console.error(`Failed to handle toolbar action '${action}':`, error);
    }
  }

  /**
   * 重置配置
   */
  private async resetConfiguration(): Promise<void> {
    if (confirm('确定要重置所有配置吗？此操作不可撤销。')) {
      this.providers = [];
      this.virtualModels = [];
      this.routes = [];
      this.currentConfig = null;
      
      await this.renderSubComponents();
      await this.saveData();
    }
  }

  /**
   * 加载模板
   */
  private async loadTemplate(): Promise<void> {
    const templates = [
      { name: '单供应商模板', value: 'single-provider' },
      { name: '多供应商模板', value: 'multi-provider' },
      { name: '企业级模板', value: 'enterprise' }
    ];

    // 创建模板选择对话框
    const templateHTML = `
      <div class="template-dialog">
        <div class="dialog-overlay">
          <div class="dialog-content">
            <h3>选择配置模板</h3>
            <div class="template-list">
              ${templates.map(template => `
                <button class="template-item" data-template="${template.value}">
                  ${template.name}
                </button>
              `).join('')}
            </div>
            <div class="dialog-actions">
              <button class="btn btn-secondary" data-action="cancel">取消</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 显示对话框
    const dialog = document.createElement('div');
    dialog.innerHTML = templateHTML;
    document.body.appendChild(dialog);

    // 绑定事件
    dialog.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('template-item')) {
        const templateType = target.getAttribute('data-template');
        if (templateType) {
          await this.applyTemplate(templateType);
        }
        document.body.removeChild(dialog);
      } else if (target.getAttribute('data-action') === 'cancel') {
        document.body.removeChild(dialog);
      }
    });
  }

  /**
   * 应用模板
   */
  private async applyTemplate(templateType: string): Promise<void> {
    const template = await this.configService.getTemplate(templateType);
    if (template) {
      this.providers = template.providers || [];
      this.virtualModels = template.virtualModels || [];
      this.routes = template.routes || [];
      
      await this.renderSubComponents();
      await this.generateConfiguration();
      await this.saveData();
    }
  }

  /**
   * 生成配置
   */
  private async generateConfiguration(): Promise<void> {
    try {
      this.currentConfig = await this.configService.generateConfig({
        providers: this.providers,
        virtualModels: this.virtualModels,
        routes: this.routes
      });

      // 更新预览
      if (this.configPreview) {
        await this.configPreview.updateConfig(this.currentConfig);
      }

      await this.saveData();
    } catch (error) {
      console.error('Failed to generate configuration:', error);
      throw error;
    }
  }

  /**
   * 处理供应商变化
   */
  private async handleProviderChange(providers: ProviderConfig[]): Promise<void> {
    this.providers = providers;
    await this.generateConfiguration();
    await this.saveData();
  }

  /**
   * 处理模型变化
   */
  private async handleModelChange(): Promise<void> {
    await this.generateConfiguration();
    await this.saveData();
  }

  /**
   * 处理虚拟模型变化
   */
  private async handleVirtualModelChange(virtualModels: VirtualModelConfig[]): Promise<void> {
    this.virtualModels = virtualModels;
    await this.generateConfiguration();
    await this.saveData();
  }

  /**
   * 加载保存的数据
   */
  private async loadSavedData(): Promise<void> {
    try {
      const savedData = await this.storageService.getConfigGeneratorData();
      if (savedData) {
        this.providers = savedData.providers || [];
        this.virtualModels = savedData.virtualModels || [];
        this.routes = savedData.routes || [];
        this.currentConfig = savedData.currentConfig || null;
        this.activeTab = savedData.activeTab || 'providers';
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
      await this.storageService.saveConfigGeneratorData({
        providers: this.providers,
        virtualModels: this.virtualModels,
        routes: this.routes,
        currentConfig: this.currentConfig,
        activeTab: this.activeTab
      });
    } catch (error) {
      console.warn('Failed to save data:', error);
    }
  }

  /**
   * 加载配置
   */
  public async loadConfiguration(config: any): Promise<void> {
    try {
      if (config.providers) {
        this.providers = config.providers;
      }
      if (config.virtualModels) {
        this.virtualModels = config.virtualModels;
      }
      if (config.routes) {
        this.routes = config.routes;
      }

      await this.renderSubComponents();
      await this.generateConfiguration();
      await this.saveData();
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * 获取当前配置
   */
  public async getCurrentConfiguration(): Promise<any> {
    return this.currentConfig;
  }

  /**
   * 新建配置
   */
  public async newConfiguration(): Promise<void> {
    await this.resetConfiguration();
  }

  /**
   * 加载CSS样式
   */
  private loadStyles(): void {
    const styleId = 'config-generator-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .config-generator {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary, #f8f9fa);
      }

      .generator-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--bg-secondary, #ffffff);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .generator-toolbar h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary, #212529);
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

      .btn-primary {
        background: var(--primary-color, #0d6efd);
        color: white;
        border-color: var(--primary-color, #0d6efd);
      }

      .btn-secondary {
        background: var(--bg-secondary, #ffffff);
        color: var(--text-primary, #212529);
      }

      .btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .generator-content {
        display: flex;
        flex: 1;
        min-height: 0;
      }

      .generator-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--bg-secondary, #ffffff);
        border-right: 1px solid var(--border-color, #dee2e6);
      }

      .tab-navigation {
        display: flex;
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
      }

      .tab-btn:hover {
        background: var(--bg-hover, #f8f9fa);
        color: var(--text-primary, #212529);
      }

      .tab-btn.active {
        color: var(--primary-color, #0d6efd);
        border-bottom-color: var(--primary-color, #0d6efd);
      }

      .tab-content {
        flex: 1;
        overflow: auto;
      }

      .tab-panel {
        display: none;
        height: 100%;
        padding: 1rem;
      }

      .tab-panel.active {
        display: block;
      }

      .generator-preview {
        width: 40%;
        background: var(--bg-primary, #f8f9fa);
        border-left: 1px solid var(--border-color, #dee2e6);
      }

      .template-dialog .dialog-overlay {
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

      .template-dialog .dialog-content {
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.5rem;
        padding: 2rem;
        min-width: 300px;
        max-width: 500px;
      }

      .template-dialog h3 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
      }

      .template-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
      }

      .template-item {
        padding: 1rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        background: var(--bg-primary, #f8f9fa);
        cursor: pointer;
        transition: all 0.2s;
      }

      .template-item:hover {
        background: var(--primary-color, #0d6efd);
        color: white;
        border-color: var(--primary-color, #0d6efd);
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      /* 表单样式 */
      .form-section {
        padding: 1.5rem;
      }

      .form-section h3 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
        border-bottom: 1px solid var(--border-color, #dee2e6);
        padding-bottom: 0.5rem;
      }

      .provider-list,
      .virtual-model-list {
        margin-bottom: 1rem;
      }

      .provider-item,
      .virtual-model-item {
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
        background: var(--bg-secondary, #ffffff);
      }

      .provider-header,
      .vm-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .provider-header h4,
      .vm-header h4 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .btn-remove {
        background: var(--error-color, #dc3545);
        color: white;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
      }

      .btn-remove:hover {
        opacity: 0.9;
      }

      .provider-details,
      .vm-details {
        color: var(--text-secondary, #6c757d);
        font-size: 0.875rem;
      }

      .provider-details p,
      .vm-details p {
        margin: 0.25rem 0;
      }

      .model-summary {
        padding: 1rem;
        background: var(--bg-primary, #f8f9fa);
        border-radius: 0.5rem;
        margin-bottom: 1rem;
      }

      .model-summary p {
        margin: 0;
        color: var(--text-secondary, #6c757d);
      }

      /* 预览样式 */
      .preview-section {
        padding: 1.5rem;
        height: 100%;
        overflow: auto;
      }

      .preview-section h3 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
        border-bottom: 1px solid var(--border-color, #dee2e6);
        padding-bottom: 0.5rem;
      }

      .preview-content {
        height: calc(100% - 3rem);
      }

      .config-json {
        background: var(--bg-primary, #f8f9fa);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.875rem;
        line-height: 1.4;
        overflow: auto;
        max-height: 500px;
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .no-config {
        text-align: center;
        color: var(--text-secondary, #6c757d);
        padding: 3rem 1rem;
        font-style: italic;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 获取组件数据
   */
  public getData(): any {
    return {
      providers: this.providers,
      virtualModels: this.virtualModels,
      routes: this.routes,
      currentConfig: this.currentConfig,
      activeTab: this.activeTab
    };
  }

  /**
   * 设置组件数据
   */
  public setData(data: any): void {
    if (data.providers) this.providers = data.providers;
    if (data.virtualModels) this.virtualModels = data.virtualModels;
    if (data.routes) this.routes = data.routes;
    if (data.currentConfig) this.currentConfig = data.currentConfig;
    if (data.activeTab) this.activeTab = data.activeTab;
  }

  /**
   * 验证组件数据
   */
  public validate(): boolean | string[] {
    const errors: string[] = [];

    if (this.providers.length === 0) {
      errors.push('至少需要配置一个供应商');
    }

    // 验证供应商配置
    for (const provider of this.providers) {
      if (!provider.name) {
        errors.push(`供应商 ${provider.id} 缺少名称`);
      }
      if (!provider.auth || !provider.auth.keys || provider.auth.keys.length === 0) {
        errors.push(`供应商 ${provider.name} 缺少API密钥`);
      }
      if (!provider.models || provider.models.length === 0) {
        errors.push(`供应商 ${provider.name} 缺少模型配置`);
      }
    }

    return errors.length === 0 ? true : errors;
  }

  /**
   * 销毁组件
   */
  public async destroy(): Promise<void> {
    try {
      // 销毁子组件
      if (this.providerForm) {
        await this.providerForm.destroy();
        this.providerForm = null;
      }

      if (this.modelForm) {
        await this.modelForm.destroy();
        this.modelForm = null;
      }

      if (this.virtualModelForm) {
        await this.virtualModelForm.destroy();
        this.virtualModelForm = null;
      }

      if (this.configPreview) {
        await this.configPreview.destroy();
        this.configPreview = null;
      }

      // 清理DOM
      if (this.container) {
        this.container.innerHTML = '';
      }

      // 移除样式
      const style = document.getElementById('config-generator-styles');
      if (style) {
        style.remove();
      }

      console.log('ConfigGeneratorMain destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy ConfigGeneratorMain:', error);
      throw error;
    }
  }
}
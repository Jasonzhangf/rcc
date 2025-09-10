/**
 * RCC Configuration Center Web UI
 * 
 * 统一入口点，提供配置中心的完整Web界面功能
 * 包括配置生成、配置解析、通用组件等模块
 */

import { ConfigGeneratorMain } from './components/ConfigGenerator/ConfigGeneratorMain';
import { ConfigParserMain } from './components/ConfigParser/ConfigParserMain';
import { ConfigService } from './services/ConfigService';
import { ParserService } from './services/ParserService';
import { StorageService } from './services/StorageService';
import {
  UIConfig,
  NavigationState
} from './types/ui.types';

/**
 * 配置中心UI主类
 * 统一管理所有Web UI组件和服务
 */
export class ConfigurationCenterUI {
  private static instance: ConfigurationCenterUI | null = null;
  private configGenerator: ConfigGeneratorMain | null = null;
  private configParser: ConfigParserMain | null = null;
  private configService: ConfigService;
  private parserService: ParserService;
  private storageService: StorageService;
  private navigationState: NavigationState;
  private rootElement: HTMLElement | null = null;

  private constructor() {
    this.configService = new ConfigService();
    this.parserService = new ParserService();
    this.storageService = new StorageService();
    this.navigationState = {
      currentView: 'generator',
      isMenuExpanded: true,
      history: []
    };
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
   * 初始化UI系统
   */
  public async initialize(options: UIConfig): Promise<void> {
    try {
      // 验证容器元素
      this.rootElement = document.getElementById(options.containerId);
      if (!this.rootElement) {
        throw new Error(`Container element with ID '${options.containerId}' not found`);
      }

      // 初始化服务
      await this.configService.initialize();
      await this.parserService.initialize();
      await this.storageService.initialize();

      // 创建主界面布局
      this.createMainLayout(options);

      // 初始化默认视图
      await this.switchToView(options.defaultView || 'generator');

      console.log('Configuration Center UI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Configuration Center UI:', error);
      throw error;
    }
  }

  /**
   * 创建主界面布局
   */
  private createMainLayout(options: UIConfig): void {
    if (!this.rootElement) return;

    // 应用主题
    this.rootElement.setAttribute('data-theme', options.theme || 'auto');
    
    // 创建基础HTML结构
    this.rootElement.innerHTML = `
      <div class="config-center-app">
        <!-- Header -->
        <header class="config-center-header">
          <div class="header-brand">
            <h1>RCC Configuration Center</h1>
          </div>
          <nav class="header-nav">
            <button class="nav-btn" data-view="generator" ${this.navigationState.currentView === 'generator' ? 'aria-current="page"' : ''}>
              配置生成
            </button>
            <button class="nav-btn" data-view="parser" ${this.navigationState.currentView === 'parser' ? 'aria-current="page"' : ''}>
              配置解析
            </button>
          </nav>
          <div class="header-actions">
            <button class="theme-toggle" title="切换主题">
              🌓
            </button>
            <button class="menu-toggle" title="菜单">
              ☰
            </button>
          </div>
        </header>

        <!-- Sidebar -->
        <aside class="config-center-sidebar ${this.navigationState.isMenuExpanded ? 'expanded' : 'collapsed'}">
          <div class="sidebar-content">
            <div class="sidebar-section">
              <h3>快速操作</h3>
              <ul class="sidebar-menu">
                <li><button class="menu-item" data-action="new-config">新建配置</button></li>
                <li><button class="menu-item" data-action="load-config">加载配置</button></li>
                <li><button class="menu-item" data-action="save-config">保存配置</button></li>
              </ul>
            </div>
            <div class="sidebar-section">
              <h3>最近文件</h3>
              <div class="recent-files"></div>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="config-center-main">
          <div class="main-content">
            <!-- 动态内容区域 -->
            <div id="config-generator-container" class="view-container" style="display: none;"></div>
            <div id="config-parser-container" class="view-container" style="display: none;"></div>
          </div>
        </main>

        <!-- Status Bar -->
        <footer class="config-center-footer">
          <div class="status-info">
            <span class="status-text">就绪</span>
          </div>
          <div class="version-info">
            <span>v${options.version || '1.0.0'}</span>
          </div>
        </footer>
      </div>
    `;

    // 绑定事件监听器
    this.bindEventListeners();

    // 加载样式
    this.loadStyles();
  }

  /**
   * 绑定事件监听器
   */
  private bindEventListeners(): void {
    if (!this.rootElement) return;

    // 导航按钮
    this.rootElement.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // 视图切换
      if (target.classList.contains('nav-btn')) {
        const view = target.getAttribute('data-view') as 'generator' | 'parser';
        if (view) {
          this.switchToView(view);
        }
      }

      // 菜单切换
      if (target.classList.contains('menu-toggle')) {
        this.toggleMenu();
      }

      // 主题切换
      if (target.classList.contains('theme-toggle')) {
        this.toggleTheme();
      }

      // 侧边栏操作
      if (target.classList.contains('menu-item')) {
        const action = target.getAttribute('data-action');
        if (action) {
          this.handleMenuAction(action);
        }
      }
    });
  }

  /**
   * 切换视图
   */
  public async switchToView(view: 'generator' | 'parser'): Promise<void> {
    try {
      // 更新导航状态
      this.navigationState.currentView = view;
      this.navigationState.history.push(view);

      // 更新导航按钮状态
      this.updateNavigationState();

      // 隐藏所有视图
      const containers = this.rootElement?.querySelectorAll('.view-container');
      containers?.forEach(container => {
        (container as HTMLElement).style.display = 'none';
      });

      // 显示目标视图
      if (view === 'generator') {
        await this.showConfigGenerator();
      } else if (view === 'parser') {
        await this.showConfigParser();
      }

      // 更新状态栏
      this.updateStatusBar(`已切换到${view === 'generator' ? '配置生成' : '配置解析'}模式`);
    } catch (error) {
      console.error(`Failed to switch to view '${view}':`, error);
      this.updateStatusBar(`切换视图失败: ${error}`, 'error');
    }
  }

  /**
   * 显示配置生成器
   */
  private async showConfigGenerator(): Promise<void> {
    const container = this.rootElement?.querySelector('#config-generator-container') as HTMLElement;
    if (!container) return;

    container.style.display = 'block';

    if (!this.configGenerator) {
      this.configGenerator = new ConfigGeneratorMain();
      await this.configGenerator.initialize({
        containerId: 'config-generator-container',
        configService: this.configService,
        storageService: this.storageService
      });
    }

    await this.configGenerator.render();
  }

  /**
   * 显示配置解析器
   */
  private async showConfigParser(): Promise<void> {
    const container = this.rootElement?.querySelector('#config-parser-container') as HTMLElement;
    if (!container) return;

    container.style.display = 'block';

    if (!this.configParser) {
      this.configParser = new ConfigParserMain();
      await this.configParser.initialize({
        containerId: 'config-parser-container',
        parserService: this.parserService,
        storageService: this.storageService
      });
    }

    await this.configParser.render();
  }

  /**
   * 更新导航状态
   */
  private updateNavigationState(): void {
    const navButtons = this.rootElement?.querySelectorAll('.nav-btn');
    navButtons?.forEach(btn => {
      const view = btn.getAttribute('data-view');
      if (view === this.navigationState.currentView) {
        btn.setAttribute('aria-current', 'page');
        btn.classList.add('active');
      } else {
        btn.removeAttribute('aria-current');
        btn.classList.remove('active');
      }
    });
  }

  /**
   * 切换菜单展开状态
   */
  private toggleMenu(): void {
    this.navigationState.isMenuExpanded = !this.navigationState.isMenuExpanded;
    const sidebar = this.rootElement?.querySelector('.config-center-sidebar');
    if (sidebar) {
      if (this.navigationState.isMenuExpanded) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('expanded');
      }
    }
  }

  /**
   * 切换主题
   */
  private toggleTheme(): void {
    const currentTheme = this.rootElement?.getAttribute('data-theme') || 'auto';
    const newTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'auto' : 'light';
    this.rootElement?.setAttribute('data-theme', newTheme);
    this.storageService.setUserPreference('theme', newTheme);
  }

  /**
   * 处理菜单操作
   */
  private async handleMenuAction(action: string): Promise<void> {
    try {
      switch (action) {
        case 'new-config':
          await this.newConfig();
          break;
        case 'load-config':
          await this.loadConfig();
          break;
        case 'save-config':
          await this.saveConfig();
          break;
        default:
          console.warn(`Unknown menu action: ${action}`);
      }
    } catch (error) {
      console.error(`Failed to handle menu action '${action}':`, error);
      this.updateStatusBar(`操作失败: ${error}`, 'error');
    }
  }

  /**
   * 新建配置
   */
  private async newConfig(): Promise<void> {
    if (this.navigationState.currentView === 'generator' && this.configGenerator) {
      await this.configGenerator.newConfiguration();
    }
    this.updateStatusBar('创建新配置');
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.yaml,.yml';
    input.style.display = 'none';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const content = await file.text();
          const config = JSON.parse(content);
          
          if (this.navigationState.currentView === 'generator' && this.configGenerator) {
            await this.configGenerator.loadConfiguration(config);
          } else if (this.navigationState.currentView === 'parser' && this.configParser) {
            await this.configParser.loadConfigurationFile(file);
          }
          
          this.updateStatusBar(`已加载配置: ${file.name}`);
        } catch (error) {
          this.updateStatusBar(`加载配置失败: ${error}`, 'error');
        }
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      let config: any;
      let filename: string;

      if (this.navigationState.currentView === 'generator' && this.configGenerator) {
        config = await this.configGenerator.getCurrentConfiguration();
        filename = 'rcc-config.json';
      } else if (this.navigationState.currentView === 'parser' && this.configParser) {
        config = await this.configParser.getParseResults();
        filename = 'parsed-pipelines.json';
      } else {
        throw new Error('No active configuration to save');
      }

      // 创建下载链接
      const blob = new Blob([JSON.stringify(config, null, 2)], {
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

      this.updateStatusBar(`已保存配置: ${filename}`);
    } catch (error) {
      this.updateStatusBar(`保存配置失败: ${error}`, 'error');
    }
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    const statusText = this.rootElement?.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `status-text status-${type}`;
      
      // 自动清除状态消息
      if (type !== 'error') {
        setTimeout(() => {
          statusText.textContent = '就绪';
          statusText.className = 'status-text';
        }, 3000);
      }
    }
  }

  /**
   * 加载UI样式
   */
  private loadStyles(): void {
    const styleId = 'config-center-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .config-center-app {
        display: grid;
        grid-template-areas:
          "header header"
          "sidebar main"
          "footer footer";
        grid-template-rows: auto 1fr auto;
        grid-template-columns: auto 1fr;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .config-center-header {
        grid-area: header;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--bg-primary, #f8f9fa);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .header-brand h1 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary, #212529);
      }

      .header-nav {
        display: flex;
        gap: 0.5rem;
      }

      .nav-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color, #dee2e6);
        background: var(--bg-secondary, #ffffff);
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nav-btn:hover,
      .nav-btn.active {
        background: var(--primary-color, #0d6efd);
        color: white;
        border-color: var(--primary-color, #0d6efd);
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
      }

      .theme-toggle,
      .menu-toggle {
        padding: 0.5rem;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 0.375rem;
        transition: background-color 0.2s;
      }

      .theme-toggle:hover,
      .menu-toggle:hover {
        background: var(--bg-hover, #e9ecef);
      }

      .config-center-sidebar {
        grid-area: sidebar;
        background: var(--bg-secondary, #ffffff);
        border-right: 1px solid var(--border-color, #dee2e6);
        transition: width 0.3s;
      }

      .config-center-sidebar.expanded {
        width: 250px;
      }

      .config-center-sidebar.collapsed {
        width: 60px;
      }

      .sidebar-content {
        padding: 1rem;
      }

      .sidebar-section {
        margin-bottom: 2rem;
      }

      .sidebar-section h3 {
        margin: 0 0 0.75rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary, #6c757d);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .sidebar-menu {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .menu-item {
        display: block;
        width: 100%;
        padding: 0.5rem;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        border-radius: 0.375rem;
        transition: background-color 0.2s;
        color: var(--text-primary, #212529);
      }

      .menu-item:hover {
        background: var(--bg-hover, #e9ecef);
      }

      .config-center-main {
        grid-area: main;
        overflow: auto;
        background: var(--bg-primary, #f8f9fa);
      }

      .main-content {
        height: 100%;
      }

      .view-container {
        height: 100%;
        padding: 1rem;
      }

      .config-center-footer {
        grid-area: footer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: var(--bg-secondary, #ffffff);
        border-top: 1px solid var(--border-color, #dee2e6);
        font-size: 0.875rem;
      }

      .status-text {
        color: var(--text-secondary, #6c757d);
      }

      .status-text.status-error {
        color: var(--error-color, #dc3545);
      }

      .status-text.status-success {
        color: var(--success-color, #198754);
      }

      /* 主题样式 */
      [data-theme="dark"] {
        --bg-primary: #212529;
        --bg-secondary: #343a40;
        --bg-hover: #495057;
        --text-primary: #ffffff;
        --text-secondary: #adb5bd;
        --border-color: #495057;
        --primary-color: #0d6efd;
        --error-color: #dc3545;
        --success-color: #198754;
      }

      [data-theme="light"] {
        --bg-primary: #f8f9fa;
        --bg-secondary: #ffffff;
        --bg-hover: #e9ecef;
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --border-color: #dee2e6;
        --primary-color: #0d6efd;
        --error-color: #dc3545;
        --success-color: #198754;
      }

      @media (prefers-color-scheme: dark) {
        [data-theme="auto"] {
          --bg-primary: #212529;
          --bg-secondary: #343a40;
          --bg-hover: #495057;
          --text-primary: #ffffff;
          --text-secondary: #adb5bd;
          --border-color: #495057;
          --primary-color: #0d6efd;
          --error-color: #dc3545;
          --success-color: #198754;
        }
      }

      @media (prefers-color-scheme: light) {
        [data-theme="auto"] {
          --bg-primary: #f8f9fa;
          --bg-secondary: #ffffff;
          --bg-hover: #e9ecef;
          --text-primary: #212529;
          --text-secondary: #6c757d;
          --border-color: #dee2e6;
          --primary-color: #0d6efd;
          --error-color: #dc3545;
          --success-color: #198754;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 获取当前配置
   */
  public async getCurrentConfiguration(): Promise<any> {
    if (this.navigationState.currentView === 'generator' && this.configGenerator) {
      return await this.configGenerator.getCurrentConfiguration();
    } else if (this.navigationState.currentView === 'parser' && this.configParser) {
      return await this.configParser.getParseResults();
    }
    return null;
  }

  /**
   * 获取服务实例
   */
  public getServices() {
    return {
      configService: this.configService,
      parserService: this.parserService,
      storageService: this.storageService
    };
  }

  /**
   * 销毁UI系统
   */
  public async destroy(): Promise<void> {
    try {
      // 销毁组件
      if (this.configGenerator) {
        await this.configGenerator.destroy();
        this.configGenerator = null;
      }

      if (this.configParser) {
        await this.configParser.destroy();
        this.configParser = null;
      }

      // 清理DOM
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }

      // 移除样式
      const style = document.getElementById('config-center-styles');
      if (style) {
        style.remove();
      }

      // 重置单例
      ConfigurationCenterUI.instance = null;

      console.log('Configuration Center UI destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy Configuration Center UI:', error);
      throw error;
    }
  }
}

// 导出组件和服务
export * from './components';
export * from './services/ConfigService';
export * from './services/ParserService';
export * from './services/StorageService';
export * from './types/ui.types';
export * from './utils/ui.utils';

// 默认导出
export default ConfigurationCenterUI;
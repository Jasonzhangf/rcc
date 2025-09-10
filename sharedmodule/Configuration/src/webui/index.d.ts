/**
 * RCC Configuration Center Web UI
 *
 * 统一入口点，提供配置中心的完整Web界面功能
 * 包括配置生成、配置解析、通用组件等模块
 */
import { ConfigService } from './services/ConfigService';
import { ParserService } from './services/ParserService';
import { StorageService } from './services/StorageService';
import { UIConfig } from './types/ui.types';
/**
 * 配置中心UI主类
 * 统一管理所有Web UI组件和服务
 */
export declare class ConfigurationCenterUI {
    private static instance;
    private configGenerator;
    private configParser;
    private configService;
    private parserService;
    private storageService;
    private navigationState;
    private rootElement;
    private constructor();
    /**
     * 获取单例实例
     */
    static getInstance(): ConfigurationCenterUI;
    /**
     * 初始化UI系统
     */
    initialize(options: UIConfig): Promise<void>;
    /**
     * 创建主界面布局
     */
    private createMainLayout;
    /**
     * 绑定事件监听器
     */
    private bindEventListeners;
    /**
     * 切换视图
     */
    switchToView(view: 'generator' | 'parser'): Promise<void>;
    /**
     * 显示配置生成器
     */
    private showConfigGenerator;
    /**
     * 显示配置解析器
     */
    private showConfigParser;
    /**
     * 更新导航状态
     */
    private updateNavigationState;
    /**
     * 切换菜单展开状态
     */
    private toggleMenu;
    /**
     * 切换主题
     */
    private toggleTheme;
    /**
     * 处理菜单操作
     */
    private handleMenuAction;
    /**
     * 新建配置
     */
    private newConfig;
    /**
     * 加载配置
     */
    private loadConfig;
    /**
     * 保存配置
     */
    private saveConfig;
    /**
     * 更新状态栏
     */
    private updateStatusBar;
    /**
     * 加载UI样式
     */
    private loadStyles;
    /**
     * 获取当前配置
     */
    getCurrentConfiguration(): Promise<any>;
    /**
     * 获取服务实例
     */
    getServices(): {
        configService: ConfigService;
        parserService: ParserService;
        storageService: StorageService;
    };
    /**
     * 销毁UI系统
     */
    destroy(): Promise<void>;
}
export * from './components';
export * from './services/ConfigService';
export * from './services/ParserService';
export * from './services/StorageService';
export * from './types/ui.types';
export * from './utils/ui.utils';
export default ConfigurationCenterUI;

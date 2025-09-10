/**
 * 配置生成器主组件
 *
 * 提供用于生成RCC配置文件的可视化界面
 * 包括供应商管理、路由配置、密钥管理等功能
 */
import { UIComponent, ConfigGeneratorOptions } from '../../types/ui.types';
/**
 * 配置生成器主组件
 */
export declare class ConfigGeneratorMain implements UIComponent {
    private container;
    private configService;
    private storageService;
    private providerForm;
    private modelForm;
    private virtualModelForm;
    private configPreview;
    private providers;
    private virtualModels;
    private routes;
    private currentConfig;
    private activeTab;
    constructor();
    /**
     * 初始化组件
     */
    initialize(options: ConfigGeneratorOptions): Promise<void>;
    /**
     * 初始化子组件
     */
    private initializeSubComponents;
    /**
     * 渲染组件
     */
    render(): Promise<void>;
    /**
     * 渲染子组件
     */
    private renderSubComponents;
    /**
     * 渲染供应商表单
     */
    private renderProviderForm;
    /**
     * 渲染模型表单
     */
    private renderModelForm;
    /**
     * 渲染虚拟模型表单
     */
    private renderVirtualModelForm;
    /**
     * 渲染配置预览
     */
    private renderConfigPreview;
    /**
     * 绑定事件监听器
     */
    private bindEventListeners;
    /**
     * 切换选项卡
     */
    private switchTab;
    /**
     * 处理工具栏操作
     */
    private handleToolbarAction;
    /**
     * 重置配置
     */
    private resetConfiguration;
    /**
     * 加载模板
     */
    private loadTemplate;
    /**
     * 应用模板
     */
    private applyTemplate;
    /**
     * 生成配置
     */
    private generateConfiguration;
    /**
     * 加载保存的数据
     */
    private loadSavedData;
    /**
     * 保存数据
     */
    private saveData;
    /**
     * 加载配置
     */
    loadConfiguration(config: any): Promise<void>;
    /**
     * 获取当前配置
     */
    getCurrentConfiguration(): Promise<any>;
    /**
     * 新建配置
     */
    newConfiguration(): Promise<void>;
    /**
     * 加载CSS样式
     */
    private loadStyles;
    /**
     * 获取组件数据
     */
    getData(): any;
    /**
     * 设置组件数据
     */
    setData(data: any): void;
    /**
     * 验证组件数据
     */
    validate(): boolean | string[];
    /**
     * 销毁组件
     */
    destroy(): Promise<void>;
}

/**
 * 配置解析器主组件
 *
 * 提供用于解析用户配置文件并生成流水线配置的可视化界面
 * 包括文件上传、流水线视图、解析结果等功能
 */
import { UIComponent, ConfigParserOptions, ParseResult } from '../../types/ui.types';
/**
 * 配置解析器主组件
 */
export declare class ConfigParserMain implements UIComponent {
    private container;
    private parserService;
    private storageService;
    private userConfig;
    private parseResult;
    private currentStep;
    private parseHistory;
    constructor();
    /**
     * 初始化组件
     */
    initialize(options: ConfigParserOptions): Promise<void>;
    /**
     * 初始化子组件
     */
    private initializeSubComponents;
    /**
     * 渲染组件
     */
    render(): Promise<void>;
    /**
     * 获取步骤状态
     */
    private getStepStatus;
    /**
     * 渲染子组件
     */
    private renderSubComponents;
    /**
     * 渲染文件上传组件
     */
    private renderFileUpload;
    /**
     * 渲染流水线视图
     */
    private renderPipelineView;
    /**
     * 渲染统计信息
     */
    private renderParseStatistics;
    /**
     * 绑定文件上传事件
     */
    private bindFileUploadEvents;
    /**
     * 绑定事件监听器
     */
    private bindEventListeners;
    /**
     * 判断是否可以导航到指定步骤
     */
    private canNavigateToStep;
    /**
     * 导航到指定步骤
     */
    private navigateToStep;
    /**
     * 处理工具栏操作
     */
    private handleToolbarAction;
    /**
     * 清空结果
     */
    private clearResults;
    /**
     * 显示历史记录
     */
    private showHistory;
    /**
     * 导出结果
     */
    private exportResults;
    /**
     * 处理文件选择
     */
    private handleFileSelected;
    /**
     * 处理解析完成
     */
    private handleParseComplete;
    /**
     * 更新解析状态
     */
    private updateParseStatus;
    /**
     * 加载保存的数据
     */
    private loadSavedData;
    /**
     * 保存数据
     */
    private saveData;
    /**
     * 加载配置文件
     */
    loadConfigurationFile(file: File): Promise<void>;
    /**
     * 获取解析结果
     */
    getParseResults(): Promise<ParseResult | null>;
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

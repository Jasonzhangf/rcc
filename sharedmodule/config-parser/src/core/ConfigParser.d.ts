/**
 * 配置解析器
 *
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */
import { ConfigData, ServerWrapper, PipelineWrapper } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
/**
 * 预处理选项
 */
export interface PreprocessingOptions {
    /** 启用环境变量替换 */
    substituteEnvVars?: boolean;
    /** 启用模板处理 */
    processTemplates?: boolean;
    /** 启用数据验证 */
    validateData?: boolean;
    /** 目标语言环境 */
    targetLocale?: string;
    /** 自定义处理器函数 */
    customProcessors?: Function[];
    /** 启用缓存 */
    enableCaching?: boolean;
}
/**
 * 配置解析器类
 */
export declare class ConfigParser extends BaseModule {
    constructor(info?: ModuleInfo);
    /**
     * 初始化解析器
     */
    initialize(): Promise<void>;
    /**
     * 解析配置数据
     */
    parseConfig(rawData: any): Promise<ConfigData>;
    /**
     * 解析供应商配置
     */
    private parseProviders;
    /**
     * 提取API密钥
     *
     * @param rawProvider 原始供应商配置
     * @returns API密钥数组
     */
    private extractApiKeys;
    /**
     * 解析模型配置
     */
    private parseModels;
    /**
     * 解析虚拟模型配置
     */
    private parseVirtualModels;
    /**
     * 从文件解析配置
     *
     * @param configPath 配置文件路径
     * @param options 预处理选项
     * @returns 解析后的配置数据
     */
    parseConfigFromFile(configPath: string, options?: PreprocessingOptions): Promise<ConfigData>;
    /**
     * 预处理配置数据
     *
     * @param rawData 原始配置数据
     * @param options 预处理选项
     * @returns 预处理后的数据
     */
    preprocessConfig(rawData: any, options?: PreprocessingOptions): Promise<any>;
    /**
     * 翻译配置
     *
     * @param config 配置数据
     * @param locale 语言环境
     * @returns 翻译后的配置数据
     */
    translateConfig(config: ConfigData, locale?: string): Promise<ConfigData>;
    /**
     * 读取配置文件
     *
     * @param configPath 配置文件路径
     * @returns 解析后的文件内容
     */
    private readFile;
    /**
     * 环境变量替换
     *
     * @param data 配置数据
     * @returns 替换环境变量后的数据
     */
    private substituteEnvVars;
    /**
     * 模板处理
     *
     * @param data 配置数据
     * @returns 处理模板后的数据
     */
    private processTemplates;
    /**
     * 验证预处理的数据
     *
     * @param data 预处理后的数据
     * @returns 验证是否通过
     */
    private validatePreprocessedData;
    /**
     * 应用自定义处理器
     *
     * @param data 配置数据
     * @param processors 自定义处理器函数数组
     * @returns 处理后的数据
     */
    private applyCustomProcessors;
    /**
     * 销毁解析器
     */
    destroy(): Promise<void>;
    /**
     * Generate ServerModule wrapper from ConfigData
     *
     * Transforms ConfigData into ServerModule-compatible format
     * Contains only HTTP server configuration, no virtual model information
     *
     * @param config Parsed configuration data
     * @returns ServerWrapper configuration
     */
    generateServerWrapper(config: ConfigData): ServerWrapper;
    /**
     * Generate PipelineAssembler wrapper from ConfigData
     *
     * Transforms ConfigData into PipelineAssembler-compatible format
     * Contains virtual model routing tables and module configurations
     *
     * @param config Parsed configuration data
     * @returns PipelineWrapper configuration
     */
    generatePipelineWrapper(config: ConfigData): PipelineWrapper;
    /**
     * Extract server configuration from ConfigData
     */
    private extractServerConfig;
    /**
     * Transform virtual models for PipelineAssembler format
     */
    private transformVirtualModels;
    /**
     * Generate module configurations for PipelineAssembler
     */
    private generateModuleConfigs;
    /**
     * Generate routing configuration for PipelineAssembler
     */
    private generateRoutingConfig;
    /**
     * Generate both wrappers from ConfigData
     *
     * Convenience method to generate both ServerModule and PipelineAssembler wrappers
     *
     * @param config Parsed configuration data
     * @returns Object containing both wrappers
     */
    generateAllWrappers(config: ConfigData): {
        server: ServerWrapper;
        pipeline: PipelineWrapper;
    };
    /**
     * 处理系统消息
     */
    protected handleMessage(message: any): Promise<any>;
}
//# sourceMappingURL=ConfigParser.d.ts.map
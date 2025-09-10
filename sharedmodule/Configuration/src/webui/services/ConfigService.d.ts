/**
 * 配置服务
 *
 * 提供配置生成、验证、模板管理等业务功能
 */
import { UIService, ProviderConfig, VirtualModelConfig, RouteConfig } from '../types/ui.types';
import { ConfigData } from '../../interfaces/IConfigurationSystem';
/**
 * 配置服务类
 */
export declare class ConfigService implements UIService {
    private initialized;
    private templates;
    private providerDefaults;
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;
    /**
     * 配置服务
     */
    configure(options: any): void;
    /**
     * 获取服务状态
     */
    getStatus(): any;
    /**
     * 加载默认模板
     */
    private loadDefaultTemplates;
    /**
     * 加载供应商默认配置
     */
    private loadProviderDefaults;
    /**
     * 获取模板
     */
    getTemplate(templateType: string): Promise<any>;
    /**
     * 获取所有模板
     */
    getAllTemplates(): Promise<any[]>;
    /**
     * 获取供应商默认配置
     */
    getProviderDefaults(providerType: string): any;
    /**
     * 将简单值转换为ConfigValue对象
     */
    private createConfigValue;
    /**
     * 将设置对象转换为ConfigValue结构
     */
    private convertSettingsToConfigValue;
    /**
     * 获取所有支持的供应商类型
     */
    getSupportedProviders(): string[];
    /**
     * 生成配置
     */
    generateConfig(options: {
        providers: ProviderConfig[];
        virtualModels: VirtualModelConfig[];
        routes: RouteConfig[];
    }): Promise<ConfigData>;
    /**
     * 转换供应商配置
     */
    private convertProvidersToSettings;
    /**
     * 转换虚拟模型配置
     */
    private convertVirtualModelsToSettings;
    /**
     * 转换路由配置
     */
    private convertRoutesToSettings;
    /**
     * 验证配置
     */
    validateConfig(config: any): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    /**
     * 优化配置
     */
    optimizeConfig(config: any): Promise<any>;
    /**
     * 移除空属性
     */
    private removeEmptyProperties;
    /**
     * 合并重复配置
     */
    private mergeDuplicateConfigs;
    /**
     * 优化限制设置
     */
    private optimizeLimits;
    /**
     * 导出配置
     */
    exportConfig(config: any, format?: 'json' | 'yaml' | 'toml'): Promise<string>;
    /**
     * 导入配置
     */
    importConfig(data: string, format?: 'json' | 'yaml' | 'toml'): Promise<any>;
    /**
     * 获取配置统计信息
     */
    getConfigStatistics(config: any): any;
    /**
     * 生成配置文档
     */
    generateConfigDocumentation(config: any): string;
}

/**
 * 解析服务
 *
 * 提供用户配置解析、流水线生成等业务功能
 */
import { UIService, UserConfig, PipelineConfig, ParseResult } from '../types/ui.types';
/**
 * 配置解析器类
 *
 * 根据解析规则将用户配置转换为流水线配置:
 * 1. provider.model.key = 1条独立流水线
 * 2. 多个virtualmodel可指向同一流水线
 * 3. 1个virtualmodel可有多条流水线
 * 4. 1个provider多个key = 扩展为多条流水线
 */
export declare class ParserService implements UIService {
    private initialized;
    private parseRules;
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
     * 初始化解析规则
     */
    private initializeParseRules;
    /**
     * 解析用户配置
     */
    parseUserConfig(userConfig: UserConfig, options?: {
        onProgress?: (step: string, progress: number) => void;
        validateStructure?: boolean;
        generateStatistics?: boolean;
    }): Promise<ParseResult>;
    /**
     * 验证配置结构
     */
    private validateConfigStructure;
    /**
     * 解析供应商配置生成流水线
     */
    private parseProviders;
    /**
     * 处理虚拟模型映射
     */
    private processVirtualModels;
    /**
     * 生成流水线ID
     */
    private generatePipelineId;
    /**
     * 检测供应商类型
     */
    private detectProviderType;
    /**
     * 获取供应商端点
     */
    private getProviderEndpoint;
    /**
     * 生成统计信息
     */
    private generateStatistics;
    /**
     * 生成警告信息
     */
    private generateWarnings;
    /**
     * 验证流水线配置
     */
    validatePipelines(pipelines: PipelineConfig[]): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * 优化流水线配置
     */
    optimizePipelines(pipelines: PipelineConfig[]): PipelineConfig[];
    /**
     * 合并流水线
     */
    private mergePipelines;
    /**
     * 导出流水线配置
     */
    exportPipelines(pipelines: PipelineConfig[], format?: 'json' | 'yaml' | 'summary'): string;
    /**
     * 生成流水线摘要
     */
    private generatePipelineSummary;
    /**
     * 获取流水线统计信息
     */
    getPipelineStatistics(pipelines: PipelineConfig[]): any;
    /**
     * 获取供应商分布
     */
    private getProviderDistribution;
    /**
     * 获取模型分布
     */
    private getModelDistribution;
}

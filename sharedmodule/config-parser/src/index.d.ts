/**
 * RCC Config Parser - 核心配置解析模块
 *
 * 提供配置解析、加载、流水线生成等核心功能
 */
export * from './core/ConfigData';
export * from './types/index';
export * from './constants/ConfigurationConstants';
export { ConfigParser } from './core/ConfigParser';
export { ConfigLoader } from './core/ConfigLoader';
export { PipelineConfigGenerator, PipelineTable, PipelineTableEntry } from './core/PipelineConfigGenerator';
export * from './interfaces/IConfigLoaderModule';
export * from './interfaces/IConfigPersistenceModule';
import { ConfigParser } from './core/ConfigParser';
import { ConfigLoader } from './core/ConfigLoader';
import { PipelineConfigGenerator } from './core/PipelineConfigGenerator';
/**
 * 创建配置解析器实例
 */
export declare function createConfigParser(): ConfigParser;
/**
 * 创建配置加载器实例
 */
export declare function createConfigLoader(): ConfigLoader;
/**
 * 创建流水线配置生成器实例
 */
export declare function createPipelineConfigGenerator(): PipelineConfigGenerator;
/**
 * 快速解析配置文件
 */
export declare function parseConfigFile(filePath: string): Promise<any>;
/**
 * 完整的配置处理流水线
 */
export declare function processConfigFile(filePath: string): Promise<any>;
/**
 * 生成ServerModule配置包装器
 */
export declare function generateServerWrapper(config: any): Promise<any>;
/**
 * 生成PipelineAssembler配置包装器
 */
export declare function generatePipelineWrapper(config: any): Promise<any>;
/**
 * 生成所有配置包装器
 */
export declare function generateAllWrappers(config: any): Promise<{
    server: any;
    pipeline: any;
}>;
/**
 * 从配置文件生成ServerModule包装器
 */
export declare function generateServerWrapperFromFile(filePath: string): Promise<any>;
/**
 * 从配置文件生成PipelineAssembler包装器
 */
export declare function generatePipelineWrapperFromFile(filePath: string): Promise<any>;
/**
 * 从配置文件生成所有包装器
 */
export declare function generateAllWrappersFromFile(filePath: string): Promise<{
    server: any;
    pipeline: any;
}>;
//# sourceMappingURL=index.d.ts.map
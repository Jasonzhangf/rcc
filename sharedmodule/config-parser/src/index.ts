/**
 * RCC Config Parser - 核心配置解析模块
 * 
 * 提供配置解析、加载、流水线生成等核心功能
 */

// 导出核心类型
export * from './core/ConfigData';
export * from './types/index';
export * from './constants/ConfigurationConstants';

// 导出核心功能类
export { ConfigParser } from './core/ConfigParser';
export { ConfigLoader } from './core/ConfigLoader';
export { PipelineConfigGenerator, PipelineTable } from './core/PipelineConfigGenerator';

// 导出接口
export * from './interfaces/IConfigLoaderModule';
export * from './interfaces/IConfigPersistenceModule';

// 便捷函数
import { ConfigParser } from './core/ConfigParser';
import { ConfigLoader } from './core/ConfigLoader';
import { PipelineConfigGenerator } from './core/PipelineConfigGenerator';

/**
 * 创建配置解析器实例
 */
export function createConfigParser(): ConfigParser {
  return new ConfigParser({
    id: 'config-parser',
    type: 'config-parser',
    name: 'Config Parser Module',
    version: '1.0.0',
    description: 'RCC Configuration Parser Module'
  });
}

/**
 * 创建配置加载器实例
 */
export function createConfigLoader(): ConfigLoader {
  return new ConfigLoader({
    id: 'config-loader',
    type: 'config-loader',
    name: 'Config Loader Module',
    version: '1.0.0',
    description: 'RCC Configuration Loader Module'
  });
}

/**
 * 创建流水线配置生成器实例
 */
export function createPipelineConfigGenerator(): PipelineConfigGenerator {
  return new PipelineConfigGenerator({
    id: 'pipeline-config-generator',
    type: 'pipeline-config-generator',
    name: 'Pipeline Config Generator Module',
    version: '1.0.0',
    description: 'RCC Pipeline Configuration Generator Module'
  });
}

/**
 * 快速解析配置文件
 */
export async function parseConfigFile(filePath: string): Promise<any> {
  const loader = createConfigLoader();
  const parser = createConfigParser();
  
  await loader.initialize();
  await parser.initialize();
  
  try {
    const rawData = await loader.loadFromFile(filePath);
    const config = await parser.parseConfig(rawData);
    return config;
  } finally {
    await loader.destroy();
    await parser.destroy();
  }
}

/**
 * 完整的配置处理流水线
 */
export async function processConfigFile(filePath: string): Promise<any> {
  const loader = createConfigLoader();
  const parser = createConfigParser();
  
  await loader.initialize();
  await parser.initialize();
  
  try {
    // 1. 加载配置
    const rawData = await loader.loadFromFile(filePath);
    
    // 2. 解析配置
    const config = await parser.parseConfig(rawData);
    
    return config;
  } finally {
    await loader.destroy();
    await parser.destroy();
  }
}
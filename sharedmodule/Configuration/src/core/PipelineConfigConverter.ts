/**
 * 流水线配置转换器
 * 
 * 负责将简单的路由映射表转换为PipelineAssembler和PipelineScheduler期望的复杂配置格式
 */

import { PipelineAssemblyConfig, PipelineModuleConfig, ModuleConnection } from 'rcc-pipeline';
import { PipelineSystemConfig } from 'rcc-pipeline';

/**
 * 当前API服务器生成的流水线表条目格式
 */
export interface PipelineTableEntry {
  virtualModelId: string;
  targetProvider: string;
  targetModel: string;
  apiKeyIndex: number;
  enabled?: boolean;
  priority?: number;
}

/**
 * 当前API服务器生成的完整流水线表格式
 */
export interface CurrentPipelineTable {
  [key: string]: PipelineTableEntry;
}

/**
 * 流水线配置转换器类
 */
export class PipelineConfigConverter {
  /**
   * 将当前流水线表转换为PipelineAssembler期望的装配配置
   * @param pipelineTable 当前流水线表
   * @returns PipelineAssemblyConfig[] 装配配置数组
   */
  public static convertToAssemblyConfig(pipelineTable: CurrentPipelineTable): PipelineAssemblyConfig[] {
    const assemblyConfigs: PipelineAssemblyConfig[] = [];
    
    // 按虚拟模型分组
    const virtualModelGroups: Record<string, PipelineTableEntry[]> = {};
    
    for (const [entryId, entry] of Object.entries(pipelineTable)) {
      if (!virtualModelGroups[entry.virtualModelId]) {
        virtualModelGroups[entry.virtualModelId] = [];
      }
      virtualModelGroups[entry.virtualModelId].push(entry);
    }
    
    // 为每个虚拟模型创建装配配置
    for (const [virtualModelId, entries] of Object.entries(virtualModelGroups)) {
      // 为每个条目创建单独的流水线
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const pipelineId = `${virtualModelId}_${entry.targetProvider}_${entry.targetModel}_${entry.apiKeyIndex}`;
        
        // 创建模块配置
        const modules: PipelineModuleConfig[] = [
          // 兼容性模块 - 处理请求格式转换
          {
            id: `compatibility-${pipelineId}`,
            type: 'compatibility',
            config: {
              targetProvider: entry.targetProvider,
              targetModel: entry.targetModel,
              useFramework: true
            }
          },
          // 提供商模块 - 实际调用提供商API
          {
            id: `provider-${pipelineId}`,
            type: 'provider',
            config: {
              providerId: entry.targetProvider,
              modelId: entry.targetModel,
              keyIndex: entry.apiKeyIndex,
              useFramework: true
            }
          },
          // 工作流模块 - 处理工作流逻辑
          {
            id: `workflow-${pipelineId}`,
            type: 'workflow',
            config: {
              virtualModelId: entry.virtualModelId,
              useFramework: true
            }
          }
        ];
        
        // 创建模块连接
        const connections: ModuleConnection[] = [
          // 请求流：工作流 -> 兼容性 -> 提供商
          {
            source: `workflow-${pipelineId}`,
            target: `compatibility-${pipelineId}`,
            type: 'request'
          },
          {
            source: `compatibility-${pipelineId}`,
            target: `provider-${pipelineId}`,
            type: 'request'
          },
          // 响应流：提供商 -> 兼容性 -> 工作流
          {
            source: `provider-${pipelineId}`,
            target: `compatibility-${pipelineId}`,
            type: 'response'
          },
          {
            source: `compatibility-${pipelineId}`,
            target: `workflow-${pipelineId}`,
            type: 'response'
          }
        ];
        
        // 创建装配配置
        const assemblyConfig: PipelineAssemblyConfig = {
          id: pipelineId,
          name: `Pipeline for ${virtualModelId} routing to ${entry.targetProvider}/${entry.targetModel}`,
          version: '1.0.0',
          description: `Pipeline for virtual model ${virtualModelId} with provider ${entry.targetProvider}, model ${entry.targetModel}, key index ${entry.apiKeyIndex}`,
          modules,
          connections
        };
        
        assemblyConfigs.push(assemblyConfig);
      }
    }
    
    return assemblyConfigs;
  }
  
  /**
   * 将当前流水线表转换为PipelineScheduler期望的系统配置
   * @param pipelineTable 当前流水线表
   * @param baseConfig 基础调度器配置
   * @returns PipelineSystemConfig 系统配置
   */
  public static convertToSystemConfig(
    pipelineTable: CurrentPipelineTable,
    baseConfig?: Partial<PipelineSystemConfig>
  ): PipelineSystemConfig {
    // 创建流水线配置列表
    const pipelines = Object.entries(pipelineTable).map(([entryId, entry]) => ({
      id: `${entry.virtualModelId}_${entry.targetProvider}_${entry.targetModel}_${entry.apiKeyIndex}`,
      name: `Pipeline for ${entry.virtualModelId} (${entry.targetProvider}/${entry.targetModel})`,
      type: 'model-routing',
      enabled: entry.enabled !== false,
      priority: entry.priority || 1,
      weight: 1,
      maxConcurrentRequests: 100,
      timeout: 30000
    }));
    
    // 合并基础配置
    const systemConfig: PipelineSystemConfig = {
      loadBalancer: {
        strategy: baseConfig?.loadBalancer?.strategy || 'roundrobin',
        healthCheckInterval: baseConfig?.loadBalancer?.healthCheckInterval || 30000
      },
      scheduler: {
        defaultTimeout: baseConfig?.scheduler?.defaultTimeout || 30000,
        maxRetries: baseConfig?.scheduler?.maxRetries || 3
      },
      pipelines
    };
    
    return systemConfig;
  }
  
  /**
   * 验证当前流水线表格式
   * @param pipelineTable 当前流水线表
   * @returns boolean 是否有效
   */
  public static validatePipelineTable(pipelineTable: CurrentPipelineTable): boolean {
    if (!pipelineTable || typeof pipelineTable !== 'object') {
      return false;
    }
    
    for (const [entryId, entry] of Object.entries(pipelineTable)) {
      // 检查必需字段
      if (!entry.virtualModelId || !entry.targetProvider || !entry.targetModel) {
        console.warn(`Invalid pipeline entry ${entryId}: missing required fields`);
        return false;
      }
      
      // 检查apiKeyIndex
      if (typeof entry.apiKeyIndex !== 'number' || entry.apiKeyIndex < 0) {
        console.warn(`Invalid pipeline entry ${entryId}: invalid apiKeyIndex`);
        return false;
      }
      
      // 检查enabled字段（如果存在）
      if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
        console.warn(`Invalid pipeline entry ${entryId}: invalid enabled field`);
        return false;
      }
      
      // 检查priority字段（如果存在）
      if (entry.priority !== undefined && (typeof entry.priority !== 'number' || entry.priority < 1 || entry.priority > 10)) {
        console.warn(`Invalid pipeline entry ${entryId}: invalid priority field`);
        return false;
      }
    }
    
    return true;
  }
}
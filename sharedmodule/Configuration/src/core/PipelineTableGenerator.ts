/**
 * 流水线表生成器
 * 
 * 负责根据配置数据生成流水线表
 */

import { ConfigData } from './ConfigData';
import { PipelineTable, PipelineEntry } from './PipelineTable';

/**
 * 流水线表生成器类
 */
export class PipelineTableGenerator {
  private fixedVirtualModels: string[];
  private initialized = false;

  constructor(fixedVirtualModels?: string[]) {
    this.fixedVirtualModels = fixedVirtualModels || [
      'default', 
      'longcontext', 
      'thinking', 
      'background', 
      'websearch', 
      'vision', 
      'coding'
    ];
  }

  /**
   * 初始化生成器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('PipelineTableGenerator initialized successfully');
  }

  /**
   * 生成流水线表
   */
  public async generatePipelineTable(config: ConfigData): Promise<PipelineTable> {
    try {
      const pipelineTable: PipelineTable = new Map();

      // 为每个虚拟模型生成流水线条目
      for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
        // 检查是否是固定的虚拟模型
        if (!this.fixedVirtualModels.includes(vmId)) {
          console.warn(`Skipping non-fixed virtual model: ${vmId}`);
          continue;
        }

        // 为每个目标生成流水线条目
        virtualModel.targets.forEach((target, index) => {
          // 验证目标供应商和模型存在
          const provider = config.providers[target.providerId];
          if (!provider) {
            console.warn(`Target provider not found for virtual model ${vmId}: ${target.providerId}`);
            return;
          }

          const model = provider.models[target.modelId];
          if (!model) {
            console.warn(`Target model not found for virtual model ${vmId}: ${target.modelId}`);
            return;
          }

          // 创建流水线条目ID（支持多目标）
          const entryId = `${vmId}_${index}`;

          // 创建流水线条目
          const entry: PipelineEntry = {
            virtualModelId: vmId,
            targetProvider: target.providerId,
            targetModel: target.modelId,
            keyIndex: target.keyIndex || 0,
            enabled: virtualModel.enabled,
            priority: virtualModel.priority || 1
          };

          pipelineTable.set(entryId, entry);
        });
      }

      console.log(`Pipeline table generated with ${pipelineTable.size} entries`);
      return pipelineTable;
    } catch (error) {
      console.error('Failed to generate pipeline table:', error);
      throw error;
    }
  }

  /**
   * 获取固定虚拟模型列表
   */
  public getFixedVirtualModels(): string[] {
    return [...this.fixedVirtualModels];
  }

  /**
   * 验证流水线表
   */
  public async validatePipelineTable(pipelineTable: PipelineTable): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证每个条目
    for (const [entryId, entry] of pipelineTable.entries()) {
      if (!entry.targetProvider) {
        errors.push(`Entry ${entryId} missing target provider`);
      }

      if (!entry.targetModel) {
        errors.push(`Entry ${entryId} missing target model`);
      }

      if (entry.keyIndex < 0) {
        errors.push(`Entry ${entryId} has invalid key index: ${entry.keyIndex}`);
      }

      if (entry.priority < 1 || entry.priority > 10) {
        errors.push(`Entry ${entryId} has invalid priority: ${entry.priority}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 销毁生成器
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    console.log('PipelineTableGenerator destroyed successfully');
  }
}
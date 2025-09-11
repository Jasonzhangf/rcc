/**
 * 虚拟模型规则模块
 * 
 * 用于验证虚拟模型配置的简单规则模块
 */

import { ConfigData } from './ConfigData';

/**
 * 虚拟模型规则验证结果
 */
export interface VirtualModelValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 虚拟模型规则模块
 */
export class VirtualModelRulesModule {
  private initialized = false;
  private fixedVirtualModels: string[];

  constructor() {
    this.fixedVirtualModels = [
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
   * 初始化规则模块
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('VirtualModelRulesModule initialized successfully');
  }

  /**
   * 验证虚拟模型配置
   */
  public async validateVirtualModels(config: ConfigData): Promise<VirtualModelValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需的虚拟模型
    for (const requiredVm of this.fixedVirtualModels) {
      if (!config.virtualModels[requiredVm]) {
        errors.push(`Missing required virtual model: ${requiredVm}`);
      }
    }

    // 验证每个虚拟模型
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
      // 验证每个目标
      virtualModel.targets.forEach((target, index) => {
        // 检查目标供应商是否存在
        if (target.providerId && !config.providers[target.providerId]) {
          errors.push(`Virtual model ${vmId} target ${index} references unknown provider: ${target.providerId}`);
        }

        // 检查目标模型是否存在
        if (target.providerId && target.modelId) {
          const provider = config.providers[target.providerId];
          if (provider && !provider.models[target.modelId]) {
            warnings.push(`Virtual model ${vmId} target ${index} references unknown model: ${target.modelId}`);
          }
        }
      });

      // 检查优先级范围
      if (virtualModel.priority !== undefined && (virtualModel.priority < 1 || virtualModel.priority > 10)) {
        warnings.push(`Virtual model ${vmId} has priority out of range (1-10): ${virtualModel.priority}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取固定虚拟模型列表
   */
  public getFixedVirtualModels(): string[] {
    return [...this.fixedVirtualModels];
  }

  /**
   * 销毁规则模块
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    console.log('VirtualModelRulesModule destroyed successfully');
  }
}
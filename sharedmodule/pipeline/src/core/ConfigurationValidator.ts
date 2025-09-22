/**
 * RCC Pipeline Configuration Validator
 *
 * 配置验证器，用于验证PipelineWrapper和模块配置
 */

import { IConfigurationValidator, PipelineWrapper, ModuleConfig, FieldMapping } from '../interfaces/ModularInterfaces';

export class ConfigurationValidator implements IConfigurationValidator {
  private requiredModuleTypes = ['llmswitch', 'workflow', 'compatibility', 'provider'];

  /**
   * 验证PipelineWrapper配置
   */
  async validateWrapper(wrapper: PipelineWrapper): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证动态路由配置
      if (!wrapper.dynamicRouting || wrapper.dynamicRouting.length === 0) {
        errors.push('dynamicRouting不能为空');
      } else {
        wrapper.dynamicRouting.forEach((dr, index) => {
          if (!dr.id) {
            errors.push(`dynamicRouting[${index}].id不能为空`);
          }
          if (!dr.targets || dr.targets.length === 0) {
            errors.push(`dynamicRouting[${index}].targets不能为空`);
          }
        });
      }

      // 验证模块配置
      if (!wrapper.modules || wrapper.modules.length === 0) {
        errors.push('modules不能为空');
      } else {
        const moduleTypes = new Set<string>();

        wrapper.modules.forEach((module, index) => {
          if (!module.id) {
            errors.push(`modules[${index}].id不能为空`);
          }
          if (!module.type) {
            errors.push(`modules[${index}].type不能为空`);
          } else {
            moduleTypes.add(module.type);
          }
        });

        // 检查是否包含必需的模块类型
        this.requiredModuleTypes.forEach(requiredType => {
          if (!moduleTypes.has(requiredType)) {
            errors.push(`缺少必需的模块类型: ${requiredType}`);
          }
        });
      }

      // 验证路由配置
      if (!wrapper.routing) {
        errors.push('routing不能为空');
      } else {
        if (!wrapper.routing.strategy) {
          errors.push('routing.strategy不能为空');
        }
        if (!wrapper.routing.fallbackStrategy) {
          errors.push('routing.fallbackStrategy不能为空');
        }
      }

      // 验证元数据
      if (!wrapper.metadata) {
        warnings.push('metadata为空，建议提供版本信息');
      } else {
        if (!wrapper.metadata.version) {
          warnings.push('metadata.version为空，建议提供版本信息');
        }
        if (!wrapper.metadata.createdAt) {
          warnings.push('metadata.createdAt为空，建议提供创建时间');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`配置验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`],
        warnings
      };
    }
  }

  /**
   * 验证模块配置
   */
  async validateModuleConfig(moduleType: string, config: ModuleConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 基础验证
      if (!config.id) {
        errors.push('module.id不能为空');
      }
      if (!config.type) {
        errors.push('module.type不能为空');
      } else if (config.type !== moduleType) {
        errors.push(`module.type与期望类型不匹配: 期望${moduleType}，实际${config.type}`);
      }

      // 根据模块类型进行特定验证
      switch (moduleType) {
        case 'llmswitch':
          this.validateLLMSwitchConfig(config, errors, warnings);
          break;
        case 'workflow':
          this.validateWorkflowConfig(config, errors, warnings);
          break;
        case 'compatibility':
          this.validateCompatibilityConfig(config, errors, warnings);
          break;
        case 'provider':
          this.validateProviderConfig(config, errors, warnings);
          break;
        default:
          warnings.push(`未知的模块类型: ${moduleType}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`模块配置验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`],
        warnings
      };
    }
  }

  /**
   * 验证LLMSwitch配置
   */
  private validateLLMSwitchConfig(config: ModuleConfig, errors: string[], warnings: string[]): void {
    if (!config.config?.supportedProtocols) {
      warnings.push('LLMSwitch模块缺少supportedProtocols配置');
    }

    if (!config.config?.conversionRules) {
      warnings.push('LLMSwitch模块缺少conversionRules配置');
    }

    if (config.config?.maxRetries && typeof config.config.maxRetries !== 'number') {
      errors.push('LLMSwitch模块的maxRetries必须是数字');
    }
  }

  /**
   * 验证Workflow配置
   */
  private validateWorkflowConfig(config: ModuleConfig, errors: string[], warnings: string[]): void {
    if (!config.config?.streaming) {
      warnings.push('Workflow模块缺少streaming配置');
    }

    if (config.config?.streaming?.chunkSize && typeof config.config.streaming.chunkSize !== 'number') {
      errors.push('Workflow模块的streaming.chunkSize必须是数字');
    }

    if (config.config?.streaming?.timeout && typeof config.config.streaming.timeout !== 'number') {
      errors.push('Workflow模块的streaming.timeout必须是数字');
    }
  }

  /**
   * 验证Compatibility配置
   */
  private validateCompatibilityConfig(config: ModuleConfig, errors: string[], warnings: string[]): void {
    if (!config.config?.fieldMappings) {
      warnings.push('Compatibility模块缺少fieldMappings配置');
    }

    if (!config.config?.providerConfigs) {
      warnings.push('Compatibility模块缺少providerConfigs配置');
    }

    // 验证字段映射配置
    if (config.config?.fieldMappings) {
      if (!Array.isArray(config.config.fieldMappings)) {
        errors.push('Compatibility模块的fieldMappings必须是数组');
      } else {
        config.config.fieldMappings.forEach((mapping: FieldMapping, index: number) => {
          if (!mapping.sourceField) {
            errors.push(`fieldMappings[${index}].sourceField不能为空`);
          }
          if (!mapping.targetField) {
            errors.push(`fieldMappings[${index}].targetField不能为空`);
          }
        });
      }
    }
  }

  /**
   * 验证Provider配置
   */
  private validateProviderConfig(config: ModuleConfig, errors: string[], warnings: string[]): void {
    if (!config.config?.endpoint) {
      errors.push('Provider模块缺少endpoint配置');
    }

    if (!config.config?.models) {
      errors.push('Provider模块缺少models配置');
    } else if (!Array.isArray(config.config.models)) {
      errors.push('Provider模块的models必须是数组');
    }

    if (!config.config?.authentication) {
      errors.push('Provider模块缺少authentication配置');
    } else {
      const auth = config.config.authentication;
      if (!auth.type) {
        errors.push('Provider模块的authentication.type不能为空');
      }
      if (auth.type === 'api-key' && !auth.apiKey) {
        errors.push('Provider模块的authentication.apiKey不能为空');
      }
    }

    if (!config.config?.capabilities) {
      warnings.push('Provider模块缺少capabilities配置');
    } else {
      const caps = config.config.capabilities;
      if (caps.streaming === undefined) {
        warnings.push('Provider模块的capabilities.streaming未设置');
      }
      if (caps.maxTokens === undefined) {
        warnings.push('Provider模块的capabilities.maxTokens未设置');
      }
    }
  }
}
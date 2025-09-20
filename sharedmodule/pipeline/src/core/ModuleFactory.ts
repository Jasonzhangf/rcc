/**
 * RCC Pipeline Module Factory
 *
 * 模块工厂，负责创建各种类型的流水线模块实例
 */

import { IModuleFactory, ILLMSwitch, IWorkflowModule, ICompatibilityModule, IProviderModule, ModuleConfig } from '../interfaces/ModularInterfaces';
import { LLMSwitchModule } from '../modules/LLMSwitchModule';
import { WorkflowModule } from '../modules/WorkflowModule';
import { CompatibilityModule } from '../modules/CompatibilityModule';
import { ProviderModule } from '../modules/ProviderModule';

export class ModuleFactory implements IModuleFactory {
  private moduleRegistry: Map<string, new (config: ModuleConfig) => any> = new Map();

  constructor() {
    this.registerDefaultModules();
  }

  /**
   * 注册默认模块
   */
  private registerDefaultModules(): void {
    // 注册所有已实现的模块
    this.registerModuleType('llmswitch', LLMSwitchModule);
    this.registerModuleType('workflow', WorkflowModule);
    this.registerModuleType('compatibility', CompatibilityModule);
    this.registerModuleType('provider', ProviderModule);
  }

  /**
   * 注册模块类型
   */
  registerModuleType(type: string, moduleClass: new (config: ModuleConfig) => any): void {
    this.moduleRegistry.set(type, moduleClass);
  }

  /**
   * 创建LLMSwitch模块实例
   */
  async createLLMSwitch(config: ModuleConfig): Promise<ILLMSwitch> {
    const moduleClass = this.moduleRegistry.get('llmswitch');
    if (!moduleClass) {
      throw new Error('未找到LLMSwitch模块实现');
    }

    try {
      const module = new moduleClass(config);
      await module.initialize(config);
      return module as ILLMSwitch;
    } catch (error) {
      throw new Error(`创建LLMSwitch模块失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建Workflow模块实例
   */
  async createWorkflowModule(config: ModuleConfig): Promise<IWorkflowModule> {
    const moduleClass = this.moduleRegistry.get('workflow');
    if (!moduleClass) {
      throw new Error('未找到Workflow模块实现');
    }

    try {
      const module = new moduleClass(config);
      await module.initialize(config);
      return module as IWorkflowModule;
    } catch (error) {
      throw new Error(`创建Workflow模块失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建Compatibility模块实例
   */
  async createCompatibilityModule(config: ModuleConfig): Promise<ICompatibilityModule> {
    const moduleClass = this.moduleRegistry.get('compatibility');
    if (!moduleClass) {
      throw new Error('未找到Compatibility模块实现');
    }

    try {
      const module = new moduleClass(config);
      await module.initialize(config);
      return module as ICompatibilityModule;
    } catch (error) {
      throw new Error(`创建Compatibility模块失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建Provider模块实例
   */
  async createProviderModule(config: ModuleConfig): Promise<IProviderModule> {
    const moduleClass = this.moduleRegistry.get('provider');
    if (!moduleClass) {
      throw new Error('未找到Provider模块实现');
    }

    try {
      const module = new moduleClass(config);
      await module.initialize(config);
      return module as IProviderModule;
    } catch (error) {
      throw new Error(`创建Provider模块失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取已注册的模块类型
   */
  getRegisteredModuleTypes(): string[] {
    return Array.from(this.moduleRegistry.keys());
  }

  /**
   * 检查模块类型是否已注册
   */
  isModuleTypeRegistered(type: string): boolean {
    return this.moduleRegistry.has(type);
  }
}
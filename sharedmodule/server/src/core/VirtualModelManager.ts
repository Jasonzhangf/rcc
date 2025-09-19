import { VirtualModelConfig } from '../types/ServerTypes';

export class VirtualModelManager {
  private virtualModels: Map<string, VirtualModelConfig> = new Map();
  private pipelineScheduler: any = null;

  public setPipelineScheduler(scheduler: any): void {
    this.pipelineScheduler = scheduler;
  }

  public async registerVirtualModel(model: VirtualModelConfig): Promise<void> {
    if (this.virtualModels.has(model.id)) {
      throw new Error(`Virtual model ${model.id} is already registered`);
    }

    // Validate virtual model configuration
    this.validateVirtualModelConfig(model);

    // T3: 流水线优先架构 - 不再主动创建调度器
    // 虚拟模型应该在PipelineAssembler阶段就已经注册到调度器
    // 这里只做本地注册和验证
    if (this.pipelineScheduler) {
      try {
        // Verify that the virtual model exists in scheduler mappings
        const virtualModelMappings = this.pipelineScheduler.getVirtualModelMappings ?
          this.pipelineScheduler.getVirtualModelMappings() : [];

        const existingMapping = virtualModelMappings.find(m => m.virtualModelId === model.id);

        if (existingMapping) {
          console.log(`Virtual model ${model.id} verified in scheduler mappings (scheduler: ${existingMapping.schedulerId})`);
        } else {
          console.warn(`Virtual model ${model.id} not found in scheduler mappings - scheduler will handle this separately`);
        }
      } catch (error) {
        console.warn(`Failed to verify virtual model ${model.id} in scheduler mappings`, { error });
      }
    }

    this.virtualModels.set(model.id, model);
  }

  public async unregisterVirtualModel(modelId: string): Promise<void> {
    if (!this.virtualModels.has(modelId)) {
      throw new Error(`Virtual model ${modelId} is not registered`);
    }

    // Unregister from pipeline scheduler if available
    if (this.pipelineScheduler) {
      try {
        await this.pipelineScheduler.unregisterVirtualModel(modelId);
      } catch (error) {
        console.warn(`Failed to unregister virtual model ${modelId} from scheduler`, { error });
      }
    }

    this.virtualModels.delete(modelId);
  }

  public getVirtualModel(modelId: string): VirtualModelConfig | undefined {
    return this.virtualModels.get(modelId);
  }

  public getVirtualModels(): VirtualModelConfig[] {
    return Array.from(this.virtualModels.values());
  }

  public async loadVirtualModelsFromConfig(virtualModels: any): Promise<void> {
    if (!virtualModels || typeof virtualModels !== 'object') {
      console.warn('Invalid virtual models configuration');
      return;
    }

    const vmArray = Array.isArray(virtualModels) ? virtualModels : Object.values(virtualModels);

    for (const vmConfig of vmArray) {
      try {
        const typedVmConfig = vmConfig as any;

        if (typedVmConfig.enabled !== false) {
          const virtualModel: VirtualModelConfig = {
            id: typedVmConfig.id || String(typedVmConfig.name),
            name: typedVmConfig.name,
            provider: typedVmConfig.provider,
            model: typedVmConfig.model,
            capabilities: typedVmConfig.capabilities || [],
            targets: typedVmConfig.targets || [],
            enabled: typedVmConfig.enabled !== false,
            endpoint: typedVmConfig.endpoint,
            apiKey: typedVmConfig.apiKey,
            maxTokens: typedVmConfig.maxTokens,
            temperature: typedVmConfig.temperature,
            topP: typedVmConfig.topP,
            routingRules: typedVmConfig.routingRules,
            priority: typedVmConfig.priority
          };

          await this.registerVirtualModel(virtualModel);
        }
      } catch (error) {
        console.error(`Failed to load virtual model from config:`, error);
      }
    }
  }

  private validateVirtualModelConfig(model: VirtualModelConfig): void {
    if (!model.id) {
      throw new Error('Virtual model ID is required');
    }
    if (!model.name) {
      throw new Error('Virtual model name is required');
    }
    if (!model.targets || model.targets.length === 0) {
      throw new Error('Virtual model must have at least one target');
    }

    // Validate targets
    if (model.targets) {
      for (const target of model.targets) {
        if (!target.providerId) {
          throw new Error(`Target must have a providerId`);
        }
        if (!target.modelId) {
          throw new Error(`Target must have a modelId`);
        }
      }
    }
  }

  public async processVirtualModelRequest(request: any, model: VirtualModelConfig): Promise<any> {
    if (!this.pipelineScheduler) {
      throw new Error('Pipeline scheduler not available');
    }

    try {
      // Try to process via pipeline scheduler
      return await this._processViaPipelineScheduler(request, model);
    } catch (error) {
      console.error(`Failed to process virtual model request via pipeline scheduler:`, error);
      throw error;
    }
  }

  private async _processViaPipelineScheduler(request: any, model: VirtualModelConfig): Promise<any> {
    try {
      const pipelineRequest = {
        id: request.id,
        virtualModelId: model.id,
        messages: request.messages,
        metadata: {
          ...request.metadata,
          virtualModelName: model.name,
          capabilities: model.capabilities
        }
      };

      const result = await this.pipelineScheduler.processRequest(pipelineRequest);

      return {
        id: request.id,
        model: model.id,
        content: result.content,
        finishReason: result.finishReason,
        usage: result.usage,
        metadata: {
          ...result.metadata,
          pipeline: result.pipelineId,
          scheduler: result.schedulerId,
          processingTime: result.processingTime
        }
      };
    } catch (error) {
      console.error('Pipeline scheduler processing failed:', error);
      throw error;
    }
  }
}
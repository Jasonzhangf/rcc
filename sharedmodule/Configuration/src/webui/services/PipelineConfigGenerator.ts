/**
 * 流水线配置生成器
 * 
 * 基于解析结果生成完整的流水线配置，包括供应商、虚拟模型和路由配置
 */

import { PipelineConfig, ProviderConfig, VirtualModelConfig, RouteConfig } from './ui.types';

/**
 * 流水线配置生成器类
 */
export class PipelineConfigGenerator {
  
  /**
   * 生成完整的流水线配置
   */
  public generatePipelineConfigs(parseResult: any): {
    providers: ProviderConfig[];
    virtualModels: VirtualModelConfig[];
    routes: RouteConfig[];
    pipelines: PipelineConfig[];
    assemblyTable: any;
    schedulerConfig: any;
  } {
    const providers: ProviderConfig[] = [];
    const virtualModels: VirtualModelConfig[] = [];
    const routes: RouteConfig[] = [];
    const pipelines: PipelineConfig[] = [];
    
    // 从解析结果生成供应商配置
    if (parseResult.pipelines && Array.isArray(parseResult.pipelines)) {
      for (const pipeline of parseResult.pipelines) {
        // 添加供应商配置
        if (pipeline.provider) {
          const existingProvider = providers.find(p => p.id === pipeline.provider.id);
          if (!existingProvider) {
            providers.push(pipeline.provider);
          }
        }
        
        // 添加流水线配置
        pipelines.push(pipeline);
        
        // 为每个虚拟模型创建映射
        if (pipeline.virtualModels && Array.isArray(pipeline.virtualModels)) {
          for (const vmName of pipeline.virtualModels) {
            const existingVM = virtualModels.find(vm => vm.name === vmName);
            if (!existingVM) {
              virtualModels.push({
                name: vmName,
                targetProvider: pipeline.llmswitch.provider,
                targetModel: pipeline.llmswitch.model,
                enabled: true
              });
            }
          }
        }
        
        // 为每个流水线创建路由配置
        routes.push({
          id: `route-${pipeline.id}`,
          path: `/v1/${pipeline.llmswitch.provider}/${pipeline.llmswitch.model}`,
          provider: pipeline.llmswitch.provider,
          model: pipeline.llmswitch.model,
          weight: 100,
          enabled: true
        });
      }
    }
    
    // 生成模块装配表
    const assemblyTable = this.generateAssemblyTable(pipelines);
    
    // 生成调度器配置
    const schedulerConfig = this.generateSchedulerConfig();
    
    return {
      providers,
      virtualModels,
      routes,
      pipelines,
      assemblyTable,
      schedulerConfig
    };
  }
  
  /**
   * 生成供应商配置
   */
  public generateProviderConfigs(pipelines: PipelineConfig[]): ProviderConfig[] {
    const providers: ProviderConfig[] = [];
    
    for (const pipeline of pipelines) {
      const existingProvider = providers.find(p => p.id === pipeline.provider.id);
      if (!existingProvider) {
        providers.push(pipeline.provider);
      }
    }
    
    return providers;
  }
  
  /**
   * 生成虚拟模型配置
   */
  public generateVirtualModelConfigs(pipelines: PipelineConfig[]): VirtualModelConfig[] {
    const virtualModels: VirtualModelConfig[] = [];
    
    for (const pipeline of pipelines) {
      if (pipeline.virtualModels && Array.isArray(pipeline.virtualModels)) {
        for (const vmName of pipeline.virtualModels) {
          const existingVM = virtualModels.find(vm => vm.name === vmName);
          if (!existingVM) {
            virtualModels.push({
              name: vmName,
              targetProvider: pipeline.llmswitch.provider,
              targetModel: pipeline.llmswitch.model,
              enabled: true
            });
          }
        }
      }
    }
    
    return virtualModels;
  }
  
  /**
   * 生成路由配置
   */
  public generateRouteConfigs(pipelines: PipelineConfig[]): RouteConfig[] {
    const routes: RouteConfig[] = [];
    
    for (const pipeline of pipelines) {
      routes.push({
        id: `route-${pipeline.id}`,
        path: `/v1/${pipeline.llmswitch.provider}/${pipeline.llmswitch.model}`,
        provider: pipeline.llmswitch.provider,
        model: pipeline.llmswitch.model,
        weight: 100,
        enabled: true
      });
    }
    
    return routes;
  }
  
  /**
   * 导出配置为JSON格式
   */
  public exportConfig(config: any): string {
    return JSON.stringify(config, null, 2);
  }
  
  /**
   * 生成模块装配表
   */
  private generateAssemblyTable(pipelines: PipelineConfig[]): any {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      pipelines: pipelines.map(pipeline => ({
        pipelineId: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        modules: pipeline.modules?.map(module => ({
          id: module.id,
          name: module.name,
          type: module.type,
          config: {}
        })) || []
      }))
    };
  }
  
  /**
   * 生成调度器配置
   */
  private generateSchedulerConfig(): any {
    return {
      strategy: 'weighted',
      maxConcurrent: 100,
      timeout: 30000,
      retry: {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential'
      },
      loadBalancing: {
        strategy: 'round_robin',
        healthCheck: {
          interval: 30000,
          timeout: 5000
        }
      }
    };
  }
  
  /**
   * 导出流水线配置为不同格式
   */
  public exportPipelineConfig(config: any, format: 'json' | 'yaml' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        // YAML export would require a yaml library
        return JSON.stringify(config, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * 生成完整的配置文档
   */
  public generateConfigDocumentation(config: {
    providers: ProviderConfig[];
    virtualModels: VirtualModelConfig[];
    routes: RouteConfig[];
    pipelines: PipelineConfig[];
    assemblyTable: any;
    schedulerConfig: any;
  }): string {
    let doc = '# RCC Pipeline Configuration Document\n\n';
    
    // 基本信息
    doc += '## 配置概览\n\n';
    doc += `- 供应商数量: ${config.providers.length}\n`;
    doc += `- 虚拟模型数量: ${config.virtualModels.length}\n`;
    doc += `- 路由数量: ${config.routes.length}\n`;
    doc += `- 流水线数量: ${config.pipelines.length}\n\n`;
    
    // 供应商配置说明
    doc += '## 供应商配置\n\n';
    doc += '已配置的AI服务供应商列表：\n\n';
    for (const provider of config.providers) {
      doc += `- **${provider.name}** (${provider.type})\n`;
      doc += `  - 端点: ${provider.endpoint || 'N/A'}\n`;
      doc += `  - 模型数量: ${provider.models?.length || 0}\n`;
      doc += `  - API密钥数量: ${provider.auth?.keys?.length || 0}\n\n`;
    }
    
    // 虚拟模型配置说明
    doc += '## 虚拟模型配置\n\n';
    doc += '虚拟模型映射关系：\n\n';
    for (const vm of config.virtualModels) {
      doc += `- **${vm.name}** → ${vm.targetProvider}/${vm.targetModel}\n`;
    }
    doc += '\n';
    
    // 路由配置说明
    doc += '## 路由配置\n\n';
    doc += 'API路由映射：\n\n';
    for (const route of config.routes) {
      doc += `- ${route.path} → ${route.provider}/${route.model} (权重: ${route.weight})\n`;
    }
    doc += '\n';
    
    // 流水线配置说明
    doc += '## 流水线配置\n\n';
    doc += '已生成的流水线列表：\n\n';
    for (const pipeline of config.pipelines) {
      doc += `- **${pipeline.name || pipeline.id}**\n`;
      doc += `  - ID: ${pipeline.id}\n`;
      doc += `  - 路径: ${pipeline.routing?.path || 'N/A'}\n`;
      doc += `  - 模块数量: ${pipeline.modules?.length || 0}\n\n`;
    }
    
    // 调度器配置说明
    doc += '## 调度器配置\n\n';
    doc += `- 策略: ${config.schedulerConfig.strategy}\n`;
    doc += `- 最大并发数: ${config.schedulerConfig.maxConcurrent}\n`;
    doc += `- 超时时间: ${config.schedulerConfig.timeout}ms\n\n`;
    
    return doc;
  }
}
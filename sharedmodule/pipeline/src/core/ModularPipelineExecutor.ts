/**
 * RCC Modular Pipeline Executor
 *
 * 模块化流水线执行器，实现 llmswitch → workflow → compatibility → provider 的执行流程
 */

import {
  IModularPipelineExecutor,
  ILLMSwitch,
  IWorkflowModule,
  ICompatibilityModule,
  IProviderModule,
  PipelineWrapper,
  PipelineExecutionContext,
  PipelineExecutionResult,
  PipelineExecutionStep,
  ProtocolType,
  ModuleConfig,
  RoutingOptimizationConfig,
  DebugConfig,
  PipelineStage
} from '../interfaces/ModularInterfaces';
import { ModuleFactory } from './ModuleFactory';
import { ConfigurationValidator } from './ConfigurationValidator';
import { RoutingOptimizer } from './RoutingOptimizer';
import { IOTracker } from './IOTracker';
import { PipelineExecutionOptimizer } from './PipelineExecutionOptimizer';
import { v4 as uuidv4 } from 'uuid';

export class ModularPipelineExecutor implements IModularPipelineExecutor {
  private isInitialized = false;
  private wrapper!: PipelineWrapper;
  private moduleFactory!: ModuleFactory;
  private configValidator!: ConfigurationValidator;
  private routingOptimizer!: RoutingOptimizer;
  private ioTracker!: IOTracker;
  private executionOptimizer!: PipelineExecutionOptimizer;

  private llmswitch!: ILLMSwitch;
  private workflow!: IWorkflowModule;
  private compatibility!: ICompatibilityModule;
  private provider!: IProviderModule;

  private routingConfig: RoutingOptimizationConfig;
  private debugConfig: DebugConfig;

  constructor(
    moduleFactory: ModuleFactory,
    configValidator: ConfigurationValidator,
    routingConfig?: Partial<RoutingOptimizationConfig>,
    debugConfig?: Partial<DebugConfig>
  ) {
    this.moduleFactory = moduleFactory;
    this.configValidator = configValidator;

    // 初始化配置
    this.routingConfig = {
      enableLoadBalancing: true,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      requestTimeout: 30000,
      retryAttempts: 3,
      enableMetrics: true,
      metricsCollectionInterval: 60000,
      ...routingConfig
    };

    this.debugConfig = {
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      enableSampling: false,
      sampleRate: 0.1,
      ...debugConfig
    };

    // 初始化优化组件
    this.routingOptimizer = new RoutingOptimizer(this.routingConfig);
    this.ioTracker = new IOTracker(this.debugConfig);
  }

  /**
   * 初始化执行器
   */
  async initialize(wrapper: PipelineWrapper): Promise<void> {
    try {
      // 验证配置
      const validationResult = await this.configValidator.validateWrapper(wrapper);
      if (!validationResult.isValid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      this.wrapper = wrapper;

      // 查找并初始化模块
      const modules = this.wrapper.modules;

      const llmswitchConfig = modules.find(m => m.type === 'llmswitch');
      const workflowConfig = modules.find(m => m.type === 'workflow');
      const compatibilityConfig = modules.find(m => m.type === 'compatibility');
      const providerConfig = modules.find(m => m.type === 'provider');

      if (!llmswitchConfig) throw new Error('未找到LLMSwitch模块配置');
      if (!workflowConfig) throw new Error('未找到Workflow模块配置');
      if (!compatibilityConfig) throw new Error('未找到Compatibility模块配置');
      if (!providerConfig) throw new Error('未找到Provider模块配置');

      // 创建模块实例
      this.llmswitch = await this.moduleFactory.createLLMSwitch(llmswitchConfig);
      this.workflow = await this.moduleFactory.createWorkflowModule(workflowConfig);
      this.compatibility = await this.moduleFactory.createCompatibilityModule(compatibilityConfig);
      this.provider = await this.moduleFactory.createProviderModule(providerConfig);

      // 初始化执行优化器
      this.executionOptimizer = new PipelineExecutionOptimizer(
        this.routingOptimizer,
        this.ioTracker
      );

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`初始化流水线执行器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行请求
   */
  async execute(request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>): Promise<PipelineExecutionResult> {
    return this.executionOptimizer.executeOptimized(
      request,
      virtualModelId,
      this.executeInternal.bind(this),
      context
    );
  }

  /**
   * 内部执行方法
   */
  private async executeInternal(request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>): Promise<PipelineExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('执行器未初始化');
    }

    const startTime = Date.now();
    const steps: PipelineExecutionStep[] = [];
    const sessionId = context?.sessionId || uuidv4();
    const requestId = context?.requestId || uuidv4();
    const ioRecords = context?.ioRecords || [];

    try {
      // 查找虚拟模型配置
      const virtualModel = this.wrapper.virtualModels.find(vm => vm.id === virtualModelId);
      if (!virtualModel) {
        throw new Error(`未找到虚拟模型: ${virtualModelId}`);
      }

      // 获取路由决策
      let providerId = context?.providerId;
      if (!providerId && context?.routingDecision) {
        providerId = context.routingDecision.providerId;
      } else if (!providerId) {
        // 使用简化的路由决策
        const target = virtualModel.targets[0];
        providerId = target.providerId;
      }

      // 创建执行上下文
      const executionContext: PipelineExecutionContext = {
        sessionId,
        requestId,
        executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        virtualModelId,
        providerId: providerId || 'unknown',
        startTime,
        stage: 'request_init' as PipelineStage,
        timing: {
          startTime,
          endTime: undefined,
          duration: undefined,
          stageTimings: new Map(),
          status: 'pending'
        },
        ioRecords,
        metadata: context?.metadata || {},
        parentContext: context?.parentContext,
        parent: context?.parentContext,
        routingDecision: context?.routingDecision,
        performanceMetrics: context?.performanceMetrics,
        debugConfig: this.debugConfig
      };

      // 记录请求开始
      this.ioTracker.trackRequest(sessionId, requestId, 'pipeline', request);

      // 步骤1: LLM Switch - 协议转换
      const llmswitchStep = await this.executeLLMSwitch(request, executionContext);
      steps.push(llmswitchStep);
      if (!llmswitchStep.output) throw new Error('LLMSwitch转换失败');

      // 步骤2: Workflow - 流式转换
      const workflowStep = await this.executeWorkflow(llmswitchStep.output, executionContext);
      steps.push(workflowStep);
      if (!workflowStep.output) throw new Error('Workflow转换失败');

      // 步骤3: Compatibility - 字段映射
      const compatibilityStep = await this.executeCompatibility(workflowStep.output, providerId!, executionContext);
      steps.push(compatibilityStep);
      if (!compatibilityStep.output) throw new Error('Compatibility转换失败');

      // 步骤4: Provider - 实际执行
      const providerStep = await this.executeProvider(compatibilityStep.output, executionContext);
      steps.push(providerStep);
      if (!providerStep.output) throw new Error('Provider执行失败');

      // 步骤5: Compatibility - 响应字段映射
      const responseCompatibilityStep = await this.executeCompatibilityResponse(providerStep.output, providerId!, executionContext);
      steps.push(responseCompatibilityStep);
      if (!responseCompatibilityStep.output) throw new Error('Compatibility响应转换失败');

      // 步骤6: Workflow - 响应流式转换
      const responseWorkflowStep = await this.executeWorkflowResponse(responseCompatibilityStep.output, executionContext);
      steps.push(responseWorkflowStep);
      if (!responseWorkflowStep.output) throw new Error('Workflow响应转换失败');

      // 步骤7: LLM Switch - 响应协议转换
      const responseLLMSwitchStep = await this.executeLLMSwitchResponse(responseWorkflowStep.output, executionContext);
      steps.push(responseLLMSwitchStep);
      if (!responseLLMSwitchStep.output) throw new Error('LLMSwitch响应转换失败');

      // 记录响应
      this.ioTracker.trackResponse(sessionId, requestId, 'pipeline', responseLLMSwitchStep.output, startTime);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        response: responseLLMSwitchStep.output,
        executionTime,
        steps,
        context: executionContext
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorStep: PipelineExecutionStep = {
        moduleId: 'error',
        moduleName: 'Error Handler',
        stepType: 'error',
        startTime,
        endTime: Date.now(),
        error: error instanceof Error ? error : new Error(String(error))
      };

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime,
        steps: [...steps, errorStep],
        context: {
          sessionId,
          requestId,
          executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          virtualModelId,
          providerId: context?.providerId || '',
          startTime,
          stage: 'error_handling' as PipelineStage,
          timing: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
            stageTimings: new Map(),
            status: 'failed'
          },
          ioRecords,
          metadata: context?.metadata || {},
          parentContext: context?.parentContext,
          parent: context?.parentContext,
          routingDecision: context?.routingDecision,
          performanceMetrics: context?.performanceMetrics,
          debugConfig: this.debugConfig
        }
      };
    }
  }

  /**
   * 执行流式请求
   */
  async *executeStreaming(request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>): AsyncGenerator<PipelineExecutionStep> {
    if (!this.isInitialized) {
      throw new Error('执行器未初始化');
    }

    const sessionId = context?.sessionId || uuidv4();
    const requestId = context?.requestId || uuidv4();

    try {
      // 查找虚拟模型配置
      const virtualModel = this.wrapper.virtualModels.find(vm => vm.id === virtualModelId);
      if (!virtualModel) {
        throw new Error(`未找到虚拟模型: ${virtualModelId}`);
      }

      // 确定提供商
      const target = virtualModel.targets[0];
      const providerId = target.providerId;

      // 创建执行上下文
      const executionContext: PipelineExecutionContext = {
        sessionId,
        requestId,
        executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        virtualModelId,
        providerId,
        startTime: Date.now(),
        stage: 'request_init' as PipelineStage,
        timing: {
          startTime: Date.now(),
          endTime: undefined,
          duration: undefined,
          stageTimings: new Map(),
          status: 'pending'
        },
        ioRecords: [],
        metadata: context?.metadata || {},
        parentContext: context?.parentContext,
        parent: context?.parentContext,
        routingDecision: undefined,
        performanceMetrics: undefined,
        debugConfig: this.debugConfig
      };

      // 执行流式处理流程
      yield* this.executeStreamingPipeline(request, virtualModel, executionContext);
    } catch (error) {
      const errorStep: PipelineExecutionStep = {
        moduleId: 'error',
        moduleName: 'Error Handler',
        stepType: 'error',
        startTime: Date.now(),
        endTime: Date.now(),
        error: error instanceof Error ? error : new Error(String(error))
      };
      yield errorStep;
    }
  }

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    modules: {
      [moduleId: string]: {
        status: string;
        statistics: any;
      };
    };
    routing?: any;
    performance?: any;
    optimization?: any;
  }> {
    const modules: any = {};

    if (this.isInitialized) {
      try {
        modules.llmswitch = await this.llmswitch.getStatus();
        modules.workflow = await this.workflow.getStatus();
        modules.compatibility = await this.compatibility.getStatus();
        modules.provider = await this.provider.getStatus();
      } catch (error) {
        Object.keys(modules).forEach(key => {
          modules[key] = {
            status: 'error',
            statistics: { error: error instanceof Error ? error.message : String(error) }
          };
        });
      }
    }

    return {
      isInitialized: this.isInitialized,
      modules,
      routing: this.routingOptimizer.getHealthStatus(),
      performance: this.ioTracker.getPerformanceAnalysis(),
      optimization: this.executionOptimizer.getOptimizationStats()
    };
  }

  /**
   * 销毁执行器
   */
  async destroy(): Promise<void> {
    try {
      if (this.llmswitch) await this.llmswitch.destroy();
      if (this.workflow) await this.workflow.destroy();
      if (this.compatibility) await this.compatibility.destroy();
      if (this.provider) await this.provider.destroy();

      // 销毁优化组件
      if (this.routingOptimizer) this.routingOptimizer.destroy();
      if (this.ioTracker) this.ioTracker.destroy();
      if (this.executionOptimizer) this.executionOptimizer.destroy();

      this.isInitialized = false;
    } catch (error) {
      console.error('销毁执行器时发生错误:', error);
    }
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport(): Promise<any> {
    return this.ioTracker.generateDebugReport();
  }

  /**
   * 获取路由统计
   */
  async getRoutingStats(): Promise<any> {
    return {
      health: this.routingOptimizer.getHealthStatus(),
      metrics: this.routingOptimizer.getPerformanceMetrics(),
      config: this.routingConfig
    };
  }

  /**
   * 获取IO记录
   */
  async getIORecords(filter?: any): Promise<any> {
    return this.ioTracker.getIORecords(filter);
  }

  /**
   * 重置统计信息
   */
  async resetStatistics(): Promise<void> {
    // 这里可以重置各种统计信息
    console.log('Statistics reset');
  }

  /**
   * 执行LLMSwitch请求转换
   */
  private async executeLLMSwitch(request: any, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const convertedRequest = await this.llmswitch.convertRequest(
        request,
        ProtocolType.ANTHROPIC,
        ProtocolType.OPENAI,
        context
      );

      return {
        moduleId: this.llmswitch.moduleId,
        moduleName: this.llmswitch.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        output: convertedRequest
      };
    } catch (error) {
      return {
        moduleId: this.llmswitch.moduleId,
        moduleName: this.llmswitch.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行Workflow转换
   */
  private async executeWorkflow(request: any, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const convertedRequest = await this.workflow.convertStreamingToNonStreaming(request, context);

      return {
        moduleId: this.workflow.moduleId,
        moduleName: this.workflow.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        output: convertedRequest
      };
    } catch (error) {
      return {
        moduleId: this.workflow.moduleId,
        moduleName: this.workflow.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行Compatibility请求转换
   */
  private async executeCompatibility(request: any, providerId: string, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const mappedRequest = await this.compatibility.mapRequest(request, providerId, context);

      return {
        moduleId: this.compatibility.moduleId,
        moduleName: this.compatibility.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        output: mappedRequest
      };
    } catch (error) {
      return {
        moduleId: this.compatibility.moduleId,
        moduleName: this.compatibility.moduleName,
        stepType: 'transformation',
        startTime,
        endTime: Date.now(),
        input: request,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行Provider调用
   */
  private async executeProvider(request: any, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const response = await this.provider.executeRequest(request, context);

      return {
        moduleId: this.provider.moduleId,
        moduleName: this.provider.moduleName,
        stepType: 'request',
        startTime,
        endTime: Date.now(),
        input: request,
        output: response
      };
    } catch (error) {
      return {
        moduleId: this.provider.moduleId,
        moduleName: this.provider.moduleName,
        stepType: 'request',
        startTime,
        endTime: Date.now(),
        input: request,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行Compatibility响应转换
   */
  private async executeCompatibilityResponse(response: any, providerId: string, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const mappedResponse = await this.compatibility.mapResponse(response, providerId, context);

      return {
        moduleId: this.compatibility.moduleId,
        moduleName: this.compatibility.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        output: mappedResponse
      };
    } catch (error) {
      return {
        moduleId: this.compatibility.moduleId,
        moduleName: this.compatibility.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行Workflow响应转换
   */
  private async executeWorkflowResponse(response: any, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      // 非流式响应，直接返回
      return {
        moduleId: this.workflow.moduleId,
        moduleName: this.workflow.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        output: response
      };
    } catch (error) {
      return {
        moduleId: this.workflow.moduleId,
        moduleName: this.workflow.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行LLMSwitch响应转换
   */
  private async executeLLMSwitchResponse(response: any, context: PipelineExecutionContext): Promise<PipelineExecutionStep> {
    const startTime = Date.now();
    try {
      const convertedResponse = await this.llmswitch.convertResponse(
        response,
        ProtocolType.OPENAI,
        ProtocolType.ANTHROPIC,
        context
      );

      return {
        moduleId: this.llmswitch.moduleId,
        moduleName: this.llmswitch.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        output: convertedResponse
      };
    } catch (error) {
      return {
        moduleId: this.llmswitch.moduleId,
        moduleName: this.llmswitch.moduleName,
        stepType: 'response',
        startTime,
        endTime: Date.now(),
        input: response,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行流式处理流程
   */
  private async *executeStreamingPipeline(request: any, virtualModel: any, context: PipelineExecutionContext): AsyncGenerator<PipelineExecutionStep> {
    // 流式处理逻辑将在后续实现
    // 这里先返回一个空步骤
    yield {
      moduleId: 'streaming',
      moduleName: 'Streaming Pipeline',
      stepType: 'request',
      startTime: Date.now(),
      endTime: Date.now(),
      input: request,
      output: { message: 'Streaming pipeline not implemented yet' }
    };
  }
}
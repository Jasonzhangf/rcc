/**
 * Request Analyzer - Analyzes request content for routing decisions
 * 请求分析器 - 分析请求内容用于路由决策
 */

import { RequestAnalysisResult, RoutingCapabilities } from './RoutingCapabilities';

/**
 * 请求分析器配置
 */
export interface RequestAnalyzerConfig {
  /**
   * 是否启用详细的token计算
   */
  enableDetailedTokenCounting: boolean;

  /**
   * 是否启用内容分析
   */
  enableContentAnalysis: boolean;

  /**
   * 默认token估算因子
   */
  defaultTokenEstimationFactor: number;

  /**
   * 复杂度阈值
   */
  complexityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  /**
   * 启用的分析器
   */
  enabledAnalyzers: {
    tokenAnalyzer: boolean;
    toolAnalyzer: boolean;
    imageAnalyzer: boolean;
    modalityAnalyzer: boolean;
    complexityAnalyzer: boolean;
  };
}

/**
 * 分析统计信息
 */
export interface AnalysisStatistics {
  totalRequests: number;
  averageAnalysisTime: number;
  averageTokenCount: number;
  requestTypeDistribution: Map<string, number>;
  modalityDistribution: Map<string, number>;
  lastAnalysisTime: number;
}

/**
 * 请求分析器 - 分析请求内容特征用于路由决策
 */
export class RequestAnalyzer {
  private config: RequestAnalyzerConfig;
  private statistics: AnalysisStatistics;

  constructor(config: Partial<RequestAnalyzerConfig> = {}) {
    this.config = {
      enableDetailedTokenCounting: true,
      enableContentAnalysis: true,
      defaultTokenEstimationFactor: 1.3,
      complexityThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.95
      },
      enabledAnalyzers: {
        tokenAnalyzer: true,
        toolAnalyzer: true,
        imageAnalyzer: true,
        modalityAnalyzer: true,
        complexityAnalyzer: true
      },
      ...config
    };

    this.statistics = {
      totalRequests: 0,
      averageAnalysisTime: 0,
      averageTokenCount: 0,
      requestTypeDistribution: new Map(),
      modalityDistribution: new Map(),
      lastAnalysisTime: 0
    };
  }

  /**
   * 分析请求并返回分析结果
   */
  async analyzeRequest(request: any, userContext?: any): Promise<RequestAnalysisResult> {
    const startTime = Date.now();
    console.log('🔍 Analyzing request for routing...');

    try {
      // 初始化分析结果
      const result: RequestAnalysisResult = {
        tokenCount: 0,
        hasToolCalls: false,
        hasImages: false,
        hasFunctionCalls: false,
        modalities: ['text'], // 默认包含文本
        requestType: 'chat',
        complexityScore: 0,
        priority: 'medium',
        requiresStreaming: false,
        specialRequirements: {},
        userContext
      };

      // 并行执行各种分析
      const analysisTasks = [];

      if (this.config.enabledAnalyzers.tokenAnalyzer) {
        analysisTasks.push(this.analyzeTokens(request, result));
      }

      if (this.config.enabledAnalyzers.toolAnalyzer) {
        analysisTasks.push(this.analyzeTools(request, result));
      }

      if (this.config.enabledAnalyzers.imageAnalyzer) {
        analysisTasks.push(this.analyzeImages(request, result));
      }

      if (this.config.enabledAnalyzers.modalityAnalyzer) {
        analysisTasks.push(this.analyzeModalities(request, result));
      }

      if (this.config.enabledAnalyzers.complexityAnalyzer) {
        analysisTasks.push(this.analyzeComplexity(request, result));
      }

      // 等待所有分析完成
      await Promise.all(analysisTasks);

      // 确定请求类型
      this.determineRequestType(request, result);

      // 确定优先级
      this.determinePriority(request, result);

      // 更新统计信息
      this.updateStatistics(result, Date.now() - startTime);

      console.log(`✅ Request analysis completed: ${result.requestType}, ${result.tokenCount} tokens, complexity: ${result.complexityScore.toFixed(2)}`);

      return result;

    } catch (error) {
      console.error('❌ Request analysis failed:', error);
      throw new Error(`Request analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 分析token数量
   */
  private async analyzeTokens(request: any, result: RequestAnalysisResult): Promise<void> {
    try {
      if (this.config.enableDetailedTokenCounting) {
        // 详细token计算
        result.tokenCount = await this.calculateDetailedTokens(request);
      } else {
        // 简单估算
        result.tokenCount = this.estimateTokens(request);
      }

      // 检查是否超过某些阈值
      // 移除token限制硬编码，使用无限制模式

    } catch (error) {
      console.warn('⚠️ Token analysis failed, using estimation:', error);
      result.tokenCount = this.estimateTokens(request);
    }
  }

  /**
   * 详细计算token数量
   */
  private async calculateDetailedTokens(request: any): Promise<number> {
    let totalTokens = 0;

    // 计算消息内容的token
    if (request.messages && Array.isArray(request.messages)) {
      for (const message of request.messages) {
        if (message.content) {
          if (typeof message.content === 'string') {
            totalTokens += this.estimateTokensFromText(message.content);
          } else if (Array.isArray(message.content)) {
            for (const content of message.content) {
              if (content.type === 'text' && content.text) {
                totalTokens += this.estimateTokensFromText(content.text);
              } else if (content.type === 'image_url') {
                totalTokens += this.estimateImageTokens(content.image_url);
              }
            }
          }
        }
      }
    }

    // 计算工具调用的token
    if (request.tools && Array.isArray(request.tools)) {
      totalTokens += this.estimateToolsTokens(request.tools);
    }

    // 计算函数调用的token
    if (request.functions && Array.isArray(request.functions)) {
      totalTokens += this.estimateFunctionsTokens(request.functions);
    }

    // 应用估算因子
    return Math.floor(totalTokens * this.config.defaultTokenEstimationFactor);
  }

  /**
   * 简单估算token数量
   */
  private estimateTokens(request: any): number {
    const requestString = JSON.stringify(request);
    return Math.floor(requestString.length / 4 * this.config.defaultTokenEstimationFactor);
  }

  /**
   * 从文本估算token
   */
  private estimateTokensFromText(text: string): number {
    // 简单的英文token估算（平均1 token ≈ 4 characters for English）
    return Math.ceil(text.length / 4);
  }

  /**
   * 估算图像token
   */
  private estimateImageTokens(imageUrl: any): number {
    // 简单的图像token估算
    // 实际实现应该考虑图像的分辨率和细节程度
    return 765; // 默认中等分辨率图像的token数量
  }

  /**
   * 估算工具token
   */
  private estimateToolsTokens(tools: any[]): number {
    let tokens = 0;
    for (const tool of tools) {
      if (tool.function) {
        const functionString = JSON.stringify(tool.function);
        tokens += this.estimateTokensFromText(functionString);
      }
    }
    return tokens;
  }

  /**
   * 估算函数token
   */
  private estimateFunctionsTokens(functions: any[]): number {
    let tokens = 0;
    for (const func of functions) {
      const functionString = JSON.stringify(func);
      tokens += this.estimateTokensFromText(functionString);
    }
    return tokens;
  }

  /**
   * 分析工具调用
   */
  private async analyzeTools(request: any, result: RequestAnalysisResult): Promise<void> {
    result.hasToolCalls = this.hasToolCalls(request);

    if (result.hasToolCalls) {
      result.specialRequirements.needsWebSearch = this.requiresWebSearch(request);
      result.specialRequirements.needsCodeExecution = this.requiresCodeExecution(request);
    }
  }

  /**
   * 检查是否包含工具调用
   */
  private hasToolCalls(request: any): boolean {
    return !!(request.tools && Array.isArray(request.tools) && request.tools.length > 0);
  }

  /**
   * 检查是否需要网络搜索
   */
  private requiresWebSearch(request: any): boolean {
    if (!request.tools) return false;

    return request.tools.some((tool: any) => {
      if (tool.function && tool.function.name) {
        const name = tool.function.name.toLowerCase();
        return name.includes('search') || name.includes('browse') || name.includes('web');
      }
      return false;
    });
  }

  /**
   * 检查是否需要代码执行
   */
  private requiresCodeExecution(request: any): boolean {
    if (!request.tools) return false;

    return request.tools.some((tool: any) => {
      if (tool.function && tool.function.name) {
        const name = tool.function.name.toLowerCase();
        return name.includes('execute') || name.includes('code') || name.includes('run');
      }
      return false;
    });
  }

  /**
   * 分析图像内容
   */
  private async analyzeImages(request: any, result: RequestAnalysisResult): Promise<void> {
    result.hasImages = this.hasImages(request);

    if (result.hasImages) {
      result.specialRequirements.needsVision = true;

      // 如果包含图像，添加视觉模态
      if (!result.modalities.includes('vision')) {
        result.modalities.push('vision');
      }

      result.specialRequirements.needsMultimodal = true;
    }
  }

  /**
   * 检查是否包含图像
   */
  private hasImages(request: any): boolean {
    if (!request.messages || !Array.isArray(request.messages)) {
      return false;
    }

    return request.messages.some((message: any) => {
      if (message.content) {
        if (Array.isArray(message.content)) {
          return message.content.some((content: any) =>
            content.type === 'image_url' ||
            (content.type === 'image' && content.image_url)
          );
        }
      }
      return false;
    });
  }

  /**
   * 分析模态类型
   */
  private async analyzeModalities(request: any, result: RequestAnalysisResult): Promise<void> {
    const modalities = new Set<string>(['text']); // 默认包含文本

    // 检查音频
    if (this.hasAudioContent(request)) {
      modalities.add('audio');
      result.specialRequirements.needsAudio = true;
      result.specialRequirements.needsMultimodal = true;
    }

    // 检查视频
    if (this.hasVideoContent(request)) {
      modalities.add('video');
      result.specialRequirements.needsMultimodal = true;
    }

    // 检查代码
    if (this.hasCodeContent(request)) {
      modalities.add('code');
      result.specialRequirements.needsCodeExecution = true;
    }

    result.modalities = Array.from(modalities);
  }

  /**
   * 检查是否包含音频内容
   */
  private hasAudioContent(request: any): boolean {
    // 检查消息中是否包含音频内容
    if (request.messages && Array.isArray(request.messages)) {
      return request.messages.some((message: any) => {
        if (message.content && Array.isArray(message.content)) {
          return message.content.some((content: any) =>
            content.type === 'audio' || content.type === 'audio_url'
          );
        }
        return false;
      });
    }
    return false;
  }

  /**
   * 检查是否包含视频内容
   */
  private hasVideoContent(request: any): boolean {
    // 检查消息中是否包含视频内容
    if (request.messages && Array.isArray(request.messages)) {
      return request.messages.some((message: any) => {
        if (message.content && Array.isArray(message.content)) {
          return message.content.some((content: any) =>
            content.type === 'video' || content.type === 'video_url'
          );
        }
        return false;
      });
    }
    return false;
  }

  /**
   * 检查是否包含代码内容
   */
  private hasCodeContent(request: any): boolean {
    if (request.messages && Array.isArray(request.messages)) {
      return request.messages.some((message: any) => {
        if (message.content && typeof message.content === 'string') {
          return message.content.includes('```') ||
                 message.content.includes('function(') ||
                 message.content.includes('def ') ||
                 message.content.includes('class ');
        }
        return false;
      });
    }
    return false;
  }

  /**
   * 分析复杂度
   */
  private async analyzeComplexity(request: any, result: RequestAnalysisResult): Promise<void> {
    let complexityScore = 0;

    // 基于token数量的复杂度 - 移除硬编码60000限制，使用动态计算
    const tokenComplexity = Math.min(result.tokenCount / 1000000, 1) * 0.3; // 使用1M作为动态基准
    complexityScore += tokenComplexity;

    // 基于工具调用的复杂度
    if (result.hasToolCalls) {
      complexityScore += 0.2;
    }

    // 基于图像的复杂度
    if (result.hasImages) {
      complexityScore += 0.2;
    }

    // 基于模态数量的复杂度
    const modalityComplexity = (result.modalities.length - 1) * 0.1;
    complexityScore += Math.min(modalityComplexity, 0.2);

    // 基于消息数量的复杂度
    const messageCount = request.messages ? request.messages.length : 1;
    const messageComplexity = Math.min(messageCount / 10, 1) * 0.1;
    complexityScore += messageComplexity;

    result.complexityScore = Math.min(complexityScore, 1);
  }

  /**
   * 确定请求类型
   */
  private determineRequestType(request: any, result: RequestAnalysisResult): void {
    if (request.stream) {
      result.requiresStreaming = true;
    }

    if (result.hasFunctionCalls) {
      result.requestType = 'function_call';
    } else if (result.hasToolCalls) {
      result.requestType = 'tool_call';
    } else if (request.model && request.model.includes('embedding')) {
      result.requestType = 'embedding';
    } else if (request.messages && request.messages.length > 0) {
      result.requestType = 'chat';
    } else {
      result.requestType = 'completion';
    }
  }

  /**
   * 确定优先级
   */
  private determinePriority(request: any, result: RequestAnalysisResult): void {
    // 基于复杂度的优先级
    if (result.complexityScore >= this.config.complexityThresholds.critical) {
      result.priority = 'critical';
    } else if (result.complexityScore >= this.config.complexityThresholds.high) {
      result.priority = 'high';
    } else if (result.complexityScore >= this.config.complexityThresholds.medium) {
      result.priority = 'medium';
    } else {
      result.priority = 'low';
    }

    // 检查用户指定的优先级
    if (request.metadata && request.metadata.priority) {
      result.priority = request.metadata.priority;
    }
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(result: RequestAnalysisResult, analysisTime: number): void {
    this.statistics.totalRequests++;

    // 更新平均分析时间
    const totalTime = this.statistics.averageAnalysisTime * (this.statistics.totalRequests - 1);
    this.statistics.averageAnalysisTime = (totalTime + analysisTime) / this.statistics.totalRequests;

    // 更新平均token数量
    const totalTokens = this.statistics.averageTokenCount * (this.statistics.totalRequests - 1);
    this.statistics.averageTokenCount = (totalTokens + result.tokenCount) / this.statistics.totalRequests;

    // 更新请求类型分布
    const requestTypeCount = this.statistics.requestTypeDistribution.get(result.requestType) || 0;
    this.statistics.requestTypeDistribution.set(result.requestType, requestTypeCount + 1);

    // 更新模态分布
    for (const modality of result.modalities) {
      const modalityCount = this.statistics.modalityDistribution.get(modality) || 0;
      this.statistics.modalityDistribution.set(modality, modalityCount + 1);
    }

    this.statistics.lastAnalysisTime = Date.now();
  }

  /**
   * 获取统计信息
   */
  getStatistics(): AnalysisStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      averageAnalysisTime: 0,
      averageTokenCount: 0,
      requestTypeDistribution: new Map(),
      modalityDistribution: new Map(),
      lastAnalysisTime: 0
    };
  }

  /**
   * 验证请求分析结果是否与给定的能力匹配
   */
  validateCapabilities(analysisResult: RequestAnalysisResult, capabilities: RoutingCapabilities): boolean {
    // 检查token限制
    if (analysisResult.tokenCount > capabilities.maxTokens) {
      return false;
    }

    // 检查流式支持
    if (analysisResult.requiresStreaming && !capabilities.supportsStreaming) {
      return false;
    }

    // 检查工具支持
    if (analysisResult.hasToolCalls && !capabilities.supportsTools) {
      return false;
    }

    // 检查图像支持
    if (analysisResult.hasImages && !capabilities.supportsImages) {
      return false;
    }

    // 检查模态支持
    for (const modality of analysisResult.modalities) {
      if (!capabilities.supportedModalities.includes(modality)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算匹配分数
   */
  calculateMatchScore(analysisResult: RequestAnalysisResult, capabilities: RoutingCapabilities): number {
    let score = 0;
    let totalWeight = 0;

    // Token匹配分数 (权重: 0.3)
    const tokenScore = Math.min(analysisResult.tokenCount / capabilities.maxTokens, 1);
    score += tokenScore * 0.3;
    totalWeight += 0.3;

    // 模态匹配分数 (权重: 0.25)
    const modalityScore = this.calculateModalityScore(analysisResult.modalities, capabilities.supportedModalities);
    score += modalityScore * 0.25;
    totalWeight += 0.25;

    // 功能匹配分数 (权重: 0.2)
    const functionScore = this.calculateFunctionScore(analysisResult, capabilities);
    score += functionScore * 0.2;
    totalWeight += 0.2;

    // 性能分数 (权重: 0.15)
    score += capabilities.performanceScore * 0.15;
    totalWeight += 0.15;

    // 可用性分数 (权重: 0.1)
    score += capabilities.availability * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * 计算模态匹配分数
   */
  private calculateModalityScore(requiredModalities: string[], supportedModalities: string[]): number {
    if (requiredModalities.length === 0) return 1;

    let matchedCount = 0;
    for (const modality of requiredModalities) {
      if (supportedModalities.includes(modality)) {
        matchedCount++;
      }
    }

    return matchedCount / requiredModalities.length;
  }

  /**
   * 计算功能匹配分数
   */
  private calculateFunctionScore(analysisResult: RequestAnalysisResult, capabilities: RoutingCapabilities): number {
    let score = 0;
    let checks = 0;

    // 流式支持
    if (analysisResult.requiresStreaming) {
      score += capabilities.supportsStreaming ? 1 : 0;
      checks++;
    }

    // 工具支持
    if (analysisResult.hasToolCalls) {
      score += capabilities.supportsTools ? 1 : 0;
      checks++;
    }

    // 图像支持
    if (analysisResult.hasImages) {
      score += capabilities.supportsImages ? 1 : 0;
      checks++;
    }

    // 函数调用支持
    if (analysisResult.hasFunctionCalls) {
      score += capabilities.supportsFunctionCalling ? 1 : 0;
      checks++;
    }

    return checks > 0 ? score / checks : 1;
  }
}
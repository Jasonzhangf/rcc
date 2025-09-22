/**
 * Routing Rules Engine - Manages routing rules and makes routing decisions
 * 路由规则引擎 - 管理路由规则并进行路由决策
 */

import {
  RoutingCapabilities,
  RoutingContext,
  RequestAnalysisResult,
  RoutingDecision,
  RoutingMatchResult,
  RoutingRule,
  RoutingStrategyConfig
} from './RoutingCapabilities';

/**
 * 路由规则引擎配置
 */
export interface RoutingRulesEngineConfig {
  /**
   * 默认匹配阈值
   */
  defaultMatchThreshold: number;

  /**
   * 启用回退机制
   */
  enableFallback: boolean;

  /**
   * 最大备选方案数量
   */
  maxAlternatives: number;

  /**
   * 启用负载均衡
   */
  enableLoadBalancing: boolean;

  /**
   * 启用性能优化
   */
  enablePerformanceOptimization: boolean;

  /**
   * 规则缓存时间（毫秒）
   */
  ruleCacheTime: number;

  /**
   * 决策超时时间（毫秒）
   */
  decisionTimeout: number;
}

/**
 * 路由统计信息
 */
export interface RoutingStatistics {
  totalDecisions: number;
  averageDecisionTime: number;
  successfulDecisions: number;
  fallbackDecisions: number;
  loadBalancedDecisions: number;
  routingUsage: Map<string, number>;
  ruleUsage: Map<string, number>;
  averageMatchScore: number;
  lastDecisionTime: number;
}


/**
 * 路由规则引擎 - 管理路由规则并进行路由决策
 */
export class RoutingRulesEngine {
  private config: RoutingRulesEngineConfig;
  private rules: Map<string, RoutingRule> = new Map();
  private strategies: Map<string, RoutingStrategyConfig> = new Map();
  private pipelinePools: Map<string, RoutingCapabilities> = new Map();
  private statistics: RoutingStatistics;
  private ruleCache: Map<string, { rule: RoutingRule; expires: number }> = new Map();
  private lastCleanup: number = Date.now();

  constructor(config: Partial<RoutingRulesEngineConfig> = {}) {
    this.config = {
      defaultMatchThreshold: 0.6,
      enableFallback: true,
      maxAlternatives: 0, // 0表示无限制
      enableLoadBalancing: true,
      enablePerformanceOptimization: true,
      ruleCacheTime: 300000, // 5分钟
      decisionTimeout: 1000, // 1秒
      ...config
    };

    this.statistics = {
      totalDecisions: 0,
      averageDecisionTime: 0,
      successfulDecisions: 0,
      fallbackDecisions: 0,
      loadBalancedDecisions: 0,
      routingUsage: new Map(),
      ruleUsage: new Map(),
      averageMatchScore: 0,
      lastDecisionTime: 0
    };

    // 初始化默认规则
    this.initializeDefaultRules();
    // 初始化默认策略
    this.initializeDefaultStrategies();
  }

  /**
   * 初始化默认路由规则
   */
  private initializeDefaultRules(): void {
    const defaultRules: RoutingRule[] = [
      {
        name: 'high_complexity_critical',
        description: '高复杂度请求使用高优先级处理',
        enabled: true,
        priority: 100,
        conditions: [
          { field: 'complexityScore', operator: 'greater_than', value: 0.8 }
        ],
        actions: [
          { type: 'set_priority', target: 'critical', parameters: {} }
        ],
        weight: 1.0
      },
      {
        name: 'vision_request',
        description: '视觉请求使用支持图像的模型',
        enabled: true,
        priority: 90,
        conditions: [
          { field: 'specialRequirements', operator: 'contains', value: { needsVision: true } }
        ],
        actions: [
          { type: 'select_routing', target: 'vision-capable', parameters: {} }
        ],
        weight: 1.0
      },
      {
        name: 'streaming_request',
        description: '流式请求使用支持流式的模型',
        enabled: true,
        priority: 80,
        conditions: [
          { field: 'requiresStreaming', operator: 'equals', value: true }
        ],
        actions: [
          { type: 'select_routing', target: 'streaming-capable', parameters: {} }
        ],
        weight: 0.8
      },
      {
        name: 'tool_calling_request',
        description: '工具调用请求使用支持工具的模型',
        enabled: true,
        priority: 70,
        conditions: [
          { field: 'hasToolCalls', operator: 'equals', value: true }
        ],
        actions: [
          { type: 'select_routing', target: 'tool-capable', parameters: {} }
        ],
        weight: 0.8
      },
      {
        name: 'large_token_request',
        description: '大token请求使用支持大上下文的模型',
        enabled: true,
        priority: 60,
        conditions: [
          { field: 'tokenCount', operator: 'greater_than', value: 0 }
        ],
        actions: [
          { type: 'select_routing', target: 'large-context', parameters: {} }
        ],
        weight: 0.7
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.name, rule);
    }
  }

  /**
   * 初始化默认路由策略
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: RoutingStrategyConfig[] = [
      {
        name: 'balanced',
        description: '均衡策略 - 考虑性能、成本和能力',
        isDefault: true,
        enabled: true,
        matchingAlgorithm: 'weighted',
        weights: {
          capabilityScore: 0.4,
          performanceScore: 0.25,
          costScore: 0.2,
          availabilityScore: 0.1,
          priorityScore: 0.05
        },
        thresholds: {
          minimumMatchScore: 0.6,
          highAvailabilityThreshold: 0.9,
          loadBalanceThreshold: 0.8
        },
        loadBalancing: {
          enabled: true,
          strategy: 'weighted'
        }
      },
      {
        name: 'performance',
        description: '性能优先策略 - 最大化响应速度',
        isDefault: false,
        enabled: true,
        matchingAlgorithm: 'score_based',
        weights: {
          capabilityScore: 0.3,
          performanceScore: 0.5,
          costScore: 0.1,
          availabilityScore: 0.08,
          priorityScore: 0.02
        },
        thresholds: {
          minimumMatchScore: 0.5,
          highAvailabilityThreshold: 0.85,
          loadBalanceThreshold: 0.75
        },
        loadBalancing: {
          enabled: true,
          strategy: 'least_connections'
        }
      },
      {
        name: 'cost',
        description: '成本优先策略 - 最小化使用成本',
        isDefault: false,
        enabled: true,
        matchingAlgorithm: 'weighted',
        weights: {
          capabilityScore: 0.35,
          performanceScore: 0.1,
          costScore: 0.45,
          availabilityScore: 0.08,
          priorityScore: 0.02
        },
        thresholds: {
          minimumMatchScore: 0.5,
          highAvailabilityThreshold: 0.8,
          loadBalanceThreshold: 0.7
        },
        loadBalancing: {
          enabled: true,
          strategy: 'weighted'
        }
      }
    ];

    for (const strategy of defaultStrategies) {
      this.strategies.set(strategy.name, strategy);
    }
  }

  /**
   * 注册流水线池能力
   */
  registerPipelinePool(poolId: string, capabilities: RoutingCapabilities): void {
    console.log(`📝 Registering pipeline pool capabilities: ${poolId}`);
    this.pipelinePools.set(poolId, capabilities);
  }

  /**
   * 注销流水线池
   */
  unregisterPipelinePool(poolId: string): void {
    console.log(`🗑️ Unregistering pipeline pool: ${poolId}`);
    this.pipelinePools.delete(poolId);
  }

  /**
   * 添加路由规则
   */
  addRule(rule: RoutingRule): void {
    console.log(`➕ Adding routing rule: ${rule.name}`);
    this.rules.set(rule.name, rule);
  }

  /**
   * 移除路由规则
   */
  removeRule(ruleName: string): boolean {
    console.log(`➖ Removing routing rule: ${ruleName}`);
    return this.rules.delete(ruleName);
  }

  /**
   * 添加路由策略
   */
  addStrategy(strategy: RoutingStrategyConfig): void {
    console.log(`📊 Adding routing strategy: ${strategy.name}`);
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 移除路由策略
   */
  removeStrategy(strategyName: string): boolean {
    console.log(`🗑️ Removing routing strategy: ${strategyName}`);
    return this.strategies.delete(strategyName);
  }

  /**
   * 执行路由决策
   */
  async makeRoutingDecision(
    requestAnalysis: RequestAnalysisResult,
    context?: RoutingContext,
    strategyName?: string
  ): Promise<RoutingDecision> {
    const startTime = Date.now();
    console.log('🎯 Making routing decision...');

    try {
      // 清理过期缓存
      this.cleanupExpiredCache();

      // 获取策略
      const strategy = this.getStrategy(strategyName);
      if (!strategy) {
        throw new Error(`Routing strategy not found: ${strategyName}`);
      }

      // 应用路由规则
      const ruleResults = await this.applyRules(requestAnalysis, context);

      // 获取候选流水线池
      const candidates = await this.getCandidatePools(requestAnalysis, strategy, ruleResults);

      // 选择最佳候选
      const decision = await this.selectBestCandidate(candidates, requestAnalysis, strategy, context);

      // 更新统计信息
      this.updateStatistics(decision, Date.now() - startTime);

      console.log(`✅ Routing decision made: ${decision.targetRoutingId}, score: ${decision.matchResult.matchScore.toFixed(2)}`);

      return decision;

    } catch (error) {
      console.error('❌ Routing decision failed:', error);

      // 尝试回退决策
      if (this.config.enableFallback) {
        return this.makeFallbackDecision(requestAnalysis, error);
      }

      throw new Error(`Routing decision failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取路由策略
   */
  private getStrategy(strategyName?: string): RoutingStrategyConfig {
    if (strategyName) {
      const strategy = this.strategies.get(strategyName);
      if (strategy && strategy.enabled) {
        return strategy;
      }
    }

    // 返回默认策略
    for (const strategy of this.strategies.values()) {
      if (strategy.isDefault && strategy.enabled) {
        return strategy;
      }
    }

    // 如果没有默认策略，返回第一个启用的策略
    for (const strategy of this.strategies.values()) {
      if (strategy.enabled) {
        return strategy;
      }
    }

    throw new Error('No available routing strategies');
  }

  /**
   * 应用路由规则
   */
  private async applyRules(
    requestAnalysis: RequestAnalysisResult,
    context?: RoutingContext
  ): Promise<Map<string, number>> {
    const ruleResults = new Map<string, number>();

    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        const matches = await this.evaluateRule(rule, requestAnalysis, context);
        if (matches) {
          ruleResults.set(ruleName, rule.weight);
          console.log(`📋 Rule matched: ${ruleName}, weight: ${rule.weight}`);
        }
      } catch (error) {
        console.warn(`⚠️ Rule evaluation failed for ${ruleName}:`, error);
      }
    }

    return ruleResults;
  }

  /**
   * 评估路由规则
   */
  private async evaluateRule(
    rule: RoutingRule,
    requestAnalysis: RequestAnalysisResult,
    context?: RoutingContext
  ): Promise<boolean> {
    // 检查规则是否过期
    if (rule.expiresAt && rule.expiresAt.getTime() < Date.now()) {
      return false;
    }

    // 评估所有条件
    for (const condition of rule.conditions) {
      const fieldValue = this.getFieldValue(requestAnalysis, condition.field);
      const conditionResult = this.evaluateCondition(fieldValue, condition.operator, condition.value);

      if (!conditionResult) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取字段值
   */
  private getFieldValue(obj: any, fieldPath: string): any {
    const keys = fieldPath.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(expectedValue);
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(expectedValue);
        }
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          return JSON.stringify(fieldValue).includes(JSON.stringify(expectedValue));
        }
        return false;

      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);

      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);

      case 'regex':
        return new RegExp(expectedValue).test(String(fieldValue));

      default:
        return false;
    }
  }

  /**
   * 获取候选流水线池
   */
  private async getCandidatePools(
    requestAnalysis: RequestAnalysisResult,
    strategy: RoutingStrategyConfig,
    ruleResults: Map<string, number>
  ): Promise<Array<{ poolId: string; capabilities: RoutingCapabilities; matchResult: RoutingMatchResult }>> {
    const candidates: Array<{ poolId: string; capabilities: RoutingCapabilities; matchResult: RoutingMatchResult }> = [];

    for (const [poolId, capabilities] of this.pipelinePools) {
      const matchResult = await this.evaluatePoolMatch(requestAnalysis, capabilities, strategy, ruleResults);

      if (matchResult.isMatch && matchResult.matchScore >= strategy.thresholds.minimumMatchScore) {
        candidates.push({ poolId, capabilities, matchResult });
      }
    }

    // 按匹配分数排序
    candidates.sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);

    return candidates;
  }

  /**
   * 评估流水线池匹配
   */
  private async evaluatePoolMatch(
    requestAnalysis: RequestAnalysisResult,
    capabilities: RoutingCapabilities,
    strategy: RoutingStrategyConfig,
    ruleResults: Map<string, number>
  ): Promise<RoutingMatchResult> {
    const matchResult: RoutingMatchResult = {
      isMatch: true,
      matchScore: 0,
      matchDetails: {
        capabilities: {
          modelSupport: false,
          tokenSupport: false,
          streamingSupport: false,
          toolsSupport: false,
          imagesSupport: false,
          multimodalSupport: false,
          modalitySupport: false,
          availability: false,
          region: true, // 默认通过
          usageLimits: true // 默认通过
        },
        scores: {
          capabilityScore: 0,
          performanceScore: 0,
          costScore: 0,
          priorityScore: 0,
          overallScore: 0
        }
      },
      mismatchReasons: []
    };

    // 检查基本能力匹配
    this.checkCapabilitiesMatch(requestAnalysis, capabilities, matchResult);

    // 计算匹配分数
    this.calculateMatchScores(requestAnalysis, capabilities, strategy, ruleResults, matchResult);

    // 确定是否匹配
    matchResult.isMatch = this.determineIfMatch(matchResult, strategy.thresholds.minimumMatchScore);

    return matchResult;
  }

  /**
   * 检查能力匹配
   */
  private checkCapabilitiesMatch(
    requestAnalysis: RequestAnalysisResult,
    capabilities: RoutingCapabilities,
    matchResult: RoutingMatchResult
  ): void {
    const { capabilities: caps } = matchResult.matchDetails;

    // 模型支持检查
    caps.modelSupport = capabilities.supportedModels.length > 0;
    if (!caps.modelSupport) {
      matchResult.mismatchReasons?.push('No supported models');
    }

    // Token支持检查 - 移除硬编码限制
    caps.tokenSupport = true; // 移除token限制，支持所有token数量
    // if (!caps.tokenSupport) {
    //   matchResult.mismatchReasons?.push(`Token count exceeds limit: ${requestAnalysis.tokenCount} > ${capabilities.maxTokens}`);
    // }

    // 流式支持检查
    caps.streamingSupport = !requestAnalysis.requiresStreaming || capabilities.supportsStreaming;
    if (!caps.streamingSupport) {
      matchResult.mismatchReasons?.push('Streaming not supported');
    }

    // 工具支持检查
    caps.toolsSupport = !requestAnalysis.hasToolCalls || capabilities.supportsTools;
    if (!caps.toolsSupport) {
      matchResult.mismatchReasons?.push('Tools not supported');
    }

    // 图像支持检查
    caps.imagesSupport = !requestAnalysis.hasImages || capabilities.supportsImages;
    if (!caps.imagesSupport) {
      matchResult.mismatchReasons?.push('Images not supported');
    }

    // 多模态支持检查
    caps.multimodalSupport = !requestAnalysis.specialRequirements?.needsMultimodal || capabilities.supportsMultimodal;
    if (!caps.multimodalSupport) {
      matchResult.mismatchReasons?.push('Multimodal not supported');
    }

    // 模态支持检查
    caps.modalitySupport = requestAnalysis.modalities.every(modality =>
      capabilities.supportedModalities.includes(modality)
    );
    if (!caps.modalitySupport) {
      matchResult.mismatchReasons?.push('Required modalities not supported');
    }

    // 可用性检查
    caps.availability = capabilities.availability > 0.1;
    if (!caps.availability) {
      matchResult.mismatchReasons?.push('Pool not available');
    }
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScores(
    requestAnalysis: RequestAnalysisResult,
    capabilities: RoutingCapabilities,
    strategy: RoutingStrategyConfig,
    ruleResults: Map<string, number>,
    matchResult: RoutingMatchResult
  ): void {
    const { scores } = matchResult.matchDetails;
    const { weights } = strategy;

    // 能力分数
    scores.capabilityScore = this.calculateCapabilityScore(requestAnalysis, capabilities);

    // 性能分数
    scores.performanceScore = capabilities.performanceScore;

    // 成本分数（成本分数越低越好，所以用1减去）
    scores.costScore = 1 - capabilities.costScore;

    // Capability score
    scores.capabilityScore = capabilities.availability;

    // 优先级分数
    scores.priorityScore = capabilities.priority / 100;

    // 规则加成
    const ruleBonus = this.calculateRuleBonus(ruleResults);

    // 计算总分
    scores.overallScore =
      scores.capabilityScore * weights.capabilityScore +
      scores.performanceScore * weights.performanceScore +
      scores.costScore * weights.costScore +
      scores.capabilityScore * weights.availabilityScore +
      scores.priorityScore * weights.priorityScore +
      ruleBonus;

    matchResult.matchScore = Math.min(scores.overallScore, 1);
  }

  /**
   * 计算能力分数
   */
  private calculateCapabilityScore(
    requestAnalysis: RequestAnalysisResult,
    capabilities: RoutingCapabilities
  ): number {
    let score = 0;
    let checks = 0;

    // Token能力分数 - 移除硬编码限制
    // const tokenRatio = Math.min(requestAnalysis.tokenCount / capabilities.maxTokens, 1);
    score += 0.3; // 移除token限制，给予满分
    checks++;

    // 模态匹配分数
    const matchedModalities = requestAnalysis.modalities.filter(modality =>
      capabilities.supportedModalities.includes(modality)
    ).length;
    const modalityScore = requestAnalysis.modalities.length > 0 ?
      matchedModalities / requestAnalysis.modalities.length : 1;
    score += modalityScore * 0.25;
    checks++;

    // 功能匹配分数
    let functionScore = 0;
    let functionChecks = 0;

    if (requestAnalysis.requiresStreaming) {
      functionScore += capabilities.supportsStreaming ? 1 : 0;
      functionChecks++;
    }

    if (requestAnalysis.hasToolCalls) {
      functionScore += capabilities.supportsTools ? 1 : 0;
      functionChecks++;
    }

    if (requestAnalysis.hasImages) {
      functionScore += capabilities.supportsImages ? 1 : 0;
      functionChecks++;
    }

    if (requestAnalysis.hasFunctionCalls) {
      functionScore += capabilities.supportsFunctionCalling ? 1 : 0;
      functionChecks++;
    }

    const finalFunctionScore = functionChecks > 0 ? functionScore / functionChecks : 1;
    score += finalFunctionScore * 0.25;
    checks++;

    // 复杂度处理能力
    const complexityScore = Math.min(requestAnalysis.complexityScore, capabilities.priority / 100);
    score += complexityScore * 0.2;
    checks++;

    return checks > 0 ? score / checks : 0;
  }

  /**
   * 计算规则加成
   */
  private calculateRuleBonus(ruleResults: Map<string, number>): number {
    let totalBonus = 0;
    for (const weight of ruleResults.values()) {
      totalBonus += weight * 0.1; // 规则权重提供最多10%的加成
    }
    return Math.min(totalBonus, 0.2); // 最多20%的规则加成
  }

  /**
   * 确定是否匹配
   */
  private determineIfMatch(matchResult: RoutingMatchResult, threshold: number): boolean {
    const { capabilities } = matchResult.matchDetails;

    // 必须满足所有基本能力要求
    const basicCapabilitiesSatisfied =
      capabilities.modelSupport &&
      capabilities.tokenSupport &&
      capabilities.streamingSupport &&
      capabilities.toolsSupport &&
      capabilities.imagesSupport &&
      capabilities.multimodalSupport &&
      capabilities.modalitySupport &&
      capabilities.availability;

    return basicCapabilitiesSatisfied && matchResult.matchScore >= threshold;
  }

  /**
   * 选择最佳候选
   */
  private async selectBestCandidate(
    candidates: Array<{ poolId: string; capabilities: RoutingCapabilities; matchResult: RoutingMatchResult }>,
    requestAnalysis: RequestAnalysisResult,
    strategy: RoutingStrategyConfig,
    context?: RoutingContext
  ): Promise<RoutingDecision> {
    if (candidates.length === 0) {
      throw new Error('No suitable candidates found');
    }

    // 如果启用了负载均衡，考虑负载情况
    let selectedCandidate = candidates[0];
    let useLoadBalancing = false;

    if (this.config.enableLoadBalancing && strategy.loadBalancing.enabled) {
      const topCandidates = candidates.filter(c =>
        c.matchResult.matchScore >= strategy.thresholds.loadBalanceThreshold
      );

      if (topCandidates.length > 1) {
        selectedCandidate = this.selectByLoadBalancing(topCandidates, strategy);
        useLoadBalancing = true;
      }
    }

    // 生成备选方案
    const alternatives = this.config.maxAlternatives > 0 ?
      candidates
        .slice(1, Math.min(this.config.maxAlternatives + 1, candidates.length))
        .map(candidate => ({
          routingId: candidate.poolId,
          matchScore: candidate.matchResult.matchScore,
          reason: 'Alternative candidate'
        })) : [];

    const decision: RoutingDecision = {
      targetRoutingId: selectedCandidate.poolId,
      selectedPoolId: selectedCandidate.poolId,
      matchResult: selectedCandidate.matchResult,
      alternatives,
      metadata: {
        routingTime: 0, // 将在外部更新
        strategyUsed: strategy.name,
        decisionReason: useLoadBalancing ? 'load_balancing' : 'best_match',
        fallbackUsed: false
      }
    };

    return decision;
  }

  /**
   * 根据负载均衡选择候选
   */
  private selectByLoadBalancing(
    candidates: Array<{ poolId: string; capabilities: RoutingCapabilities; matchResult: RoutingMatchResult }>,
    strategy: RoutingStrategyConfig
  ): { poolId: string; capabilities: RoutingCapabilities; matchResult: RoutingMatchResult } {
    const { strategy: lbStrategy } = strategy.loadBalancing;

    switch (lbStrategy) {
      case 'round_robin':
        // 简单的轮询实现
        const index = this.statistics.totalDecisions % candidates.length;
        return candidates[index];

      case 'weighted':
        // 加权随机选择
        const totalWeight = candidates.reduce((sum, c) => sum + c.capabilities.loadWeight, 0);
        let random = Math.random() * totalWeight;

        for (const candidate of candidates) {
          random -= candidate.capabilities.loadWeight;
          if (random <= 0) {
            return candidate;
          }
        }
        return candidates[0];

      case 'least_connections':
        // 选择最少使用的
        return candidates.reduce((least, current) => {
          const leastUsage = this.statistics.routingUsage.get(least.poolId) || 0;
          const currentUsage = this.statistics.routingUsage.get(current.poolId) || 0;
          return currentUsage < leastUsage ? current : least;
        });

      case 'random':
      default:
        // 随机选择
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  /**
   * 创建回退决策
   */
  private makeFallbackDecision(
    requestAnalysis: RequestAnalysisResult,
    error: any
  ): RoutingDecision {
    console.log('🔄 Making fallback routing decision...');

    // 寻找最可用的流水线池
    let bestCandidate: { poolId: string; capabilities: RoutingCapabilities } | null = null;
    let bestAvailability = 0;

    for (const [poolId, capabilities] of this.pipelinePools) {
      if (capabilities.availability > bestAvailability) {
        bestAvailability = capabilities.availability;
        bestCandidate = { poolId, capabilities };
      }
    }

    if (!bestCandidate) {
      throw new Error('No fallback candidates available');
    }

    this.statistics.fallbackDecisions++;

    const fallbackDecision: RoutingDecision = {
      targetRoutingId: bestCandidate.poolId,
      selectedPoolId: bestCandidate.poolId,
      matchResult: {
        isMatch: true,
        matchScore: bestAvailability,
        matchDetails: {
          capabilities: {
            modelSupport: true,
            tokenSupport: true,
            streamingSupport: true,
            toolsSupport: true,
            imagesSupport: true,
            multimodalSupport: true,
            modalitySupport: true,
            availability: true,
            region: true,
            usageLimits: true
          },
          scores: {
            capabilityScore: 0.5,
            performanceScore: bestCandidate.capabilities.performanceScore,
            costScore: 1 - bestCandidate.capabilities.costScore,
            priorityScore: bestCandidate.capabilities.priority / 100,
            overallScore: bestAvailability
          }
        },
        mismatchReasons: ['Fallback decision due to error']
      },
      metadata: {
        routingTime: 0,
        strategyUsed: 'fallback',
        decisionReason: error instanceof Error ? error.message : String(error),
        fallbackUsed: true
      }
    };

    return fallbackDecision;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) return; // 每分钟清理一次

    for (const [key, cache] of this.ruleCache.entries()) {
      if (cache.expires < now) {
        this.ruleCache.delete(key);
      }
    }

    this.lastCleanup = now;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(decision: RoutingDecision, decisionTime: number): void {
    this.statistics.totalDecisions++;
    this.statistics.successfulDecisions++;
    this.statistics.lastDecisionTime = Date.now();

    // 更新平均决策时间
    const totalTime = this.statistics.averageDecisionTime * (this.statistics.totalDecisions - 1);
    this.statistics.averageDecisionTime = (totalTime + decisionTime) / this.statistics.totalDecisions;

    // 更新虚拟模型使用统计
    const usage = this.statistics.routingUsage.get(decision.targetRoutingId) || 0;
    this.statistics.routingUsage.set(decision.targetRoutingId, usage + 1);

    // 更新负载均衡统计
    if (decision.metadata?.decisionReason === 'load_balancing') {
      this.statistics.loadBalancedDecisions++;
    }

    // 更新平均匹配分数
    const totalScore = this.statistics.averageMatchScore * (this.statistics.totalDecisions - 1);
    this.statistics.averageMatchScore = (totalScore + decision.matchResult.matchScore) / this.statistics.totalDecisions;

    // 更新决策中的路由时间
    if (decision.metadata) {
      decision.metadata.routingTime = decisionTime;
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): RoutingStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取所有路由规则
   */
  getRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取所有路由策略
   */
  getStrategies(): RoutingStrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 获取流水线池能力
   */
  getPipelinePoolCapabilities(): Map<string, RoutingCapabilities> {
    return new Map(this.pipelinePools);
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalDecisions: 0,
      averageDecisionTime: 0,
      successfulDecisions: 0,
      fallbackDecisions: 0,
      loadBalancedDecisions: 0,
      routingUsage: new Map(),
      ruleUsage: new Map(),
      averageMatchScore: 0,
      lastDecisionTime: 0
    };
  }

  /**
   * 销毁引擎并清理资源
   */
  destroy(): void {
    console.log('🧹 Destroying Routing Rules Engine...');

    this.rules.clear();
    this.strategies.clear();
    this.pipelinePools.clear();
    this.ruleCache.clear();
    this.resetStatistics();
  }
}
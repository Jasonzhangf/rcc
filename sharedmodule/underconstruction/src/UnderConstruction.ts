import { BaseModule } from '../../basemodule/src/BaseModule';
import { ModuleInfo } from '../../basemodule/src/interfaces/ModuleInfo';
import { v4 as uuidv4 } from 'uuid';
import {
  UnderConstructionFeature,
  UnderConstructionCall,
  UnderConstructionOptions,
  UnderConstructionStatistics,
  CallContext,
  CallLocation,
  UnderConstructionError
} from './interfaces/UnderConstructionTypes';

/**
 * UnderConstruction模块用于显式标记未完成的功能
 * 该模块帮助识别未完成的实现并追踪调用链
 * 
 * 使用场景：
 * 1. 替代mock站位，明确标识功能未实现
 * 2. 追踪调用位置，知道哪个文件的哪个函数调用了未完成功能
 * 3. 记录功能描述注释，说明该功能应该做什么
 * 4. 提供开发阶段的明确提示
 */
export class UnderConstruction extends BaseModule {
  private underConstructionFeatures: Map<string, UnderConstructionFeature> = new Map();
  private callHistory: Array<UnderConstructionCall> = [];

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: uuidv4(),
      type: 'underconstruction',
      name: 'UnderConstruction',
      version: '1.0.0',
      description: 'UnderConstruction class for marking unfinished functionality',
      metadata: {
        config: {
          enableTracking: true,
          maxHistorySize: 1000,
          throwOnCall: false,
          logToConsole: true
        }
      }
    };
    
    super(moduleInfo);
  }

  /**
   * 初始化UnderConstruction模块
   */
  public override async initialize(): Promise<void> {
    await super.initialize();
    
    if (this.info.metadata?.['config']?.enableTracking) {
      this.log('UnderConstruction模块已初始化，功能追踪已启用');
    } else {
      this.log('UnderConstruction模块已初始化，功能追踪已禁用');
    }
  }

  /**
   * 标记一个功能为未完成状态
   * @param featureName - 功能名称
   * @param description - 功能描述（说明这个功能应该做什么）
   * @param options - 配置选项
   */
  public markFeature(
    featureName: string, 
    description: string, 
    options: UnderConstructionOptions = {}
  ): void {
    const stack = new Error().stack;
    const callLocation = this.extractCallLocation(stack);
    
    const feature: UnderConstructionFeature = {
      name: featureName,
      description,
      intendedBehavior: options.intendedBehavior || description,
      priority: options.priority || 'medium',
      category: options.category || 'general',
      estimatedCompletion: options.estimatedCompletion,
      createdAt: Date.now(),
      createdBy: options.createdBy || 'unknown',
      callLocation,
      status: 'pending'
    };

    this.underConstructionFeatures.set(featureName, feature);
    
    if (this.info.metadata?.['config']?.logToConsole) {
      this.log(`功能 '${featureName}' 已标记为未完成状态`, {
        location: callLocation,
        description: description
      });
    }
  }

  /**
   * 声明调用了一个未完成的功能
   * @param featureName - 功能名称
   * @param context - 调用上下文信息
   * @throws Error - 如果配置为抛出异常
   */
  public callUnderConstructionFeature(featureName: string, context: CallContext = {}): void {
    const stack = new Error().stack;
    const callLocation = this.extractCallLocation(stack);
    
    const feature = this.underConstructionFeatures.get(featureName);
    if (!feature) {
      // 如果功能未预先标记，自动创建一个记录
      this.markFeature(featureName, '功能未预先描述', { category: 'auto-detected' });
    }

    const call: UnderConstructionCall = {
      featureName,
      timestamp: Date.now(),
      callLocation,
      context,
      feature: feature || this.underConstructionFeatures.get(featureName)!
    };

    this.recordCall(call);

    if (this.info.metadata?.['config']?.logToConsole) {
      this.log(`调用了未完成的功能: ${featureName}`, {
        location: callLocation,
        description: feature?.description || '功能描述未提供',
        context
      });
    }

    if (this.info.metadata?.['config']?.throwOnCall) {
      throw new UnderConstructionError(
        `功能 '${featureName}' 尚未完成\n` +
        `位置: ${callLocation}\n` +
        `描述: ${feature?.description || '功能描述未提供'}\n` +
        `预期行为: ${feature?.intendedBehavior || '预期行为未提供'}`,
        featureName,
        callLocation,
        call
      );
    }
  }

  /**
   * 获取所有未完成的功能
   * @returns 未完成功能列表
   */
  public getUnderConstructionFeatures(): UnderConstructionFeature[] {
    return Array.from(this.underConstructionFeatures.values());
  }

  /**
   * 根据名称获取未完成功能信息
   * @param featureName - 功能名称
   * @returns 功能信息或undefined
   */
  public getFeature(featureName: string): UnderConstructionFeature | undefined {
    return this.underConstructionFeatures.get(featureName);
  }

  /**
   * 获取调用历史
   * @param limit - 限制返回的记录数量
   * @returns 调用历史记录
   */
  public getCallHistory(limit?: number): UnderConstructionCall[] {
    const history = [...this.callHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * 完成一个功能（从未完成列表中移除）
   * @param featureName - 功能名称
   * @param completionNotes - 完成备注
   * @returns 是否成功移除
   */
  public completeFeature(featureName: string, completionNotes?: string): boolean {
    const feature = this.underConstructionFeatures.get(featureName);
    if (!feature) {
      return false;
    }

    feature.status = 'completed';
    feature.completedAt = Date.now();
    feature.completionNotes = completionNotes;

    if (this.info.metadata?.['config']?.logToConsole) {
      this.log(`功能 '${featureName}' 已完成`, { completionNotes });
    }

    return this.underConstructionFeatures.delete(featureName);
  }

  /**
   * 更新功能描述
   * @param featureName - 功能名称
   * @param newDescription - 新描述
   * @param newIntendedBehavior - 新的预期行为
   * @returns 是否成功更新
   */
  public updateFeatureDescription(
    featureName: string, 
    newDescription: string, 
    newIntendedBehavior?: string
  ): boolean {
    const feature = this.underConstructionFeatures.get(featureName);
    if (!feature) {
      return false;
    }

    feature.description = newDescription;
    if (newIntendedBehavior) {
      feature.intendedBehavior = newIntendedBehavior;
    }

    if (this.info.metadata?.['config']?.logToConsole) {
      this.log(`功能 '${featureName}' 描述已更新`);
    }

    return true;
  }

  /**
   * 获取统计信息
   * @returns 统计数据
   */
  public getStatistics(): UnderConstructionStatistics {
    const features = Array.from(this.underConstructionFeatures.values());
    const byCategory = features.reduce((acc, feature) => {
      acc[feature.category] = (acc[feature.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = features.reduce((acc, feature) => {
      acc[feature.priority] = (acc[feature.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentCalls = this.callHistory.filter(
      call => Date.now() - call.timestamp < 24 * 60 * 60 * 1000
    ).length;

    return {
      totalFeatures: features.length,
      totalCalls: this.callHistory.length,
      recentCalls24h: recentCalls,
      byCategory,
      byPriority,
      oldestFeature: features.length > 0 ? Math.min(...features.map(f => f.createdAt)) : undefined,
      newestFeature: features.length > 0 ? Math.max(...features.map(f => f.createdAt)) : undefined
    };
  }

  /**
   * 清除调用历史
   */
  public clearCallHistory(): void {
    this.callHistory = [];
    this.log('debug', '调用历史已清除');
  }

  /**
   * 销毁模块并清理资源
   */
  public override async destroy(): Promise<void> {
    this.log('info', '销毁UnderConstruction模块');
    
    this.underConstructionFeatures.clear();
    this.callHistory = [];
    
    await super.destroy();
  }

  /**
   * 记录调用历史
   * @param call - 调用记录
   */
  private recordCall(call: UnderConstructionCall): void {
    this.callHistory.push(call);
    
    // 限制历史记录大小
    const maxSize = this.info.metadata?.['config']?.maxHistorySize || 1000;
    if (this.callHistory.length > maxSize) {
      this.callHistory = this.callHistory.slice(-maxSize);
    }
  }

  /**
   * 从调用栈中提取调用位置
   * @param stack - 调用栈字符串
   * @returns 调用位置信息
   */
  private extractCallLocation(stack?: string): CallLocation {
    if (!stack) {
      return { file: 'unknown', line: 0, function: 'unknown' };
    }

    const stackLines = stack.split('\n');
    // 找到调用markFeature或callUnderConstructionFeature的栈帧
    const relevantLine = stackLines.find(line => 
      line.includes('.ts:') || line.includes('.js:')
    );

    if (!relevantLine) {
      return { file: 'unknown', line: 0, function: 'unknown' };
    }

    const match = relevantLine.match(/at\s+(?:.+?\s+)?(?:\(?\s*([^:]+):(\d+):(\d+)\s*\)?/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        fullStack: relevantLine.trim()
      };
    }

    return { file: 'unknown', line: 0, function: 'unknown' };
  }
}
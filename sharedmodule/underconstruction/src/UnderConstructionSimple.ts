import { BaseModule } from '../../basemodule/src/BaseModule';
import { ModuleInfo } from '../../basemodule/src/interfaces/ModuleInfo';
import { v4 as uuidv4 } from 'uuid';

export interface UnderConstructionFeature {
  name: string;
  description: string;
  intendedBehavior: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimatedCompletion?: string | Date;
  createdAt: number;
  createdBy: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface CallContext {
  caller?: string;
  parameters?: Record<string, any>;
  purpose?: string;
  additionalInfo?: Record<string, any>;
}

export interface UnderConstructionCall {
  id: string;
  featureName: string;
  timestamp: number;
  context: CallContext;
}

export interface UnderConstructionStatistics {
  totalFeatures: number;
  totalCalls: number;
  recentCalls24h: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export class UnderConstructionError extends Error {
  public readonly featureName: string;

  constructor(featureName: string, message: string) {
    super(message);
    this.name = 'UnderConstructionError';
    this.featureName = featureName;
  }
}

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

  public override async initialize(): Promise<void> {
    await super.initialize();
    this.log('UnderConstruction模块已初始化');
  }

  public markFeature(featureName: string, description: string, options: any = {}): void {
    const feature: UnderConstructionFeature = {
      name: featureName,
      description,
      intendedBehavior: options.intendedBehavior || '',
      priority: options.priority || 'medium',
      category: options.category || 'general',
      estimatedCompletion: options.estimatedCompletion,
      createdAt: Date.now(),
      createdBy: options.createdBy || 'unknown',
      status: 'pending'
    };

    this.underConstructionFeatures.set(featureName, feature);
    this.log(`功能 '${featureName}' 已标记为未完成状态`);
  }

  public callUnderConstructionFeature(featureName: string, context?: CallContext): void {
    const config = this.info.metadata?.['config'] as any;
    
    if (!this.underConstructionFeatures.has(featureName)) {
      this.markFeature(featureName, 'Auto-marked feature');
    }

    const call: UnderConstructionCall = {
      id: uuidv4(),
      featureName,
      timestamp: Date.now(),
      context: context || {}
    };

    this.callHistory.push(call);
    
    if (this.callHistory.length > (config?.maxHistorySize || 1000)) {
      this.callHistory = this.callHistory.slice(-config?.maxHistorySize || 1000);
    }

    if (config?.throwOnCall) {
      throw new UnderConstructionError(featureName, `功能 '${featureName}' 尚未完成`);
    }

    this.log(`调用了未完成的功能: ${featureName}`);
  }

  public getUnderConstructionFeatures(): UnderConstructionFeature[] {
    return Array.from(this.underConstructionFeatures.values());
  }

  public getFeature(featureName: string): UnderConstructionFeature | undefined {
    return this.underConstructionFeatures.get(featureName);
  }

  public getCallHistory(limit?: number): UnderConstructionCall[] {
    const history = this.callHistory.slice().reverse();
    return limit ? history.slice(0, limit) : history;
  }

  public completeFeature(featureName: string, completionNotes?: string): boolean {
    const feature = this.underConstructionFeatures.get(featureName);
    if (!feature) {
      return false;
    }

    feature.status = 'completed';
    this.log(`功能 '${featureName}' 已完成`);
    return true;
  }

  public updateFeatureDescription(featureName: string, newDescription: string, newIntendedBehavior?: string): boolean {
    const feature = this.underConstructionFeatures.get(featureName);
    if (!feature) {
      return false;
    }

    feature.description = newDescription;
    if (newIntendedBehavior) {
      feature.intendedBehavior = newIntendedBehavior;
    }

    this.log(`功能 '${featureName}' 描述已更新`);
    return true;
  }

  public getStatistics(): UnderConstructionStatistics {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentCalls = this.callHistory.filter(call => call.timestamp > dayAgo);
    
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    this.underConstructionFeatures.forEach(feature => {
      byCategory[feature.category] = (byCategory[feature.category] || 0) + 1;
      byPriority[feature.priority] = (byPriority[feature.priority] || 0) + 1;
    });

    return {
      totalFeatures: this.underConstructionFeatures.size,
      totalCalls: this.callHistory.length,
      recentCalls24h: recentCalls.length,
      byCategory,
      byPriority
    };
  }

  public clearCallHistory(): void {
    this.callHistory = [];
    this.log('调用历史已清除');
  }

  public override async destroy(): Promise<void> {
    this.log('销毁UnderConstruction模块');
    
    this.underConstructionFeatures.clear();
    this.callHistory = [];
    
    await super.destroy();
  }
}
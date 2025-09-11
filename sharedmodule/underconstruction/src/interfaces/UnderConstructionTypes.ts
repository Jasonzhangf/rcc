/**
 * 调用位置信息
 */
export interface CallLocation {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 列号 */
  column?: number;
  /** 函数名 */
  function?: string;
  /** 完整的栈信息 */
  fullStack?: string;
}

/**
 * 调用上下文信息
 */
export interface CallContext {
  /** 调用者信息 */
  caller?: string;
  /** 调用参数 */
  parameters?: Record<string, any>;
  /** 调用目的 */
  purpose?: string;
  /** 额外的上下文信息 */
  additionalInfo?: Record<string, any>;
}

/**
 * 未完成功能选项
 */
export interface UnderConstructionOptions {
  /** 预期行为描述 */
  intendedBehavior?: string;
  /** 优先级 */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** 功能分类 */
  category?: string;
  /** 预计完成时间 */
  estimatedCompletion?: string | Date;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 未完成功能信息
 */
export interface UnderConstructionFeature {
  /** 功能名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 预期行为 */
  intendedBehavior: string;
  /** 优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** 功能分类 */
  category: string;
  /** 预计完成时间 */
  estimatedCompletion?: string | Date;
  /** 创建时间 */
  createdAt: number;
  /** 创建者 */
  createdBy: string;
  /** 调用位置 */
  callLocation: CallLocation;
  /** 状态 */
  status: 'pending' | 'completed' | 'cancelled';
  /** 完成时间 */
  completedAt?: number;
  /** 完成备注 */
  completionNotes?: string;
}

/**
 * 未完成功能调用记录
 */
export interface UnderConstructionCall {
  /** 功能名称 */
  featureName: string;
  /** 调用时间戳 */
  timestamp: number;
  /** 调用位置 */
  callLocation: CallLocation;
  /** 调用上下文 */
  context: CallContext;
  /** 功能信息 */
  feature: UnderConstructionFeature;
}

/**
 * 统计信息
 */
export interface UnderConstructionStatistics {
  /** 总功能数 */
  totalFeatures: number;
  /** 总调用次数 */
  totalCalls: number;
  /** 24小时内调用次数 */
  recentCalls24h: number;
  /** 按分类统计 */
  byCategory: Record<string, number>;
  /** 按优先级统计 */
  byPriority: Record<string, number>;
  /** 最旧的功能创建时间 */
  oldestFeature?: number;
  /** 最新的功能创建时间 */
  newestFeature?: number;
}

/**
 * UnderConstruction错误类
 */
export class UnderConstructionError extends Error {
  /** 功能名称 */
  public readonly featureName: string;
  /** 调用位置 */
  public readonly callLocation: CallLocation;
  /** 调用记录 */
  public readonly call: UnderConstructionCall;

  constructor(
    message: string,
    featureName: string,
    callLocation: CallLocation,
    call: UnderConstructionCall
  ) {
    super(message);
    this.name = 'UnderConstructionError';
    this.featureName = featureName;
    this.callLocation = callLocation;
    this.call = call;
  }
}

/**
 * 功能优先级映射
 */
export const PRIORITY_ORDER: Record<string, number> = {
  'low': 1,
  'medium': 2,
  'high': 3,
  'critical': 4
};

/**
 * 默认功能分类
 */
export const DEFAULT_CATEGORIES = [
  'general',
  'api',
  'ui',
  'database',
  'authentication',
  'authorization',
  'validation',
  'performance',
  'security',
  'testing',
  'documentation',
  'auto-detected'
] as const;
import { UnderConstruction } from 'rcc-underconstruction';

/**
 * RCC项目UnderConstruction模块集成示例
 *
 * 此文件展示了如何在RCC项目中正确使用UnderConstruction模块
 * 来替代mock占位符，显式声明未完成功能
 */

// 创建全局UnderConstruction实例
export const underConstruction = new UnderConstruction();

/**
 * 初始化UnderConstruction模块
 * 应该在应用启动时调用此函数
 */
export async function initUnderConstruction() {
  const moduleInfo = underConstruction.getInfo();

  // 根据环境配置不同的行为
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  moduleInfo.metadata = {
    ...moduleInfo.metadata,
    config: {
      enableTracking: !isProduction, // 生产环境禁用追踪
      maxHistorySize: isTest ? 100 : 1000, // 测试环境限制历史记录
      throwOnCall: isTest, // 测试时抛出异常便于发现
      logToConsole: !isProduction, // 生产环境禁用控制台输出
    },
  };

  await underConstruction.initialize();

  // 预标记已知的未完成功能
  await markKnownFeatures();

  console.log('UnderConstruction模块已初始化');
}

/**
 * 预标记已知的未完成功能
 */
async function markKnownFeatures() {
  // 认证相关功能
  underConstruction.markFeature('oauth2-integration', 'OAuth2集成认证', {
    intendedBehavior: '集成第三方OAuth2提供商，支持Google、GitHub等登录',
    priority: 'high',
    category: 'authentication',
    estimatedCompletion: '2024-12-15',
    createdBy: 'auth-team',
  });

  // 搜索功能
  underConstruction.markFeature('advanced-search', '高级搜索功能', {
    intendedBehavior: '支持全文搜索、过滤器、排序和分页功能',
    priority: 'medium',
    category: 'search',
    estimatedCompletion: '2024-12-20',
    createdBy: 'search-team',
  });

  // 实时功能
  underConstruction.markFeature('real-time-notifications', '实时通知系统', {
    intendedBehavior: '基于WebSocket的实时通知推送，支持多种通知类型',
    priority: 'high',
    category: 'notifications',
    estimatedCompletion: '2024-12-25',
    createdBy: 'notifications-team',
  });

  // 数据分析
  underConstruction.markFeature('analytics-dashboard', '数据分析仪表板', {
    intendedBehavior: '提供用户行为分析、系统性能监控等数据可视化',
    priority: 'medium',
    category: 'analytics',
    estimatedCompletion: '2025-01-10',
    createdBy: 'analytics-team',
  });

  // API增强
  underConstruction.markFeature('rate-limiting', 'API限流功能', {
    intendedBehavior: '实现API请求限流，防止滥用和攻击',
    priority: 'critical',
    category: 'security',
    estimatedCompletion: '2024-12-10',
    createdBy: 'security-team',
  });
}

/**
 * 用户服务示例 - 展示如何在类中使用UnderConstruction
 */
export class UserService {
  private underConstruction = underConstruction;

  /**
   * 用户登录功能
   */
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    // 声明调用了未完成的OAuth2集成功能
    this.underConstruction.callUnderConstructionFeature('oauth2-integration', {
      caller: 'UserService.login',
      parameters: { username, password },
      purpose: '用户登录认证',
      additionalInfo: {
        authType: 'password',
        timestamp: Date.now(),
      },
    });

    // 临时实现：返回模拟token
    return {
      token: `temp-token-${Date.now()}`,
      user: {
        id: 1,
        username,
        email: `${username}@example.com`,
      },
    };
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, profileData: any): Promise<any> {
    // 声明调用了未完成的资料更新功能
    this.underConstruction.callUnderConstructionFeature('profile-update', {
      caller: 'UserService.updateProfile',
      parameters: { userId, profileData },
      purpose: '更新用户资料信息',
    });

    // 临时实现：返回更新后的资料
    return {
      ...profileData,
      userId,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * 搜索服务示例
 */
export class SearchService {
  private underConstruction = underConstruction;

  /**
   * 高级搜索功能
   */
  async searchAdvanced(query: string, filters: any = {}): Promise<any[]> {
    // 声明调用了未完成的高级搜索功能
    this.underConstruction.callUnderConstructionFeature('advanced-search', {
      caller: 'SearchService.searchAdvanced',
      parameters: { query, filters },
      purpose: '执行高级搜索',
      additionalInfo: {
        queryType: 'advanced',
        filterCount: Object.keys(filters).length,
      },
    });

    // 临时实现：返回基本搜索结果
    return this.basicSearch(query);
  }

  /**
   * 基本搜索功能（已实现）
   */
  private async basicSearch(query: string): Promise<any[]> {
    // 这里是已实现的基本搜索逻辑
    return [
      { id: 1, title: `搜索结果1: ${query}`, relevance: 0.9 },
      { id: 2, title: `搜索结果2: ${query}`, relevance: 0.7 },
    ];
  }
}

/**
 * 通知服务示例
 */
export class NotificationService {
  private underConstruction = underConstruction;

  /**
   * 发送实时通知
   */
  async sendRealTimeNotification(userId: string, message: string): Promise<void> {
    // 声明调用了未完成的实时通知功能
    this.underConstruction.callUnderConstructionFeature('real-time-notifications', {
      caller: 'NotificationService.sendRealTimeNotification',
      parameters: { userId, message },
      purpose: '发送实时通知给用户',
      additionalInfo: {
        notificationType: 'real-time',
        priority: 'normal',
      },
    });

    // 临时实现：记录到日志
    console.log(`[NOTIFICATION] To ${userId}: ${message}`);
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(userIds: string[], message: string): Promise<void> {
    // 声明调用了未完成的批量通知功能
    this.underConstruction.callUnderConstructionFeature('batch-notifications', {
      caller: 'NotificationService.sendBatchNotifications',
      parameters: { userIds, message },
      purpose: '批量发送通知给多个用户',
      additionalInfo: {
        notificationType: 'batch',
        userCount: userIds.length,
      },
    });

    // 临时实现：逐个发送
    for (const userId of userIds) {
      await this.sendRealTimeNotification(userId, message);
    }
  }
}

/**
 * API中间件示例 - 展示如何在Express中间件中使用
 */
export function underConstructionMiddleware(req: any, res: any, next: any) {
  // 如果请求的路径包含未完成的功能，返回501状态
  const underConstructionPaths = [
    '/api/oauth2/',
    '/api/notifications/real-time/',
    '/api/search/advanced/',
    '/api/analytics/',
  ];

  const isUnderConstruction = underConstructionPaths.some((path) => req.path.startsWith(path));

  if (isUnderConstruction) {
    const featureName = req.path.split('/')[2]; // 从路径提取功能名

    // 声明调用了未完成的功能
    underConstruction.callUnderConstructionFeature(featureName, {
      caller: `${req.method} ${req.path}`,
      parameters: req.body,
      purpose: 'API端点调用',
    });

    return res.status(501).json({
      error: 'Not Implemented',
      message: '该功能尚未完成',
      feature: featureName,
      documentation: '请查看项目文档了解进度',
    });
  }

  next();
}

/**
 * 定期检查未完成功能的监控函数
 */
export function monitorUnderConstructionFeatures() {
  setInterval(() => {
    const stats = underConstruction.getStatistics();

    console.log('=== 未完成功能统计 ===');
    console.log(`总功能数: ${stats.totalFeatures}`);
    console.log(`总调用次数: ${stats.totalCalls}`);
    console.log(`24小时内调用次数: ${stats.recentCalls24h}`);
    console.log('按分类统计:', stats.byCategory);
    console.log('按优先级统计:', stats.byPriority);

    // 检查是否有高优先级功能被频繁调用
    const criticalFeatures = underConstruction
      .getUnderConstructionFeatures()
      .filter((f) => f.priority === 'critical');

    if (criticalFeatures.length > 0) {
      console.warn(`⚠️  发现 ${criticalFeatures.length} 个未完成的关键功能:`);
      criticalFeatures.forEach((feature) => {
        console.warn(`  - ${feature.name}: ${feature.description}`);
      });
    }

    // 检查是否有功能被频繁调用
    if (stats.recentCalls24h > 100) {
      console.warn(`⚠️  未完成功能24小时内调用次数过多: ${stats.recentCalls24h}`);
    }
  }, 60000); // 每分钟检查一次
}

/**
 * 获取未完成功能报告
 */
export function getUnderConstructionReport() {
  const stats = underConstruction.getStatistics();
  const features = underConstruction.getUnderConstructionFeatures();
  const recentCalls = underConstruction.getCallHistory(10);

  return {
    summary: {
      totalFeatures: stats.totalFeatures,
      totalCalls: stats.totalCalls,
      recentCalls24h: stats.recentCalls24h,
      byCategory: stats.byCategory,
      byPriority: stats.byPriority,
    },
    features: features.map((f) => ({
      name: f.name,
      description: f.description,
      priority: f.priority,
      category: f.category,
      createdAt: new Date(f.createdAt).toISOString(),
      estimatedCompletion: f.estimatedCompletion,
      status: f.status,
    })),
    recentCalls: recentCalls.map((call) => ({
      featureName: call.featureName,
      timestamp: new Date(call.timestamp).toISOString(),
      caller: call.context.caller,
      purpose: call.context.purpose,
    })),
  };
}

// 导出实例化的服务
export const userService = new UserService();
export const searchService = new SearchService();
export const notificationService = new NotificationService();

// 导出初始化函数
export default {
  initUnderConstruction,
  underConstruction,
  userService,
  searchService,
  notificationService,
  underConstructionMiddleware,
  monitorUnderConstructionFeatures,
  getUnderConstructionReport,
};

/**
 * 替换Mock占位符为UnderConstruction模块的示例
 *
 * 此文件展示了如何将传统的mock占位符、TODO注释等
 * 替换为UnderConstruction模块的显式声明
 */

import { underConstruction } from './underConstructionIntegration';

// =============================================================================
// 1. 替换简单的TODO注释和空实现
// =============================================================================

/**
 * ❌ 传统方式：使用TODO注释和空实现
 */
export class LegacyUserService {
  // TODO: 实现用户认证功能
  authenticateUser(username: string, password: string): string {
    // TODO: 实现真正的认证逻辑
    return 'temp-token'; // 临时返回值
  }

  // FIXME: 需要实现用户资料更新
  updateUserProfile(userId: string, profile: any): any {
    // 这里应该实现资料更新逻辑
    throw new Error('Not implemented');
  }
}

/**
 * ✅ 推荐方式：使用UnderConstruction模块显式声明
 */
export class ModernUserService {
  private underConstruction = underConstruction;

  /**
   * 用户认证功能
   */
  authenticateUser(username: string, password: string): string {
    // 显式声明调用了未完成的认证功能
    this.underConstruction.callUnderConstructionFeature('user-authentication', {
      caller: 'ModernUserService.authenticateUser',
      parameters: { username, password },
      purpose: '用户登录认证',
      additionalInfo: {
        authType: 'password',
        timestamp: Date.now(),
      },
    });

    // 返回临时值，但明确说明了这是临时实现
    return 'temp-token';
  }

  /**
   * 用户资料更新功能
   */
  updateUserProfile(userId: string, profile: any): any {
    // 显式声明调用了未完成的资料更新功能
    this.underConstruction.callUnderConstructionFeature('profile-update', {
      caller: 'ModernUserProfile.updateUserProfile',
      parameters: { userId, profile },
      purpose: '更新用户资料信息',
    });

    // 临时实现，但会记录调用情况
    return {
      ...profile,
      userId,
      updatedAt: new Date().toISOString(),
      note: '此功能尚未完成，使用临时实现',
    };
  }
}

// =============================================================================
// 2. 替换API端点中的占位符
// =============================================================================

/**
 * ❌ 传统方式：Express路由中的硬编码占位符
 */
import { Router } from 'express';

const legacyRouter = Router();

legacyRouter.post('/api/users/2fa', (req, res) => {
  // TODO: 实现二因素认证
  res.status(501).json({
    error: 'Not Implemented',
    message: '二因素认证功能尚未实现',
  });
});

legacyRouter.get('/api/analytics/dashboard', (req, res) => {
  // FIXME: 需要实现数据分析仪表板
  res.status(501).json({
    error: 'Not Implemented',
    message: '数据分析仪表板功能尚未实现',
  });
});

/**
 * ✅ 推荐方式：使用UnderConstruction模块的API中间件
 */
const modernRouter = Router();

// 使用UnderConstruction中间件
modernRouter.use('/api', (req, res, next) => {
  const underConstructionPaths = [
    '/users/2fa',
    '/analytics/dashboard',
    '/notifications/real-time',
    '/search/advanced',
  ];

  const isUnderConstruction = underConstructionPaths.some((path) => req.path.startsWith(path));

  if (isUnderConstruction) {
    const featureName = req.path.split('/')[2];

    // 显式声明调用了未完成的功能
    underConstruction.callUnderConstructionFeature(featureName, {
      caller: `${req.method} ${req.path}`,
      parameters: req.body,
      purpose: 'API端点调用',
    });

    return res.status(501).json({
      error: 'Under Construction',
      message: '该功能正在开发中',
      feature: featureName,
      documentation: '请查看项目文档了解开发进度',
      estimatedCompletion: underConstruction.getFeature(featureName)?.estimatedCompletion,
    });
  }

  next();
});

// 正常的API路由
modernRouter.post('/api/users/2fa', (req, res) => {
  // 这个请求会被上面的中间件拦截并处理
  // 这里不需要写任何占位符代码
});

// =============================================================================
// 3. 替换复杂业务逻辑中的占位符
// =============================================================================

/**
 * ❌ 传统方式：复杂的条件判断和注释
 */
export class LegacyOrderService {
  processOrder(order: any): any {
    // 处理订单逻辑

    // TODO: 实现高级税务计算
    if (order.requiresTaxCalculation) {
      // 这里应该实现复杂的税务计算逻辑
      order.tax = 'temp-tax-calculation';
    }

    // FIXME: 需要实现库存检查
    if (order.requiresInventoryCheck) {
      // 这里应该检查库存并预留
      order.inventoryStatus = 'temp-inventory-check';
    }

    // TODO: 实现通知系统
    if (order.requiresNotification) {
      // 这里应该发送订单确认通知
      console.log('通知功能未实现');
    }

    return order;
  }
}

/**
 * ✅ 推荐方式：使用UnderConstruction模块管理复杂功能
 */
export class ModernOrderService {
  private underConstruction = underConstruction;

  processOrder(order: any): any {
    // 处理订单逻辑

    // 税务计算功能
    if (order.requiresTaxCalculation) {
      this.underConstruction.callUnderConstructionFeature('tax-calculation', {
        caller: 'ModernOrderService.processOrder',
        parameters: { order },
        purpose: '计算订单税费',
        additionalInfo: {
          taxType: 'sales_tax',
          orderId: order.id,
        },
      });

      order.tax = this.calculateTemporaryTax(order);
    }

    // 库存检查功能
    if (order.requiresInventoryCheck) {
      this.underConstruction.callUnderConstructionFeature('inventory-check', {
        caller: 'ModernOrderService.processOrder',
        parameters: { order },
        purpose: '检查并预留库存',
        additionalInfo: {
          checkType: 'reservation',
          orderId: order.id,
        },
      });

      order.inventoryStatus = this.performTemporaryInventoryCheck(order);
    }

    // 通知系统
    if (order.requiresNotification) {
      this.underConstruction.callUnderConstructionFeature('notification-system', {
        caller: 'ModernOrderService.processOrder',
        parameters: { order },
        purpose: '发送订单确认通知',
        additionalInfo: {
          notificationType: 'order_confirmation',
          orderId: order.id,
        },
      });

      this.sendTemporaryNotification(order);
    }

    return order;
  }

  private calculateTemporaryTax(order: any): number {
    // 临时税务计算逻辑
    return order.subtotal * 0.1; // 简单的10%税率
  }

  private performTemporaryInventoryCheck(order: any): string {
    // 临时库存检查逻辑
    return 'reserved_temporarily';
  }

  private sendTemporaryNotification(order: any): void {
    // 临时通知逻辑
    console.log(`[TEMP NOTIFICATION] Order ${order.id} processed`);
  }
}

// =============================================================================
// 4. 替换测试中的占位符
// =============================================================================

/**
 * ❌ 传统方式：测试中的模拟和跳过
 */
import { describe, it, expect } from '@jest/globals';

describe('LegacyUserService', () => {
  it('should authenticate user', () => {
    const service = new LegacyUserService();
    const result = service.authenticateUser('test', 'password');

    // 只能测试临时返回值
    expect(result).toBe('temp-token');
  });

  it.skip('should update user profile', () => {
    // 跳过未实现功能的测试
    // TODO: 实现此测试
  });
});

/**
 * ✅ 推荐方式：使用UnderConstruction模块的测试功能
 */
describe('ModernUserService', () => {
  let userService: ModernUserService;

  beforeEach(() => {
    userService = new ModernUserService();
  });

  it('should track underconstruction feature calls', () => {
    // 调用未完成功能
    userService.authenticateUser('test', 'password');

    // 验证是否正确记录了调用
    const calls = underConstruction.getCallHistory();
    expect(calls).toHaveLength(1);
    expect(calls[0].featureName).toBe('user-authentication');
    expect(calls[0].context.caller).toBe('ModernUserService.authenticateUser');
    expect(calls[0].context.parameters).toEqual({
      username: 'test',
      password: 'password',
    });
  });

  it('should throw error when configured to do so', async () => {
    // 配置为抛出异常
    const moduleInfo = underConstruction.getInfo();
    moduleInfo.metadata = {
      ...moduleInfo.metadata,
      config: {
        ...moduleInfo.metadata?.config,
        throwOnCall: true,
      },
    };
    await underConstruction.initialize();

    // 验证抛出异常
    expect(() => {
      userService.authenticateUser('test', 'password');
    }).toThrow('UnderConstructionError');
  });

  it('should provide meaningful statistics', () => {
    // 调用多个功能
    userService.authenticateUser('test', 'password');
    userService.updateUserProfile('1', { name: 'Test User' });

    // 验证统计信息
    const stats = underConstruction.getStatistics();
    expect(stats.totalFeatures).toBeGreaterThan(0);
    expect(stats.totalCalls).toBe(2);
    expect(stats.byPriority).toBeDefined();
  });
});

// =============================================================================
// 5. 替换配置文件中的占位符
// =============================================================================

/**
 * ❌ 传统方式：配置文件中的注释占位符
 */
const legacyConfig = {
  // TODO: 配置数据库连接
  database: {
    host: 'localhost',
    // TODO: 添加端口配置
    // port: 5432,
    password: 'temp-password', // FIXME: 使用环境变量
  },

  // TODO: 配置缓存系统
  cache: {
    // 这里应该配置Redis或其他缓存
    enabled: false,
  },
};

/**
 * ✅ 推荐方式：使用UnderConstruction模块声明配置功能
 */
const modernConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    password: process.env.DB_PASSWORD || 'default-password',
  },

  cache: {
    enabled: false,
  },
};

// 在应用启动时声明未完成的配置功能
export async function initConfigFeatures() {
  underConstruction.markFeature('database-connection-pool', '数据库连接池配置', {
    intendedBehavior: '配置数据库连接池以优化性能',
    priority: 'high',
    category: 'infrastructure',
    estimatedCompletion: '2024-12-15',
  });

  underConstruction.markFeature('redis-cache', 'Redis缓存系统', {
    intendedBehavior: '集成Redis缓存系统提高响应速度',
    priority: 'medium',
    category: 'infrastructure',
    estimatedCompletion: '2024-12-20',
  });

  console.log('配置功能已标记为UnderConstruction');
}

// =============================================================================
// 使用示例和最佳实践总结
// =============================================================================

/**
 * 使用UnderConstruction模块的主要优势：
 *
 * 1. **显式声明** - 明确标识哪些功能未完成，而不是隐藏在注释中
 * 2. **调用追踪** - 记录所有调用，便于分析使用情况
 * 3. **优先级管理** - 可以设置功能优先级，帮助团队安排开发顺序
 * 4. **环境配置** - 不同环境可以有不同的行为（开发/测试/生产）
 * 5. **统计分析** - 提供详细的使用统计和趋势分析
 * 6. **测试友好** - 便于编写测试验证调用行为
 * 7. **团队协作** - 统一的标准，便于团队协作
 * 8. **文档化** - 功能描述本身就是文档
 */

export {
  LegacyUserService,
  ModernUserService,
  LegacyOrderService,
  ModernOrderService,
  legacyRouter,
  modernRouter,
  legacyConfig,
  modernConfig,
  initConfigFeatures,
};

/**
 * RCC UnderConstruction 模块快速开始示例
 *
 * 这是一个简单的示例，展示如何在项目中快速开始使用UnderConstruction模块
 */

import { UnderConstruction } from 'rcc-underconstruction';

// 1. 创建UnderConstruction实例
const underConstruction = new UnderConstruction();

// 2. 初始化（在应用启动时调用）
async function initUnderConstruction() {
  const moduleInfo = underConstruction.getInfo();

  // 配置模块行为
  moduleInfo.metadata = {
    ...moduleInfo.metadata,
    config: {
      enableTracking: true,
      maxHistorySize: 1000,
      throwOnCall: false,
      logToConsole: true,
    },
  };

  await underConstruction.initialize();
  console.log('✅ UnderConstruction模块已初始化');
}

// 3. 标记未完成功能
function markFeatures() {
  // 标记一个高优先级的认证功能
  underConstruction.markFeature('user-authentication', '用户认证功能', {
    intendedBehavior: '验证用户凭据并返回认证令牌',
    priority: 'high',
    category: 'authentication',
    estimatedCompletion: '2024-12-31',
  });

  // 标记一个中等优先级的搜索功能
  underConstruction.markFeature('advanced-search', '高级搜索功能', {
    intendedBehavior: '支持全文搜索、过滤器和排序',
    priority: 'medium',
    category: 'search',
  });

  console.log('✅ 已标记未完成功能');
}

// 4. 在服务中使用
class UserService {
  private underConstruction = underConstruction;

  login(username: string, password: string): string {
    // 声明调用了未完成的认证功能
    this.underConstruction.callUnderConstructionFeature('user-authentication', {
      caller: 'UserService.login',
      parameters: { username, password },
      purpose: '用户登录',
    });

    // 返回临时值
    return 'temp-token';
  }
}

class SearchService {
  private underConstruction = underConstruction;

  search(query: string, filters: any = {}): any[] {
    // 声明调用了未完成的搜索功能
    this.underConstruction.callUnderConstructionFeature('advanced-search', {
      caller: 'SearchService.search',
      parameters: { query, filters },
      purpose: '执行搜索',
    });

    // 返回临时结果
    return [{ id: 1, title: `搜索结果: ${query}` }];
  }
}

// 5. 监控和统计
function showStats() {
  const stats = underConstruction.getStatistics();
  const features = underConstruction.getUnderConstructionFeatures();
  const recentCalls = underConstruction.getCallHistory(5);

  console.log('\n📊 统计信息:');
  console.log(`- 未完成功能: ${stats.totalFeatures}`);
  console.log(`- 总调用次数: ${stats.totalCalls}`);
  console.log(`- 24小时内调用: ${stats.recentCalls24h}`);

  console.log('\n🔧 未完成功能:');
  features.forEach((feature) => {
    console.log(`- ${feature.name}: ${feature.description} (${feature.priority})`);
  });

  console.log('\n📞 最近调用:');
  recentCalls.forEach((call) => {
    console.log(`- ${call.featureName} 被 ${call.context.caller} 调用`);
  });
}

// 6. 完成功能
function completeFeature(featureName: string) {
  const success = underConstruction.completeFeature(featureName, '功能已完成并测试通过');
  if (success) {
    console.log(`✅ 功能 ${featureName} 已完成`);
  } else {
    console.log(`❌ 功能 ${featureName} 未找到`);
  }
}

// 示例使用
async function runExample() {
  try {
    // 初始化
    await initUnderConstruction();

    // 标记功能
    markFeatures();

    // 创建服务
    const userService = new UserService();
    const searchService = new SearchService();

    // 使用服务（会触发UnderConstruction记录）
    console.log('\n🚀 使用服务...');
    userService.login('user1', 'password123');
    searchService.search('test query');
    userService.login('user2', 'password456');

    // 显示统计
    showStats();

    // 完成一个功能
    console.log('\n🎯 完成功能...');
    completeFeature('advanced-search');

    // 再次显示统计
    showStats();
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 导出以供其他模块使用
export {
  underConstruction,
  initUnderConstruction,
  markFeatures,
  UserService,
  SearchService,
  showStats,
  completeFeature,
  runExample,
};

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

import { UnderConstruction } from '../src/UnderConstruction';
import { UnderConstructionError, PRIORITY_ORDER, DEFAULT_CATEGORIES } from '../src/interfaces/UnderConstructionTypes';

describe('UnderConstruction', () => {
  let underConstruction: UnderConstruction;

  beforeEach(() => {
    underConstruction = new UnderConstruction();
  });

  afterEach(async () => {
    await underConstruction.destroy();
  });

  describe('初始化', () => {
    it('应该正确初始化模块', async () => {
      await underConstruction.initialize();
      const moduleInfo = underConstruction.getInfo();
      
      expect(moduleInfo.name).toBe('UnderConstruction');
      expect(moduleInfo.version).toBe('1.0.0');
      expect(moduleInfo.description).toBe('UnderConstruction class for marking unfinished functionality');
    });

    it('应该启用追踪功能', async () => {
      await underConstruction.initialize();
      const stats = underConstruction.getStatistics();
      
      expect(stats.totalFeatures).toBe(0);
      expect(stats.totalCalls).toBe(0);
    });
  });

  describe('功能标记', () => {
    beforeEach(async () => {
      await underConstruction.initialize();
    });

    it('应该能够标记功能为未完成状态', () => {
      const featureName = 'test-feature';
      const description = '这是一个测试功能';
      
      underConstruction.markFeature(featureName, description);
      
      const features = underConstruction.getUnderConstructionFeatures();
      expect(features).toHaveLength(1);
      expect(features[0].name).toBe(featureName);
      expect(features[0].description).toBe(description);
      expect(features[0].status).toBe('pending');
    });

    it('应该能够设置功能选项', () => {
      const featureName = 'test-feature';
      const options = {
        intendedBehavior: '应该返回处理后的数据',
        priority: 'high' as const,
        category: 'api',
        estimatedCompletion: '2024-12-31',
        createdBy: 'developer1'
      };
      
      underConstruction.markFeature(featureName, '测试功能', options);
      
      const feature = underConstruction.getFeature(featureName);
      expect(feature).toBeDefined();
      expect(feature!.intendedBehavior).toBe(options.intendedBehavior);
      expect(feature!.priority).toBe(options.priority);
      expect(feature!.category).toBe(options.category);
      expect(feature!.estimatedCompletion).toBe(options.estimatedCompletion);
      expect(feature!.createdBy).toBe(options.createdBy);
    });

    it('应该能够更新功能描述', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '原始描述');
      
      const success = underConstruction.updateFeatureDescription(
        featureName, 
        '更新后的描述', 
        '更新的预期行为'
      );
      
      expect(success).toBe(true);
      
      const feature = underConstruction.getFeature(featureName);
      expect(feature!.description).toBe('更新后的描述');
      expect(feature!.intendedBehavior).toBe('更新的预期行为');
    });

    it('应该能够完成功能', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      const success = underConstruction.completeFeature(featureName, '功能已完成');
      
      expect(success).toBe(true);
      
      const features = underConstruction.getUnderConstructionFeatures();
      expect(features).toHaveLength(0);
    });
  });

  describe('功能调用', () => {
    beforeEach(async () => {
      await underConstruction.initialize();
    });

    it('应该能够声明调用未完成功能', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      underConstruction.callUnderConstructionFeature(featureName, {
        caller: 'test-function',
        purpose: '测试调用'
      });
      
      const callHistory = underConstruction.getCallHistory();
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].featureName).toBe(featureName);
      expect(callHistory[0].context.caller).toBe('test-function');
      expect(callHistory[0].context.purpose).toBe('测试调用');
    });

    it('应该自动创建未标记的功能记录', () => {
      const featureName = 'auto-detected-feature';
      
      underConstruction.callUnderConstructionFeature(featureName, {
        caller: 'test-function'
      });
      
      const feature = underConstruction.getFeature(featureName);
      expect(feature).toBeDefined();
      expect(feature!.description).toBe('功能未预先描述');
      expect(feature!.category).toBe('auto-detected');
      
      const callHistory = underConstruction.getCallHistory();
      expect(callHistory).toHaveLength(1);
    });

    it('应该在配置为抛出异常时抛出UnderConstructionError', async () => {
      // 重新创建模块，配置为抛出异常
      await underConstruction.destroy();
      underConstruction = new UnderConstruction();
      
      // 修改配置
      const moduleInfo = underConstruction.getInfo();
      if (moduleInfo.config) {
        moduleInfo.config.throwOnCall = true;
        moduleInfo.config.logToConsole = false;
      }
      
      await underConstruction.initialize();
      
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      expect(() => {
        underConstruction.callUnderConstructionFeature(featureName);
      }).toThrow(UnderConstructionError);
    });

    it('应该能够限制调用历史大小', () => {
      // 配置小历史记录大小
      const moduleInfo = underConstruction.getInfo();
      if (moduleInfo.config) {
        moduleInfo.config.maxHistorySize = 2;
      }
      
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      // 调用多次
      for (let i = 0; i < 5; i++) {
        underConstruction.callUnderConstructionFeature(featureName, { callId: i });
      }
      
      const callHistory = underConstruction.getCallHistory();
      expect(callHistory).toHaveLength(2);
      expect(callHistory[0].context.callId).toBe(3);
      expect(callHistory[1].context.callId).toBe(4);
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await underConstruction.initialize();
    });

    it('应该能够生成正确的统计信息', () => {
      // 添加多个功能
      underConstruction.markFeature('feature1', '功能1', { category: 'api', priority: 'high' });
      underConstruction.markFeature('feature2', '功能2', { category: 'ui', priority: 'medium' });
      underConstruction.markFeature('feature3', '功能3', { category: 'api', priority: 'low' });
      
      // 调用一些功能
      underConstruction.callUnderConstructionFeature('feature1');
      underConstruction.callUnderConstructionFeature('feature2');
      underConstruction.callUnderConstructionFeature('feature1');
      
      const stats = underConstruction.getStatistics();
      
      expect(stats.totalFeatures).toBe(3);
      expect(stats.totalCalls).toBe(3);
      expect(stats.byCategory).toEqual({
        'api': 2,
        'ui': 1
      });
      expect(stats.byPriority).toEqual({
        'high': 1,
        'medium': 1,
        'low': 1
      });
      expect(stats.oldestFeature).toBeDefined();
      expect(stats.newestFeature).toBeDefined();
    });

    it('应该能够计算24小时内调用次数', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      // 调用功能
      underConstruction.callUnderConstructionFeature(featureName);
      
      const stats = underConstruction.getStatistics();
      expect(stats.recentCalls24h).toBe(1);
    });
  });

  describe('调用位置追踪', () => {
    beforeEach(async () => {
      await underConstruction.initialize();
    });

    it('应该能够追踪调用位置', () => {
      const featureName = 'test-feature';
      
      underConstruction.markFeature(featureName, '测试功能');
      
      const feature = underConstruction.getFeature(featureName);
      expect(feature).toBeDefined();
      expect(feature!.callLocation.file).toContain('UnderConstruction.test.ts');
      expect(feature!.callLocation.line).toBeGreaterThan(0);
    });

    it('应该能够追踪功能调用的位置', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      underConstruction.callUnderConstructionFeature(featureName);
      
      const callHistory = underConstruction.getCallHistory();
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].callLocation.file).toContain('UnderConstruction.test.ts');
      expect(callHistory[0].callLocation.line).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await underConstruction.initialize();
    });

    it('应该正确处理不存在的功能', () => {
      const success = underConstruction.completeFeature('non-existent-feature');
      expect(success).toBe(false);
      
      const success2 = underConstruction.updateFeatureDescription('non-existent-feature', '新描述');
      expect(success2).toBe(false);
    });

    it('应该能够清除调用历史', () => {
      const featureName = 'test-feature';
      underConstruction.markFeature(featureName, '测试功能');
      
      underConstruction.callUnderConstructionFeature(featureName);
      underConstruction.callUnderConstructionFeature(featureName);
      
      expect(underConstruction.getCallHistory()).toHaveLength(2);
      
      underConstruction.clearCallHistory();
      
      expect(underConstruction.getCallHistory()).toHaveLength(0);
    });
  });

  describe('模块生命周期', () => {
    it('应该正确销毁模块', async () => {
      await underConstruction.initialize();
      
      // 添加一些功能和调用记录
      underConstruction.markFeature('test-feature', '测试功能');
      underConstruction.callUnderConstructionFeature('test-feature');
      
      await underConstruction.destroy();
      
      // 验证资源已清理
      expect(underConstruction.getUnderConstructionFeatures()).toHaveLength(0);
      expect(underConstruction.getCallHistory()).toHaveLength(0);
    });
  });

  describe('工具函数', () => {
    it('应该提供正确的优先级顺序', () => {
      expect(PRIORITY_ORDER['low']).toBe(1);
      expect(PRIORITY_ORDER['medium']).toBe(2);
      expect(PRIORITY_ORDER['high']).toBe(3);
      expect(PRIORITY_ORDER['critical']).toBe(4);
    });

    it('应该提供默认分类', () => {
      expect(DEFAULT_CATEGORIES).toContain('general');
      expect(DEFAULT_CATEGORIES).toContain('api');
      expect(DEFAULT_CATEGORIES).toContain('ui');
      expect(DEFAULT_CATEGORIES).toContain('auto-detected');
    });
  });
});
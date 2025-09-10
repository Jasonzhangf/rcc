/**
 * 配置生成器组件测试
 * 
 * 测试配置生成器的主界面、表单交互、实时预览等功能
 */

import { ConfigGeneratorMain } from '../src/webui/components/ConfigGenerator/ConfigGeneratorMain';
import { ConfigService } from '../src/webui/services/ConfigService';
import { 
  UserConfig, 
  ProviderConfig, 
  VirtualModelConfig, 
  RouteConfig,
  ConfigGeneratorOptions 
} from '../src/webui/types/ui.types';

describe('ConfigGeneratorMain - 配置生成器主组件', () => {
  let generator: ConfigGeneratorMain;
  let configService: ConfigService;
  let container: HTMLElement;

  beforeEach(() => {
    // 创建容器
    container = document.createElement('div');
    container.id = 'generator-container';
    document.body.appendChild(container);

    // 创建服务实例
    configService = new ConfigService();
    
    // 创建生成器实例
    generator = new ConfigGeneratorMain(configService);
  });

  afterEach(() => {
    if (generator) {
      generator.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('组件初始化和渲染', () => {
    test('应该正确初始化组件', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        showPreview: true,
        autoSave: true
      });

      expect(generator.isInitialized()).toBe(true);
      expect(generator.getContainer()).toBe(container);
    });

    test('应该渲染基本UI结构', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const header = container.querySelector('.config-generator-header');
      const content = container.querySelector('.config-generator-content');
      const preview = container.querySelector('.config-preview');

      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
      expect(preview).toBeTruthy();
    });

    test('应该根据选项控制预览面板', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        showPreview: false
      });

      const preview = container.querySelector('.config-preview');
      expect(preview).toBeFalsy();
    });
  });

  describe('提供商管理', () => {
    test('应该添加新的提供商', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const providerData: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        models: ['model-1', 'model-2'],
        apiKey: 'test-api-key',
        baseUrl: 'https://api.test.com'
      };

      await generator.addProvider(providerData);
      
      const providers = generator.getProviders();
      expect(providers.length).toBe(1);
      expect(providers[0]).toEqual(providerData);
    });

    test('应该更新现有提供商', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const providerData: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        models: ['model-1'],
        apiKey: 'test-api-key',
        baseUrl: 'https://api.test.com'
      };

      await generator.addProvider(providerData);
      
      const updatedData = {
        ...providerData,
        name: 'Updated Provider',
        models: ['model-1', 'model-2', 'model-3']
      };

      await generator.updateProvider('test-provider', updatedData);
      
      const providers = generator.getProviders();
      expect(providers[0].name).toBe('Updated Provider');
      expect(providers[0].models).toEqual(['model-1', 'model-2', 'model-3']);
    });

    test('应该删除提供商', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const providerData: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        models: ['model-1'],
        apiKey: 'test-api-key',
        baseUrl: 'https://api.test.com'
      };

      await generator.addProvider(providerData);
      expect(generator.getProviders().length).toBe(1);

      await generator.removeProvider('test-provider');
      expect(generator.getProviders().length).toBe(0);
    });

    test('应该验证提供商数据', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const invalidProvider = {
        id: '',
        name: '',
        models: [],
        apiKey: '',
        baseUrl: 'invalid-url'
      };

      const result = await generator.validateProvider(invalidProvider);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('虚拟模型管理', () => {
    test('应该添加虚拟模型', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 先添加提供商
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo', 'gpt-4'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };

      await generator.addVirtualModel(virtualModelData);
      
      const virtualModels = generator.getVirtualModels();
      expect(virtualModels.length).toBe(1);
      expect(virtualModels[0]).toEqual(virtualModelData);
    });

    test('应该更新虚拟模型', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加提供商和虚拟模型
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo', 'gpt-4'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      const updatedData = {
        ...virtualModelData,
        name: '高级智能助手',
        model: 'gpt-4'
      };

      await generator.updateVirtualModel('assistant', updatedData);
      
      const virtualModels = generator.getVirtualModels();
      expect(virtualModels[0].name).toBe('高级智能助手');
      expect(virtualModels[0].model).toBe('gpt-4');
    });

    test('应该删除虚拟模型', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加提供商和虚拟模型
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      expect(generator.getVirtualModels().length).toBe(1);

      await generator.removeVirtualModel('assistant');
      expect(generator.getVirtualModels().length).toBe(0);
    });

    test('应该验证虚拟模型数据', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const invalidVirtualModel = {
        id: '',
        name: '',
        provider: 'non-existent',
        model: '',
        route: ''
      };

      const result = await generator.validateVirtualModel(invalidVirtualModel);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('路由管理', () => {
    test('应该添加路由', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 先添加提供商和虚拟模型
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      const routeData: RouteConfig = {
        path: '/api/assistant',
        method: 'POST',
        virtualModel: 'assistant',
        timeout: 30000
      };

      await generator.addRoute(routeData);
      
      const routes = generator.getRoutes();
      expect(routes.length).toBe(1);
      expect(routes[0]).toEqual(routeData);
    });

    test('应该更新路由', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加基础数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      const routeData: RouteConfig = {
        path: '/api/assistant',
        method: 'POST',
        virtualModel: 'assistant',
        timeout: 30000
      };
      await generator.addRoute(routeData);

      const updatedData = {
        ...routeData,
        timeout: 60000,
        method: 'GET' as const
      };

      await generator.updateRoute('/api/assistant', updatedData);
      
      const routes = generator.getRoutes();
      expect(routes[0].timeout).toBe(60000);
      expect(routes[0].method).toBe('GET');
    });

    test('应该删除路由', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加基础数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      const routeData: RouteConfig = {
        path: '/api/assistant',
        method: 'POST',
        virtualModel: 'assistant',
        timeout: 30000
      };
      await generator.addRoute(routeData);

      expect(generator.getRoutes().length).toBe(1);

      await generator.removeRoute('/api/assistant');
      expect(generator.getRoutes().length).toBe(0);
    });
  });

  describe('实时预览功能', () => {
    test('应该生成配置预览', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        showPreview: true
      });

      // 添加测试数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      const routeData: RouteConfig = {
        path: '/api/assistant',
        method: 'POST',
        virtualModel: 'assistant',
        timeout: 30000
      };
      await generator.addRoute(routeData);

      const preview = generator.getConfigPreview();
      
      expect(preview).toBeDefined();
      expect(preview.providers.length).toBe(1);
      expect(preview.virtualModels.length).toBe(1);
      expect(preview.routes.length).toBe(1);
    });

    test('应该实时更新预览', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        showPreview: true
      });

      let previewUpdateCount = 0;
      generator.onPreviewUpdate(() => {
        previewUpdateCount++;
      });

      // 添加提供商
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      expect(previewUpdateCount).toBeGreaterThan(0);
    });

    test('应该格式化预览输出', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        showPreview: true
      });

      // 添加测试数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const formattedPreview = generator.getFormattedPreview('json');
      
      expect(typeof formattedPreview).toBe('string');
      expect(() => JSON.parse(formattedPreview)).not.toThrow();
    });
  });

  describe('表单验证和错误处理', () => {
    test('应该验证表单数据', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const validationResult = await generator.validateCurrentConfig();
      
      // 空配置应该通过基本验证
      expect(validationResult.isValid).toBe(true);
    });

    test('应该显示验证错误', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加无效数据
      const invalidProvider = {
        id: '',
        name: '',
        models: [],
        apiKey: '',
        baseUrl: 'invalid-url'
      };

      await generator.addProvider(invalidProvider);
      
      const validationResult = await generator.validateCurrentConfig();
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    test('应该处理用户输入错误', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      let errorHandled = false;
      generator.onError(() => {
        errorHandled = true;
      });

      // 尝试添加重复的提供商ID
      const providerData: ProviderConfig = {
        id: 'duplicate',
        name: 'Test Provider',
        models: ['model-1'],
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com'
      };

      await generator.addProvider(providerData);
      await generator.addProvider(providerData); // 重复添加

      expect(errorHandled).toBe(true);
    });
  });

  describe('导入导出功能', () => {
    test('应该导入配置文件', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'import-test',
          description: '导入测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo'],
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com'
          }
        ],
        virtualModels: [
          {
            id: 'assistant',
            name: '智能助手',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            route: '/api/assistant'
          }
        ],
        routes: [
          {
            path: '/api/assistant',
            method: 'POST',
            virtualModel: 'assistant',
            timeout: 30000
          }
        ]
      };

      await generator.importConfig(configData);
      
      expect(generator.getProviders().length).toBe(1);
      expect(generator.getVirtualModels().length).toBe(1);
      expect(generator.getRoutes().length).toBe(1);
    });

    test('应该导出当前配置', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      // 添加测试数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const exportedConfig = await generator.exportConfig();
      
      expect(exportedConfig).toBeDefined();
      expect(exportedConfig.providers.length).toBe(1);
      expect(exportedConfig.virtualModels.length).toBe(0);
      expect(exportedConfig.routes.length).toBe(0);
    });

    test('应该处理不同格式的导入导出', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'format-test',
          description: '格式测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      // JSON格式
      const jsonExport = await generator.exportConfig('json');
      expect(typeof jsonExport).toBe('string');
      
      // 从JSON导入
      await generator.importConfig(JSON.parse(jsonExport));
      expect(generator.getProviders().length).toBe(0);
    });
  });

  describe('自动保存功能', () => {
    test('应该自动保存配置更改', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        autoSave: true,
        autoSaveInterval: 100 // 100ms用于测试
      });

      let saveCount = 0;
      generator.onAutoSave(() => {
        saveCount++;
      });

      // 添加提供商
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      // 等待自动保存
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(saveCount).toBeGreaterThan(0);
    });

    test('应该加载自动保存的配置', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        autoSave: true
      });

      // 添加一些数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      // 模拟重新初始化
      generator.destroy();
      generator = new ConfigGeneratorMain(configService);
      
      await generator.initialize({
        containerId: 'generator-container',
        autoSave: true,
        restoreFromAutoSave: true
      });

      const providers = generator.getProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].id).toBe('openai');
    });
  });

  describe('事件处理和回调', () => {
    test('应该处理配置更改事件', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      let changeCount = 0;
      generator.onConfigChange(() => {
        changeCount++;
      });

      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };

      await generator.addProvider(providerData);
      expect(changeCount).toBe(1);

      await generator.updateProvider('openai', { ...providerData, name: 'Updated OpenAI' });
      expect(changeCount).toBe(2);
    });

    test('应该处理提供商选择事件', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      let selectedProvider: ProviderConfig | null = null;
      generator.onProviderSelect((provider) => {
        selectedProvider = provider;
      });

      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      generator.selectProvider('openai');
      expect(selectedProvider).toEqual(providerData);
    });

    test('应该处理虚拟模型选择事件', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      let selectedVirtualModel: VirtualModelConfig | null = null;
      generator.onVirtualModelSelect((virtualModel) => {
        selectedVirtualModel = virtualModel;
      });

      // 添加基础数据
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      const virtualModelData: VirtualModelConfig = {
        id: 'assistant',
        name: '智能助手',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        route: '/api/assistant'
      };
      await generator.addVirtualModel(virtualModelData);

      generator.selectVirtualModel('assistant');
      expect(selectedVirtualModel).toEqual(virtualModelData);
    });
  });

  describe('键盘快捷键和辅助功能', () => {
    test('应该支持键盘快捷键', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        enableKeyboardShortcuts: true
      });

      let saveTriggered = false;
      generator.onSave(() => {
        saveTriggered = true;
      });

      // 模拟Ctrl+S快捷键
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(event);

      expect(saveTriggered).toBe(true);
    });

    test('应该支持辅助功能', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        enableAccessibility: true
      });

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });

      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        expect(input.getAttribute('aria-describedby')).toBeTruthy();
      });
    });
  });

  describe('性能优化', () => {
    test('应该高效处理大量提供商', async () => {
      await generator.initialize({
        containerId: 'generator-container'
      });

      const startTime = performance.now();

      // 添加100个提供商
      for (let i = 0; i < 100; i++) {
        const providerData: ProviderConfig = {
          id: `provider-${i}`,
          name: `Provider ${i}`,
          models: [`model-${i}-1`, `model-${i}-2`],
          apiKey: `key-${i}`,
          baseUrl: `https://api.provider${i}.com`
        };
        await generator.addProvider(providerData);
      }

      const endTime = performance.now();

      expect(generator.getProviders().length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该使用虚拟滚动处理大量虚拟模型', async () => {
      await generator.initialize({
        containerId: 'generator-container',
        useVirtualScroll: true
      });

      // 添加提供商
      const providerData: ProviderConfig = {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-3.5-turbo', 'gpt-4'],
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      };
      await generator.addProvider(providerData);

      // 添加1000个虚拟模型
      for (let i = 0; i < 1000; i++) {
        const virtualModelData: VirtualModelConfig = {
          id: `vm-${i}`,
          name: `Virtual Model ${i}`,
          provider: 'openai',
          model: i % 2 === 0 ? 'gpt-3.5-turbo' : 'gpt-4',
          route: `/api/vm-${i}`
        };
        await generator.addVirtualModel(virtualModelData);
      }

      expect(generator.getVirtualModels().length).toBe(1000);
      
      // 检查是否只渲染可见项目
      const visibleItems = container.querySelectorAll('.virtual-model-item');
      expect(visibleItems.length).toBeLessThan(1000);
    });
  });
});
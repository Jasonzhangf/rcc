/**
 * Web UI 测试套件
 * 
 * 测试Configuration模块的Web UI功能，包括配置生成器、配置解析器、
 * 服务层、组件交互等核心功能
 */

import { ConfigurationCenterUI } from '../src/webui/index';
import { ConfigService } from '../src/webui/services/ConfigService';
import { ParserService } from '../src/webui/services/ParserService';
import { StorageService } from '../src/webui/services/StorageService';
import { 
  UserConfig, 
  PipelineConfig, 
  ConfigGeneratorOptions,
  ParseResult,
  UITheme,
  ViewType
} from '../src/webui/types/ui.types';

describe('Configuration Center Web UI', () => {
  let ui: ConfigurationCenterUI;
  let configService: ConfigService;
  let parserService: ParserService;
  let storageService: StorageService;

  beforeEach(() => {
    // 清理localStorage
    localStorage.clear();
    
    // 创建服务实例
    configService = new ConfigService();
    parserService = new ParserService();
    storageService = new StorageService();
    
    // 创建UI实例
    ui = ConfigurationCenterUI.getInstance();
  });

  afterEach(async () => {
    if (ui) {
      await ui.destroy();
    }
  });

  describe('ConfigurationCenterUI - 主UI类', () => {
    test('应该创建单例实例', () => {
      const instance1 = ConfigurationCenterUI.getInstance();
      const instance2 = ConfigurationCenterUI.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    test('应该初始化UI组件', async () => {
      const container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);

      await ui.initialize({
        containerId: 'test-container',
        theme: 'light',
        defaultView: 'generator'
      });

      expect(ui.isInitialized()).toBe(true);
      expect(ui.getCurrentView()).toBe('generator');
      
      document.body.removeChild(container);
    });

    test('应该切换视图', async () => {
      const container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);

      await ui.initialize({
        containerId: 'test-container',
        theme: 'light',
        defaultView: 'generator'
      });

      await ui.switchToView('parser');
      expect(ui.getCurrentView()).toBe('parser');
      
      document.body.removeChild(container);
    });

    test('应该处理主题切换', async () => {
      const container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);

      await ui.initialize({
        containerId: 'test-container',
        theme: 'light'
      });

      await ui.setTheme('dark');
      expect(ui.getTheme()).toBe('dark');
      
      await ui.setTheme('auto');
      expect(ui.getTheme()).toBe('auto');
      
      document.body.removeChild(container);
    });

    test('应该获取和设置配置', async () => {
      const testConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'test-config',
          description: '测试配置',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4'],
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

      await ui.setCurrentConfiguration(testConfig);
      const retrievedConfig = await ui.getCurrentConfiguration();
      
      expect(retrievedConfig).toEqual(testConfig);
    });
  });

  describe('ConfigService - 配置服务', () => {
    test('应该创建配置模板', () => {
      const template = configService.createTemplate('test-config', '测试配置模板');
      
      expect(template).toBeDefined();
      expect(template.metadata.name).toBe('test-config');
      expect(template.metadata.description).toBe('测试配置模板');
      expect(template.version).toBe('1.0.0');
      expect(template.providers).toEqual([]);
      expect(template.virtualModels).toEqual([]);
      expect(template.routes).toEqual([]);
    });

    test('应该验证配置结构', () => {
      const validConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'valid-config',
          description: '有效配置',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const result = configService.validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('应该检测无效配置', () => {
      const invalidConfig = {
        version: '1.0.0',
        // 缺少必需的metadata字段
        providers: [],
        virtualModels: [],
        routes: []
      } as UserConfig;

      const result = configService.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该优化配置', () => {
      const config: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'test-config',
          description: '测试配置',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo'], // 重复的模型
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com'
          }
        ],
        virtualModels: [],
        routes: []
      };

      const optimized = configService.optimizeConfig(config);
      
      // 应该移除重复的模型
      expect(optimized.providers[0].models).toEqual(['gpt-3.5-turbo', 'gpt-4']);
    });

    test('应该导入导出配置', async () => {
      const config: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'export-test',
          description: '导出测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      // 导出为JSON
      const jsonExport = await configService.exportConfig(config, 'json');
      expect(typeof jsonExport).toBe('string');
      
      // 从JSON导入
      const importedConfig = await configService.importConfig(jsonExport, 'json');
      expect(importedConfig.metadata.name).toBe('export-test');
    });
  });

  describe('ParserService - 解析服务', () => {
    test('应该解析用户配置生成流水线', () => {
      const userConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'parse-test',
          description: '解析测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4'],
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
          },
          {
            id: 'advanced-assistant',
            name: '高级助手',
            provider: 'openai',
            model: 'gpt-4',
            route: '/api/advanced-assistant'
          }
        ],
        routes: [
          {
            path: '/api/assistant',
            method: 'POST',
            virtualModel: 'assistant',
            timeout: 30000
          },
          {
            path: '/api/advanced-assistant',
            method: 'POST',
            virtualModel: 'advanced-assistant',
            timeout: 60000
          }
        ]
      };

      const pipelines = parserService.parse(userConfig);
      
      expect(pipelines.length).toBe(2); // 2个虚拟模型 = 2条流水线
      expect(pipelines[0].id).toBe('openai.gpt-3.5-turbo.0');
      expect(pipelines[0].virtualModels).toContain('assistant');
      expect(pipelines[1].id).toBe('openai.gpt-4.0');
      expect(pipelines[1].virtualModels).toContain('advanced-assistant');
    });

    test('应该处理多个虚拟模型指向同一流水线的情况', () => {
      const userConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'multi-vm-test',
          description: '多虚拟模型测试',
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
            id: 'assistant-1',
            name: '助手1',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            route: '/api/assistant-1'
          },
          {
            id: 'assistant-2',
            name: '助手2',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            route: '/api/assistant-2'
          }
        ],
        routes: [
          {
            path: '/api/assistant-1',
            method: 'POST',
            virtualModel: 'assistant-1',
            timeout: 30000
          },
          {
            path: '/api/assistant-2',
            method: 'POST',
            virtualModel: 'assistant-2',
            timeout: 30000
          }
        ]
      };

      const pipelines = parserService.parse(userConfig);
      
      expect(pipelines.length).toBe(1); // 同一模型应该合并为一条流水线
      expect(pipelines[0].virtualModels).toContain('assistant-1');
      expect(pipelines[0].virtualModels).toContain('assistant-2');
    });

    test('应该处理一个虚拟模型有多条流水线的情况', () => {
      const userConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'multi-pipeline-test',
          description: '多流水线测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4'],
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com'
          }
        ],
        virtualModels: [
          {
            id: 'multi-model-assistant',
            name: '多模型助手',
            provider: 'openai',
            model: 'gpt-3.5-turbo,gpt-4', // 支持多个模型
            route: '/api/multi-assistant'
          }
        ],
        routes: [
          {
            path: '/api/multi-assistant',
            method: 'POST',
            virtualModel: 'multi-model-assistant',
            timeout: 30000
          }
        ]
      };

      const pipelines = parserService.parse(userConfig);
      
      expect(pipelines.length).toBe(2); // 2个模型 = 2条流水线
      expect(pipelines[0].virtualModels).toContain('multi-model-assistant');
      expect(pipelines[1].virtualModels).toContain('multi-model-assistant');
    });

    test('应该生成解析统计信息', () => {
      const userConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'stats-test',
          description: '统计测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4'],
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com'
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            models: ['claude-3-sonnet'],
            apiKey: 'test-key-2',
            baseUrl: 'https://api.anthropic.com'
          }
        ],
        virtualModels: [
          {
            id: 'assistant',
            name: '助手',
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

      const result: ParseResult = parserService.parseWithStats(userConfig);
      
      expect(result.pipelines.length).toBe(1);
      expect(result.stats.totalProviders).toBe(2);
      expect(result.stats.totalModels).toBe(3); // gpt-3.5-turbo + gpt-4 + claude-3-sonnet
      expect(result.stats.totalVirtualModels).toBe(1);
      expect(result.stats.totalPipelines).toBe(1);
      expect(result.stats.uniqueProviderModels).toBe(3);
    });

    test('应该验证解析结果', () => {
      const validPipeline: PipelineConfig = {
        id: 'openai.gpt-3.5-turbo.0',
        virtualModels: ['assistant'],
        llmswitch: {
          enabled: true,
          strategy: 'round-robin',
          fallback: true
        },
        workflow: {
          steps: ['preprocess', 'llm', 'postprocess'],
          timeout: 30000
        },
        compatibility: {
          version: '1.0.0',
          supportedFormats: ['json', 'xml']
        },
        provider: {
          id: 'openai',
          name: 'OpenAI',
          model: 'gpt-3.5-turbo',
          apiKey: 'test-key'
        }
      };

      const result = parserService.validatePipeline(validPipeline);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('StorageService - 存储服务', () => {
    test('应该保存和加载配置', async () => {
      const config: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'storage-test',
          description: '存储测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      await storageService.saveConfig('test-config', config);
      const loadedConfig = await storageService.loadConfig('test-config');
      
      expect(loadedConfig).toEqual(config);
    });

    test('应该管理配置历史', async () => {
      const config1: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'history-test-v1',
          description: '历史测试版本1',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const config2: UserConfig = {
        ...config1,
        version: '1.1.0',
        metadata: {
          ...config1.metadata,
          name: 'history-test-v2',
          description: '历史测试版本2',
          updatedAt: new Date().toISOString()
        }
      };

      await storageService.saveConfig('history-test', config1);
      await storageService.saveConfig('history-test', config2);
      
      const history = await storageService.getConfigHistory('history-test');
      expect(history.length).toBe(2);
      expect(history[0].version).toBe('1.1.0');
      expect(history[1].version).toBe('1.0.0');
    });

    test('应该管理用户偏好设置', async () => {
      const preferences = {
        theme: 'dark' as UITheme,
        language: 'zh-CN',
        autoSave: true,
        showLineNumbers: true,
        fontSize: 14
      };

      await storageService.savePreferences(preferences);
      const loadedPreferences = await storageService.loadPreferences();
      
      expect(loadedPreferences).toEqual(preferences);
    });

    test('应该管理最近文件', async () => {
      await storageService.addRecentFile('config1.json', '配置1');
      await storageService.addRecentFile('config2.json', '配置2');
      await storageService.addRecentFile('config3.json', '配置3');
      
      const recentFiles = await storageService.getRecentFiles();
      expect(recentFiles.length).toBe(3);
      expect(recentFiles[0].name).toBe('配置3');
      
      // 测试限制最近文件数量
      await storageService.addRecentFile('config4.json', '配置4');
      await storageService.addRecentFile('config5.json', '配置5');
      await storageService.addRecentFile('config6.json', '配置6');
      
      const updatedRecentFiles = await storageService.getRecentFiles();
      expect(updatedRecentFiles.length).toBe(5); // 默认最多5个
    });

    test('应该清除存储数据', async () => {
      const config: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'clear-test',
          description: '清除测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      await storageService.saveConfig('clear-test', config);
      await storageService.savePreferences({ theme: 'dark' as UITheme });
      
      await storageService.clearAll();
      
      const loadedConfig = await storageService.loadConfig('clear-test');
      const loadedPreferences = await storageService.loadPreferences();
      
      expect(loadedConfig).toBeNull();
      expect(loadedPreferences).toEqual({});
    });
  });

  describe('UI工具函数', () => {
    test('应该生成唯一ID', () => {
      const { generateId } = require('../src/webui/utils/ui.utils');
      
      const id1 = generateId('test');
      const id2 = generateId('test');
      
      expect(id1).not.toBe(id2);
      expect(id1).toContain('test');
    });

    test('应该格式化文件大小', () => {
      const { formatFileSize } = require('../src/webui/utils/ui.utils');
      
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('应该验证文件类型', () => {
      const { isValidFileType } = require('../src/webui/utils/ui.utils');
      
      expect(isValidFileType('config.json', ['json'])).toBe(true);
      expect(isValidFileType('config.yaml', ['json', 'yaml'])).toBe(true);
      expect(isValidFileType('config.txt', ['json'])).toBe(false);
    });

    test('应该深拷贝对象', () => {
      const { deepClone } = require('../src/webui/utils/ui.utils');
      
      const original = {
        name: 'test',
        nested: {
          value: 42,
          array: [1, 2, 3]
        }
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.array).not.toBe(original.nested.array);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理无效的UI初始化参数', async () => {
      await expect(ui.initialize({
        containerId: 'non-existent',
        theme: 'invalid-theme' as UITheme
      })).rejects.toThrow();
    });

    test('应该处理配置服务错误', async () => {
      const invalidConfig = {
        invalid: 'structure'
      } as UserConfig;

      const result = configService.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该处理解析服务错误', () => {
      const invalidConfig = {
        version: '1.0.0',
        // 缺少必需的字段
      } as UserConfig;

      expect(() => {
        parserService.parse(invalidConfig);
      }).toThrow();
    });

    test('应该处理存储服务错误', async () => {
      // 模拟localStorage错误
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      await expect(storageService.saveConfig('test', {} as UserConfig))
        .rejects.toThrow('Storage error');

      localStorage.setItem = originalSetItem;
    });

    test('应该处理大文件上传', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const largeFile = new File([largeContent], 'large-config.json', {
        type: 'application/json'
      });

      const result = await parserService.parseFile(largeFile);
      
      // 应该处理大文件而不崩溃
      expect(result).toBeDefined();
    });

    test('应该处理循环引用', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // 创建循环引用

      const { deepClone } = require('../src/webui/utils/ui.utils');
      
      // 应该处理循环引用而不崩溃
      expect(() => deepClone(obj)).toThrow();
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量配置', async () => {
      const largeConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'performance-test',
          description: '性能测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      // 创建大量提供商和虚拟模型
      for (let i = 0; i < 100; i++) {
        largeConfig.providers.push({
          id: `provider-${i}`,
          name: `Provider ${i}`,
          models: [`model-${i}-1`, `model-${i}-2`],
          apiKey: `key-${i}`,
          baseUrl: `https://api.provider${i}.com`
        });

        largeConfig.virtualModels.push({
          id: `vm-${i}`,
          name: `Virtual Model ${i}`,
          provider: `provider-${i % 10}`,
          model: `model-${i % 10}-${(i % 2) + 1}`,
          route: `/api/vm-${i}`
        });

        largeConfig.routes.push({
          path: `/api/vm-${i}`,
          method: 'POST',
          virtualModel: `vm-${i}`,
          timeout: 30000
        });
      }

      const startTime = performance.now();
      const pipelines = parserService.parse(largeConfig);
      const endTime = performance.now();

      expect(pipelines.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该高效处理存储操作', async () => {
      const promises = [];
      
      // 并发保存多个配置
      for (let i = 0; i < 50; i++) {
        const config: UserConfig = {
          version: '1.0.0',
          metadata: {
            name: `concurrent-test-${i}`,
            description: `并发测试 ${i}`,
            author: 'tester',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          providers: [],
          virtualModels: [],
          routes: []
        };
        
        promises.push(storageService.saveConfig(`concurrent-${i}`, config));
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});
/**
 * 配置解析器组件测试
 * 
 * 测试配置解析器的主界面、文件上传、流水线生成、解析结果展示等功能
 */

import { ConfigParserMain } from '../src/webui/components/ConfigParser/ConfigParserMain';
import { ParserService } from '../src/webui/services/ParserService';
import { StorageService } from '../src/webui/services/StorageService';
import { 
  UserConfig, 
  PipelineConfig, 
  ParseResult,
  ParseOptions,
  FileUploadOptions
} from '../src/webui/types/ui.types';

describe('ConfigParserMain - 配置解析器主组件', () => {
  let parser: ConfigParserMain;
  let parserService: ParserService;
  let storageService: StorageService;
  let container: HTMLElement;

  beforeEach(() => {
    // 创建容器
    container = document.createElement('div');
    container.id = 'parser-container';
    document.body.appendChild(container);

    // 创建服务实例
    parserService = new ParserService();
    storageService = new StorageService();
    
    // 创建解析器实例
    parser = new ConfigParserMain(parserService, storageService);
  });

  afterEach(() => {
    if (parser) {
      parser.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('组件初始化和渲染', () => {
    test('应该正确初始化组件', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        showUploadArea: true,
        showPipelineView: true,
        showStatistics: true
      });

      expect(parser.isInitialized()).toBe(true);
      expect(parser.getContainer()).toBe(container);
    });

    test('应该渲染基本UI结构', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const header = container.querySelector('.config-parser-header');
      const uploadArea = container.querySelector('.file-upload-area');
      const pipelineView = container.querySelector('.pipeline-view');
      const statistics = container.querySelector('.parse-statistics');

      expect(header).toBeTruthy();
      expect(uploadArea).toBeTruthy();
      expect(pipelineView).toBeTruthy();
      expect(statistics).toBeTruthy();
    });

    test('应该根据选项控制UI元素', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        showUploadArea: false,
        showPipelineView: false,
        showStatistics: false
      });

      const uploadArea = container.querySelector('.file-upload-area');
      const pipelineView = container.querySelector('.pipeline-view');
      const statistics = container.querySelector('.parse-statistics');

      expect(uploadArea).toBeFalsy();
      expect(pipelineView).toBeFalsy();
      expect(statistics).toBeFalsy();
    });
  });

  describe('文件上传功能', () => {
    test('应该处理文件选择', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'upload-test',
          description: '上传测试',
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
        virtualModels: [],
        routes: []
      };

      const file = new File([JSON.stringify(configData)], 'test-config.json', {
        type: 'application/json'
      });

      const result = await parser.handleFileSelect(file);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.config).toEqual(configData);
    });

    test('应该处理拖拽上传', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'drag-test',
          description: '拖拽测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const file = new File([JSON.stringify(configData)], 'drag-config.json', {
        type: 'application/json'
      });

      // 模拟拖拽事件
      const dragEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer()
      });
      dragEvent.dataTransfer?.items.add(file);

      const result = await parser.handleDrop(dragEvent);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('应该验证文件类型', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        allowedFileTypes: ['json', 'yaml']
      });

      const invalidFile = new File(['test'], 'config.txt', {
        type: 'text/plain'
      });

      const result = await parser.handleFileSelect(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });

    test('应该处理文件大小限制', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        maxFileSize: 1024 // 1KB限制
      });

      const largeContent = 'x'.repeat(2048); // 2KB内容
      const largeFile = new File([largeContent], 'large-config.json', {
        type: 'application/json'
      });

      const result = await parser.handleFileSelect(largeFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('文件过大');
    });

    test('应该处理无效的文件内容', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const invalidFile = new File(['invalid json content'], 'invalid.json', {
        type: 'application/json'
      });

      const result = await parser.handleFileSelect(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('解析失败');
    });
  });

  describe('配置解析功能', () => {
    test('应该解析用户配置生成流水线', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
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

      const result = await parser.parseConfig(configData);
      
      expect(result.success).toBe(true);
      expect(result.pipelines.length).toBe(2);
      expect(result.pipelines[0].id).toBe('openai.gpt-3.5-turbo.0');
      expect(result.pipelines[1].id).toBe('openai.gpt-4.0');
    });

    test('应该处理复杂的配置结构', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const complexConfig: UserConfig = {
        version: '2.0.0',
        metadata: {
          name: 'complex-config',
          description: '复杂配置测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['production', 'multi-provider']
        },
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            apiKey: 'openai-key',
            baseUrl: 'https://api.openai.com',
            settings: {
              maxTokens: 4096,
              temperature: 0.7
            }
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            models: ['claude-3-sonnet', 'claude-3-opus'],
            apiKey: 'anthropic-key',
            baseUrl: 'https://api.anthropic.com',
            settings: {
              maxTokens: 8192,
              temperature: 0.5
            }
          }
        ],
        virtualModels: [
          {
            id: 'general-assistant',
            name: '通用助手',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            route: '/api/general',
            description: '处理一般性任务',
            capabilities: ['text-generation', 'translation']
          },
          {
            id: 'code-assistant',
            name: '代码助手',
            provider: 'openai',
            model: 'gpt-4',
            route: '/api/code',
            description: '处理编程相关任务',
            capabilities: ['code-generation', 'debugging']
          },
          {
            id: 'analysis-assistant',
            name: '分析助手',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            route: '/api/analysis',
            description: '处理数据分析任务',
            capabilities: ['data-analysis', 'reasoning']
          }
        ],
        routes: [
          {
            path: '/api/general',
            method: 'POST',
            virtualModel: 'general-assistant',
            timeout: 30000,
            rateLimit: {
              requests: 100,
              window: '1m'
            }
          },
          {
            path: '/api/code',
            method: 'POST',
            virtualModel: 'code-assistant',
            timeout: 60000,
            rateLimit: {
              requests: 50,
              window: '1m'
            }
          },
          {
            path: '/api/analysis',
            method: 'POST',
            virtualModel: 'analysis-assistant',
            timeout: 45000,
            rateLimit: {
              requests: 30,
              window: '1m'
            }
          }
        ]
      };

      const result = await parser.parseConfig(complexConfig);
      
      expect(result.success).toBe(true);
      expect(result.pipelines.length).toBe(4); // 4个不同的provider.model组合
      expect(result.stats.totalProviders).toBe(2);
      expect(result.stats.totalModels).toBe(5); // 3 + 2
      expect(result.stats.totalVirtualModels).toBe(3);
    });

    test('应该处理解析错误', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const invalidConfig = {
        version: '1.0.0',
        // 缺少必需的metadata字段
        providers: [
          {
            id: 'openai',
            // 缺少必需的字段
          }
        ]
      } as UserConfig;

      const result = await parser.parseConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.pipelines.length).toBe(0);
    });

    test('应该应用解析选项', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'options-test',
          description: '选项测试',
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

      const options: ParseOptions = {
        validateStructure: true,
        generateIds: true,
        optimizeDuplicates: true,
        includeStatistics: true,
        maxDepth: 5
      };

      const result = await parser.parseConfig(configData, options);
      
      expect(result.success).toBe(true);
      expect(result.pipelines.length).toBe(1);
      expect(result.stats).toBeDefined();
    });
  });

  describe('流水线展示功能', () => {
    test('应该显示解析后的流水线', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'pipeline-display-test',
          description: '流水线展示测试',
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

      await parser.parseConfig(configData);
      
      const pipelineElements = container.querySelectorAll('.pipeline-item');
      expect(pipelineElements.length).toBe(1);
      
      const pipelineElement = pipelineElements[0];
      expect(pipelineElement.querySelector('.pipeline-id')).toBeTruthy();
      expect(pipelineElement.querySelector('.pipeline-provider')).toBeTruthy();
      expect(pipelineElement.querySelector('.pipeline-model')).toBeTruthy();
      expect(pipelineElement.querySelector('.pipeline-virtual-models')).toBeTruthy();
    });

    test('应该支持流水线详情查看', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'pipeline-detail-test',
          description: '流水线详情测试',
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

      await parser.parseConfig(configData);
      
      // 点击流水线项目
      const pipelineElement = container.querySelector('.pipeline-item') as HTMLElement;
      expect(pipelineElement).toBeTruthy();

      let detailShown = false;
      parser.onPipelineDetailShow(() => {
        detailShown = true;
      });

      pipelineElement.click();
      
      expect(detailShown).toBe(true);
    });

    test('应该支持流水线搜索和过滤', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'pipeline-search-test',
          description: '流水线搜索测试',
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
            apiKey: 'anthropic-key',
            baseUrl: 'https://api.anthropic.com'
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
          },
          {
            id: 'analysis-assistant',
            name: '分析助手',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            route: '/api/analysis-assistant'
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
          },
          {
            path: '/api/analysis-assistant',
            method: 'POST',
            virtualModel: 'analysis-assistant',
            timeout: 45000
          }
        ]
      };

      await parser.parseConfig(configData);
      
      // 搜索包含"gpt"的流水线
      parser.searchPipelines('gpt');
      
      const visiblePipelines = container.querySelectorAll('.pipeline-item:not(.hidden)');
      expect(visiblePipelines.length).toBe(2); // gpt-3.5-turbo 和 gpt-4

      // 搜索包含"claude"的流水线
      parser.searchPipelines('claude');
      
      const claudePipelines = container.querySelectorAll('.pipeline-item:not(.hidden)');
      expect(claudePipelines.length).toBe(1); // claude-3-sonnet
    });
  });

  describe('统计信息功能', () => {
    test('应该显示解析统计信息', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'statistics-test',
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
            apiKey: 'anthropic-key',
            baseUrl: 'https://api.anthropic.com'
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
          },
          {
            id: 'analysis-assistant',
            name: '分析助手',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            route: '/api/analysis-assistant'
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
          },
          {
            path: '/api/analysis-assistant',
            method: 'POST',
            virtualModel: 'analysis-assistant',
            timeout: 45000
          }
        ]
      };

      await parser.parseConfig(configData);
      
      const statsElement = container.querySelector('.parse-statistics');
      expect(statsElement).toBeTruthy();
      
      const statItems = statsElement?.querySelectorAll('.stat-item');
      expect(statItems?.length).toBeGreaterThan(0);
      
      // 检查具体统计项
      const statsText = statsElement?.textContent || '';
      expect(statsText).toContain('提供商: 2');
      expect(statsText).toContain('模型: 3');
      expect(statsText).toContain('虚拟模型: 3');
      expect(statsText).toContain('流水线: 3');
    });

    test('应该显示详细的统计图表', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        showCharts: true
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'charts-test',
          description: '图表测试',
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

      await parser.parseConfig(configData);
      
      const chartElements = container.querySelectorAll('.statistics-chart');
      expect(chartElements.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理和验证', () => {
    test('应该显示解析错误', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const invalidConfig = {
        version: '1.0.0',
        // 缺少必需的metadata字段
        providers: [
          {
            id: 'openai',
            // 缺少必需的字段
          }
        ]
      } as UserConfig;

      const result = await parser.parseConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      
      const errorElement = container.querySelector('.parse-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement?.textContent).toContain('错误');
    });

    test('应该验证配置结构', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const validConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'validation-test',
          description: '验证测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const result = await parser.validateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('应该提供错误恢复建议', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const invalidConfig = {
        version: '1.0.0',
        metadata: {
          name: 'error-recovery-test'
          // 缺少其他必需字段
        },
        providers: [
          {
            id: 'openai'
            // 缺少其他必需字段
          }
        ]
      } as UserConfig;

      const result = await parser.parseConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('历史记录管理', () => {
    test('应该保存解析历史', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'history-test',
          description: '历史测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      await parser.parseConfig(configData);
      
      const history = await parser.getParseHistory();
      expect(history.length).toBe(1);
      expect(history[0].configName).toBe('history-test');
    });

    test('应该加载历史记录', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'load-history-test',
          description: '加载历史测试',
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
        virtualModels: [],
        routes: []
      };

      const result = await parser.parseConfig(configData);
      const history = await parser.getParseHistory();
      
      if (history.length > 0) {
        const loadedResult = await parser.loadFromHistory(history[0].id);
        expect(loadedResult).toBeDefined();
        expect(loadedResult.pipelines.length).toBe(result.pipelines.length);
      }
    });

    test('应该清除历史记录', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'clear-history-test',
          description: '清除历史测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      await parser.parseConfig(configData);
      
      let history = await parser.getParseHistory();
      expect(history.length).toBe(1);

      await parser.clearHistory();
      
      history = await parser.getParseHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('导出功能', () => {
    test('应该导出解析结果', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'export-test',
          description: '导出测试',
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

      await parser.parseConfig(configData);
      
      const exportResult = await parser.exportResults('json');
      expect(typeof exportResult).toBe('string');
      
      const parsedExport = JSON.parse(exportResult);
      expect(parsedExport.pipelines).toBeDefined();
      expect(parsedExport.stats).toBeDefined();
    });

    test('应该支持多种导出格式', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'multi-format-test',
          description: '多格式测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      await parser.parseConfig(configData);
      
      // JSON格式
      const jsonExport = await parser.exportResults('json');
      expect(typeof jsonExport).toBe('string');
      
      // 包含统计信息的导出
      const detailedExport = await parser.exportResults('json', {
        includeConfig: true,
        includeStatistics: true,
        includeTimestamps: true
      });
      
      const parsedExport = JSON.parse(detailedExport);
      expect(parsedExport.config).toBeDefined();
      expect(parsedExport.timestamp).toBeDefined();
    });
  });

  describe('事件处理和回调', () => {
    test('应该处理文件上传事件', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      let uploadEventFired = false;
      parser.onFileUpload(() => {
        uploadEventFired = true;
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'event-test',
          description: '事件测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const file = new File([JSON.stringify(configData)], 'event-test.json', {
        type: 'application/json'
      });

      await parser.handleFileSelect(file);
      
      expect(uploadEventFired).toBe(true);
    });

    test('应该处理解析完成事件', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      let parseCompleteEventFired = false;
      let eventResult: ParseResult | null = null;
      
      parser.onParseComplete((result) => {
        parseCompleteEventFired = true;
        eventResult = result;
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'parse-complete-test',
          description: '解析完成测试',
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

      await parser.parseConfig(configData);
      
      expect(parseCompleteEventFired).toBe(true);
      expect(eventResult).toBeDefined();
      expect(eventResult?.pipelines.length).toBe(1);
    });

    test('应该处理流水线选择事件', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      let selectedPipeline: PipelineConfig | null = null;
      parser.onPipelineSelect((pipeline) => {
        selectedPipeline = pipeline;
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'pipeline-select-test',
          description: '流水线选择测试',
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

      await parser.parseConfig(configData);
      
      // 模拟点击流水线
      const pipelineElement = container.querySelector('.pipeline-item') as HTMLElement;
      if (pipelineElement) {
        pipelineElement.click();
      }
      
      expect(selectedPipeline).toBeDefined();
      expect(selectedPipeline?.id).toContain('openai.gpt-3.5-turbo');
    });
  });

  describe('性能优化', () => {
    test('应该高效处理大量流水线', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      // 创建包含大量提供商和模型的配置
      const largeConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'large-pipeline-test',
          description: '大量流水线测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      // 添加50个提供商，每个有10个模型
      for (let i = 0; i < 50; i++) {
        largeConfig.providers.push({
          id: `provider-${i}`,
          name: `Provider ${i}`,
          models: Array.from({length: 10}, (_, j) => `model-${i}-${j}`),
          apiKey: `key-${i}`,
          baseUrl: `https://api.provider${i}.com`
        });
      }

      // 添加100个虚拟模型
      for (let i = 0; i < 100; i++) {
        largeConfig.virtualModels.push({
          id: `vm-${i}`,
          name: `Virtual Model ${i}`,
          provider: `provider-${i % 50}`,
          model: `model-${i % 50}-${i % 10}`,
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
      const result = await parser.parseConfig(largeConfig);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(result.pipelines.length).toBe(500); // 50 providers * 10 models
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    test('应该使用虚拟滚动展示大量流水线', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        useVirtualScroll: true,
        itemHeight: 60,
        visibleItemCount: 10
      });

      // 创建包含1000条流水线的配置
      const largeConfig: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'virtual-scroll-test',
          description: '虚拟滚动测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      // 添加大量提供商和模型
      for (let i = 0; i < 100; i++) {
        largeConfig.providers.push({
          id: `provider-${i}`,
          name: `Provider ${i}`,
          models: Array.from({length: 10}, (_, j) => `model-${i}-${j}`),
          apiKey: `key-${i}`,
          baseUrl: `https://api.provider${i}.com`
        });
      }

      await parser.parseConfig(largeConfig);
      
      const visiblePipelines = container.querySelectorAll('.pipeline-item');
      expect(visiblePipelines.length).toBeLessThan(1000); // 应该只渲染可见项目
      expect(visiblePipelines.length).toBeLessThanOrEqual(15); // 考虑缓冲区
    });
  });

  describe('辅助功能和用户体验', () => {
    test('应该显示加载状态', async () => {
      await parser.initialize({
        containerId: 'parser-container'
      });

      let loadingShown = false;
      parser.onLoadingStateChange((isLoading) => {
        loadingShown = isLoading;
      });

      const configData: UserConfig = {
        version: '1.0.0',
        metadata: {
          name: 'loading-test',
          description: '加载测试',
          author: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        providers: [],
        virtualModels: [],
        routes: []
      };

      const parsePromise = parser.parseConfig(configData);
      
      expect(loadingShown).toBe(true);
      
      await parsePromise;
      
      expect(loadingShown).toBe(false);
    });

    test('应该支持键盘快捷键', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        enableKeyboardShortcuts: true
      });

      let refreshTriggered = false;
      parser.onRefresh(() => {
        refreshTriggered = true;
      });

      // 模拟F5刷新快捷键
      const event = new KeyboardEvent('keydown', {
        key: 'F5',
        bubbles: true
      });
      document.dispatchEvent(event);

      expect(refreshTriggered).toBe(true);
    });

    test('应该提供操作提示', async () => {
      await parser.initialize({
        containerId: 'parser-container',
        showTooltips: true
      });

      const tooltipElements = container.querySelectorAll('[data-tooltip]');
      expect(tooltipElements.length).toBeGreaterThan(0);
    });
  });
});
/**
 * 配置Web UI重构测试
 * 
 * 验证重构后的配置Web UI功能
 */

import { ConfigurationCenterUI } from './src/webui/index';
import { ConfigLoadingManager } from './src/webui/managers/ConfigLoadingManager';
import { PipelineConfigGenerator } from './src/webui/services/PipelineConfigGenerator';

describe('Configuration Web UI 重构测试', () => {
  let ui: ConfigurationCenterUI;
  let loadingManager: ConfigLoadingManager;
  let pipelineGenerator: PipelineConfigGenerator;

  beforeEach(() => {
    // 清理localStorage
    localStorage.clear();
    
    // 创建实例
    ui = ConfigurationCenterUI.getInstance();
    loadingManager = new ConfigLoadingManager();
    pipelineGenerator = new PipelineConfigGenerator();
  });

  afterEach(async () => {
    // 清理
    if (ui) {
      await ui.destroy();
    }
  });

  test('应该正确初始化配置加载管理器', async () => {
    await loadingManager.initialize();
    const state = loadingManager.getState();
    
    expect(state.isLoading).toBe(false);
    expect(state.isParsing).toBe(false);
    expect(state.hasConfig).toBe(false);
  });

  test('应该正确处理配置文件加载状态', async () => {
    await loadingManager.initialize();
    
    // 模拟状态变化
    const states: any[] = [];
    loadingManager.addStateListener((state) => {
      states.push({ ...state });
    });
    
    // 更新状态
    (loadingManager as any).updateState({ isLoading: true });
    (loadingManager as any).updateState({ isLoading: false, hasConfig: true });
    
    expect(states.length).toBe(2);
    expect(states[1].hasConfig).toBe(true);
  });

  test('应该正确生成流水线配置', () => {
    // 创建模拟解析结果
    const mockParseResult = {
      success: true,
      pipelines: [
        {
          id: 'openai.gpt-4.0',
          virtualModels: ['smart-assistant'],
          llmswitch: {
            provider: 'openai',
            model: 'gpt-4',
            keyIndex: 0
          },
          workflow: {
            enabled: false,
            steps: []
          },
          compatibility: {
            openai: true,
            anthropic: true
          },
          provider: {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            endpoint: 'https://api.openai.com/v1',
            models: [
              {
                id: 'gpt-4',
                name: 'GPT-4',
                enabled: true
              }
            ],
            auth: {
              type: 'api-key',
              keys: ['test-key']
            },
            enabled: true
          }
        }
      ],
      statistics: {
        totalPipelines: 1,
        totalProviders: 1,
        totalModels: 1,
        totalKeys: 1
      }
    };
    
    // 生成流水线配置
    const pipelineConfig = pipelineGenerator.generatePipelineConfigs(mockParseResult);
    
    expect(pipelineConfig).toBeDefined();
    expect(pipelineConfig.settings.providers).toBeDefined();
    expect(pipelineConfig.settings.virtualModels).toBeDefined();
    expect(Object.keys(pipelineConfig.settings.providers)).toContain('openai');
  });

  test('应该正确导出流水线配置', () => {
    const mockConfig = {
      metadata: {
        name: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      settings: {
        providers: {},
        virtualModels: {}
      },
      version: '1.0.0'
    };
    
    const jsonExport = pipelineGenerator.exportPipelineConfig(mockConfig, 'json');
    expect(typeof jsonExport).toBe('string');
    expect(jsonExport.length).toBeGreaterThan(0);
  });

  test('应该正确初始化UI组件', async () => {
    // 创建测试容器
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    
    // 初始化UI
    await ui.initialize({
      containerId: 'test-container',
      theme: 'light'
    });
    
    // 验证容器已创建
    const appContainer = document.getElementById('test-container');
    expect(appContainer).not.toBeNull();
    expect(appContainer?.querySelector('.config-center-app')).not.toBeNull();
    
    // 清理
    document.body.removeChild(container);
  });
});
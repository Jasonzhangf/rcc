/**
 * 自动配置加载功能测试
 * 
 * 测试配置文件自动检测、加载和解析功能
 */

import { ConfigLoadingManager } from '../src/webui/managers/ConfigLoadingManager';
import { FileSystemService } from '../src/webui/services/FileSystemService';
import * as path from 'path';
import * as fs from 'fs';

describe('Auto Configuration Loading', () => {
  let configLoadingManager: ConfigLoadingManager;
  let fileSystemService: FileSystemService;
  const testConfigDir = path.join(__dirname, '../config');
  const testConfigFile = path.join(testConfigDir, 'rcc-config.json');

  beforeAll(async () => {
    // 确保测试配置目录存在
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // 创建测试配置文件
    const testConfig = {
      metadata: {
        name: "Test Configuration",
        description: "Auto-load test configuration",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "Test Suite"
      },
      settings: {
        general: {
          port: { value: 5506, type: "number", required: true },
          debug: { value: true, type: "boolean", required: false }
        },
        providers: {
          openai: {
            name: "OpenAI Test",
            type: "openai",
            endpoint: "https://api.openai.com/v1",
            models: {
              "gpt-4": {
                name: "GPT-4 Test",
                contextLength: 8192,
                supportsFunctions: true
              }
            },
            auth: {
              type: "api-key",
              keys: ["sk-test-key"]
            }
          }
        }
      },
      version: "1.0.0"
    };

    fs.writeFileSync(testConfigFile, JSON.stringify(testConfig, null, 2));
  });

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testConfigFile)) {
      fs.unlinkSync(testConfigFile);
    }
  });

  beforeEach(async () => {
    configLoadingManager = new ConfigLoadingManager();
    fileSystemService = new FileSystemService();
  });

  afterEach(async () => {
    await configLoadingManager.destroy();
  });

  test('应该成功初始化配置加载管理器', async () => {
    await expect(configLoadingManager.initialize()).resolves.not.toThrow();
    expect(configLoadingManager).toBeDefined();
  });

  test('应该能够检测到默认配置文件', async () => {
    await fileSystemService.initialize();
    const configFiles = await fileSystemService.findDefaultConfigFiles();
    expect(configFiles.length).toBeGreaterThan(0);
    expect(configFiles[0]).toContain('rcc-config.json');
  });

  test('应该能够读取配置文件', async () => {
    await fileSystemService.initialize();
    const configData = await fileSystemService.readConfigFile(testConfigFile);
    expect(configData).toBeDefined();
    expect(configData.metadata.name).toBe('Test Configuration');
    expect(configData.settings.providers.openai.name).toBe('OpenAI Test');
  });

  test('应该能够自动加载和解析配置', async () => {
    await configLoadingManager.initialize();
    const parseResult = await configLoadingManager.autoLoadAndParseConfig();
    
    expect(parseResult).not.toBeNull();
    expect(parseResult?.success).toBe(true);
    expect(parseResult?.pipelines.length).toBeGreaterThan(0);
    expect(parseResult?.statistics.totalPipelines).toBeGreaterThan(0);
  });

  test('应该能够加载最近的解析结果', async () => {
    await configLoadingManager.initialize();
    await configLoadingManager.autoLoadAndParseConfig();
    
    const recentResult = await configLoadingManager.loadRecentParseResult();
    expect(recentResult).not.toBeNull();
    expect(recentResult?.success).toBe(true);
  });

  test('应该能够获取所有服务实例', async () => {
    await configLoadingManager.initialize();
    const services = configLoadingManager.getServices();
    
    expect(services.fileSystemService).toBeDefined();
    expect(services.configService).toBeDefined();
    expect(services.parserService).toBeDefined();
    expect(services.storageService).toBeDefined();
  });

  test('文件系统服务应该能够找到默认配置文件', async () => {
    await fileSystemService.initialize();
    const configFiles = await fileSystemService.findDefaultConfigFiles();
    
    expect(Array.isArray(configFiles)).toBe(true);
    // 至少应该找到我们创建的测试文件
    expect(configFiles.length).toBeGreaterThanOrEqual(1);
  });

  test('配置服务应该正确初始化', async () => {
    await configLoadingManager.initialize();
    const services = configLoadingManager.getServices();
    
    const status = services.configService.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.templatesLoaded).toBeGreaterThan(0);
    expect(status.providersSupported).toBeGreaterThan(0);
  });

  test('解析服务应该正确初始化', async () => {
    await configLoadingManager.initialize();
    const services = configLoadingManager.getServices();
    
    const status = services.parserService.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.rulesLoaded).toBeGreaterThan(0);
  });

  test('存储服务应该正确初始化', async () => {
    await configLoadingManager.initialize();
    const services = configLoadingManager.getServices();
    
    const status = services.storageService.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.localStorageAvailable).toBe(true);
  });
});
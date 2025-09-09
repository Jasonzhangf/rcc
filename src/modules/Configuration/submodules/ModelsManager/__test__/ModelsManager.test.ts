/**
 * ModelsManager Test Suite
 * Comprehensive testing for model verification, token detection, and status management
 */

import { ModelsManager } from '../src/ModelsManager';
import { ModuleInfo } from '../../../../interfaces/ModuleInfo';
import { IConfigManager, IConfigData, IProvider, IModel } from '../../ConfigManager/interfaces/IConfigManager';
import { MODELS_MANAGER_CONSTANTS } from '../constants/ModelsManager.constants';

describe('ModelsManager', () => {
  let modelsManager: ModelsManager;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let sampleConfigData: IConfigData;
  let sampleProvider: IProvider;
  let sampleModel: IModel;
  let mockModuleInfo: ModuleInfo;

  beforeEach(() => {
    mockModuleInfo = {
      id: 'models-manager-1',
      name: 'ModelsManager',
      version: '1.0.0',
      description: 'Model verification and token detection',
      type: 'configuration-submodule',
      metadata: {}
    };
    
    modelsManager = new ModelsManager(mockModuleInfo);
    
    // Create mock ConfigManager
    mockConfigManager = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      createBackup: jest.fn(),
      restoreFromBackup: jest.fn(),
      validateConfig: jest.fn(),
      getConfigPath: jest.fn()
    };

    // Sample test data
    sampleModel = {
      id: 'gpt-4',
      name: 'GPT-4',
      max_tokens: 8192,
      description: 'GPT-4 model',
      status: 'active',
      verified: false,
      blacklisted: false,
      manual_override: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    };

    sampleProvider = {
      id: 'openai-1',
      name: 'OpenAI',
      protocol: 'openai',
      api_base_url: 'https://api.openai.com',
      api_key: ['test-key-1'],
      auth_type: 'Bearer',
      models: [sampleModel]
    };

    sampleConfigData = {
      version: '1.0.0',
      last_updated: '2024-01-01T00:00:00.000Z',
      providers: [sampleProvider],
      routes: [],
      global_config: {
        load_balancing: 'round_robin',
        rate_limiting: {
          enabled: false,
          requests_per_minute: 60
        }
      },
      model_blacklist: [],
      provider_pool: []
    };

    mockConfigManager.loadConfig.mockResolvedValue(sampleConfigData);
    mockConfigManager.saveConfig.mockResolvedValue();
    mockConfigManager.validateConfig.mockReturnValue(true);
    mockConfigManager.getConfigPath.mockReturnValue('/test/config.json');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Lifecycle', () => {
    test('should initialize successfully', async () => {
      await expect(modelsManager.initialize(mockConfigManager)).resolves.not.toThrow();
      expect(modelsManager.getName()).toBe(MODELS_MANAGER_CONSTANTS.MODULE_NAME);
    });

    test('should handle configuration updates', async () => {
      await modelsManager.initialize(mockConfigManager);
      await expect(modelsManager.onConfigUpdate(sampleConfigData)).resolves.not.toThrow();
    });

    test('should validate configuration correctly', async () => {
      await modelsManager.initialize(mockConfigManager);
      expect(modelsManager.validateConfig(sampleConfigData)).toBe(true);
    });

    test('should validate invalid configuration', async () => {
      await modelsManager.initialize(mockConfigManager);
      const invalidConfig = {
        ...sampleConfigData,
        providers: [{
          ...sampleProvider,
          models: [{ id: null, name: '', max_tokens: 'invalid' }] // Invalid model
        }]
      };
      expect(modelsManager.validateConfig(invalidConfig as any)).toBe(false);
    });

    test('should destroy properly', async () => {
      await modelsManager.initialize(mockConfigManager);
      await expect(modelsManager.destroy()).resolves.not.toThrow();
    });

    test('should throw error when not initialized', async () => {
      await expect(modelsManager.onConfigUpdate(sampleConfigData))
        .rejects.toThrow(`${MODELS_MANAGER_CONSTANTS.MODULE_NAME} not initialized`);
    });
  });

  describe('Provider Detection', () => {
    test('should detect iFlow provider by URL', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const iflowProvider = {
        ...sampleProvider,
        api_base_url: 'https://apis.iflow.cn'
      };
      
      expect(modelsManager.isIFlowProvider(iflowProvider)).toBe(true);
    });

    test('should detect iFlow provider by name', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const iflowProvider = {
        ...sampleProvider,
        name: 'iflow'
      };
      
      expect(modelsManager.isIFlowProvider(iflowProvider)).toBe(true);
    });

    test('should not detect non-iFlow provider', async () => {
      await modelsManager.initialize(mockConfigManager);
      expect(modelsManager.isIFlowProvider(sampleProvider)).toBe(false);
    });
  });

  describe('Error Parsing', () => {
    test('should parse iFlow error format', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const iflowError = {
        message: 'maximum context length of 8192 tokens',
        error_code: 400
      };
      
      const result = modelsManager.parseIFlowError(iflowError);
      expect(result.message).toBe('maximum context length of 8192 tokens');
      expect(result.code).toBe(400);
    });

    test('should parse OpenAI error format', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const openaiError = {
        error: {
          message: 'Token limit exceeded: 4096',
          code: 'context_length_exceeded'
        }
      };
      
      const result = modelsManager.parseIFlowError(openaiError);
      expect(result.message).toBe('Token limit exceeded: 4096');
    });

    test('should extract tokens from iFlow error message', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const testCases = [
        { message: 'maximum context length of 8192 tokens', expected: 8192 },
        { message: 'maximum context length is 4096 tokens', expected: 4096 },
        { message: 'context length limit: 16384', expected: 16384 },
        { message: 'token count max: 32768', expected: 32768 },
        { message: '65536 tokens maximum', expected: 65536 }
      ];
      
      testCases.forEach(({ message, expected }) => {
        const result = modelsManager.extractTokenFromIFlowError(message);
        expect(result).toBe(expected);
      });
    });

    test('should extract tokens from generic error message', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const testCases = [
        { message: 'maximum 4096 tokens allowed', expected: 4096 },
        { message: 'token limit is 8192', expected: 8192 },
        { message: '16384 token limit exceeded', expected: 16384 }
      ];
      
      testCases.forEach(({ message, expected }) => {
        const result = modelsManager.extractTokenFromGenericError(message);
        expect(result).toBe(expected);
      });
    });

    test('should return null for invalid token values', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      // Too small
      expect(modelsManager.extractTokenFromIFlowError('maximum 500 tokens')).toBeNull();
      // Too large
      expect(modelsManager.extractTokenFromIFlowError('maximum 5000000 tokens')).toBeNull();
      // No numbers
      expect(modelsManager.extractTokenFromIFlowError('no token limit found')).toBeNull();
    });
  });

  describe('Test Content Generation', () => {
    test('should generate test content with appropriate length', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const testCases = [1000, 4096, 8192, 16384];
      
      testCases.forEach(targetTokens => {
        const content = modelsManager.generateTestContent(targetTokens);
        const expectedMinLength = targetTokens * MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.CHARS_PER_TOKEN_ESTIMATE * 0.8;
        const expectedMaxLength = targetTokens * MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.CHARS_PER_TOKEN_ESTIMATE * 1.2;
        
        expect(content.length).toBeGreaterThan(expectedMinLength);
        expect(content.length).toBeLessThan(expectedMaxLength);
        expect(content).toContain(MODELS_MANAGER_CONSTANTS.TEST_CONTENT.BASE_TEXT);
        expect(content).toContain(MODELS_MANAGER_CONSTANTS.TEST_CONTENT.SUFFIX);
      });
    });
  });

  describe('Model Verification', () => {
    test('should handle provider not found', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const result = await modelsManager.verifyProviderModel('nonexistent', {
        modelId: 'gpt-4'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider not found');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
    });

    test('should handle model not found', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const result = await modelsManager.verifyProviderModel('openai-1', {
        modelId: 'nonexistent-model'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Model not found');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
    });

    test('should handle missing API key', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const providerWithoutKey = {
        ...sampleProvider,
        api_key: ['']
      };
      
      const configWithoutKey = {
        ...sampleConfigData,
        providers: [providerWithoutKey]
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithoutKey);
      
      const result = await modelsManager.verifyProviderModel('openai-1', {
        modelId: 'gpt-4'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid API key available');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Token Detection', () => {
    test('should handle provider not found for token detection', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const result = await modelsManager.detectModelTokens('nonexistent', {
        modelId: 'gpt-4'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider not found');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
    });

    test('should handle model not found for token detection', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const result = await modelsManager.detectModelTokens('openai-1', {
        modelId: 'nonexistent-model'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Model not found');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
    });

    test('should handle missing API key for token detection', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const providerWithoutKey = {
        ...sampleProvider,
        api_key: ['']
      };
      
      const configWithoutKey = {
        ...sampleConfigData,
        providers: [providerWithoutKey]
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithoutKey);
      
      const result = await modelsManager.detectModelTokens('openai-1', {
        modelId: 'gpt-4'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid API key available');
      expect(result.statusCode).toBe(MODELS_MANAGER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Constants Compliance', () => {
    test('should use constants instead of hardcoded values', () => {
      // Verify key constants are defined
      expect(MODELS_MANAGER_CONSTANTS.MODULE_NAME).toBeDefined();
      expect(MODELS_MANAGER_CONSTANTS.REQUEST_TIMEOUT_MS).toBeDefined();
      expect(MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.TEST_TOKEN_LIMITS).toBeInstanceOf(Array);
      expect(MODELS_MANAGER_CONSTANTS.IFLOW_DETECTION.URL_PATTERNS).toBeInstanceOf(Array);
      expect(MODELS_MANAGER_CONSTANTS.GENERIC_TOKEN_PATTERNS).toBeInstanceOf(Array);
      
      // Verify patterns are RegExp objects
      MODELS_MANAGER_CONSTANTS.IFLOW_DETECTION.URL_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
      
      MODELS_MANAGER_CONSTANTS.IFLOW_TOKEN_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
      
      MODELS_MANAGER_CONSTANTS.GENERIC_TOKEN_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    test('should have valid token detection configuration', () => {
      const tokenConfig = MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION;
      
      // Test limits should be in descending order
      const limits = tokenConfig.TEST_TOKEN_LIMITS;
      for (let i = 1; i < limits.length; i++) {
        expect(limits[i]).toBeLessThan(limits[i - 1]);
      }
      
      // Validation ranges should be sensible
      expect(tokenConfig.MIN_VALID_TOKENS).toBeGreaterThan(0);
      expect(tokenConfig.MAX_VALID_TOKENS).toBeGreaterThan(tokenConfig.MIN_VALID_TOKENS);
      expect(tokenConfig.TRIGGER_LIMIT_TOKENS).toBeGreaterThan(tokenConfig.MIN_VALID_TOKENS);
    });

    test('should have valid HTTP status codes', () => {
      const httpStatus = MODELS_MANAGER_CONSTANTS.HTTP_STATUS;
      
      expect(httpStatus.OK).toBe(200);
      expect(httpStatus.BAD_REQUEST).toBe(400);
      expect(httpStatus.UNAUTHORIZED).toBe(401);
      expect(httpStatus.NOT_FOUND).toBe(404);
      expect(httpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle multiple API keys in provider', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const multiKeyProvider = {
        ...sampleProvider,
        api_key: ['invalid-key', 'valid-key', 'backup-key']
      };
      
      const configWithMultiKeys = {
        ...sampleConfigData,
        providers: [multiKeyProvider]
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithMultiKeys);
      
      // Should find first non-empty key
      const result = await modelsManager.verifyProviderModel('openai-1', {
        modelId: 'gpt-4',
        apiKey: undefined // Let it auto-select
      });
      
      // Since we're not mocking HTTP requests, this will fail, but it should get past the key selection
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('No valid API key available');
    });

    test('should preserve model metadata during updates', async () => {
      await modelsManager.initialize(mockConfigManager);
      
      const initialModel = {
        ...sampleModel,
        verified: true,
        last_verification: '2024-01-01T00:00:00.000Z',
        auto_detected_tokens: 8192
      };
      
      const configWithVerifiedModel = {
        ...sampleConfigData,
        providers: [{
          ...sampleProvider,
          models: [initialModel]
        }]
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithVerifiedModel);
      
      // Attempt verification (will fail due to no HTTP mock, but should preserve structure)
      await modelsManager.verifyProviderModel('openai-1', {
        modelId: 'gpt-4'
      });
      
      // Verify saveConfig was called (indicating model was updated)
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
    });
  });
});
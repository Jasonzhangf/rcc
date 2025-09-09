/**
 * ProvidersManager Test Suite
 * Unit tests for the ProvidersManager submodule
 */

import { ProvidersManager } from '../src/ProvidersManager';
import { ModuleInfo } from '../../../../interfaces/ModuleInfo';
import { IConfigManager, IConfigData, IProvider } from '../../ConfigManager/interfaces/IConfigManager';
import { PROVIDERS_MANAGER_CONSTANTS } from '../constants/ProvidersManager.constants';

describe('ProvidersManager', () => {
  let providersManager: ProvidersManager;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockConfig: IConfigData;

  const createModuleInfo = (): ModuleInfo => ({
    id: 'providers-manager-test',
    name: 'ProvidersManager Test',
    version: '1.0.0',
    description: 'Test instance of ProvidersManager',
    type: 'configuration-submodule'
  });

  const createMockProvider = (id: string = 'provider-1'): IProvider => ({
    id,
    name: 'Test Provider',
    protocol: 'openai',
    api_base_url: 'https://api.openai.com',
    api_key: ['test-key-1', 'test-key-2'],
    auth_type: 'api_key',
    models: []
  });

  const createMockConfig = (): IConfigData => ({
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    providers: [createMockProvider()],
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
  });

  beforeEach(() => {
    mockConfig = createMockConfig();
    
    mockConfigManager = {
      loadConfig: jest.fn().mockResolvedValue(mockConfig),
      saveConfig: jest.fn().mockResolvedValue(undefined),
      createBackup: jest.fn().mockResolvedValue('/path/to/backup'),
      restoreFromBackup: jest.fn().mockResolvedValue(undefined),
      validateConfig: jest.fn().mockReturnValue(true),
      getConfigPath: jest.fn().mockReturnValue('/path/to/config.json')
    };

    providersManager = new ProvidersManager(createModuleInfo());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with ConfigManager', async () => {
      await providersManager.initialize(mockConfigManager);
      
      expect(mockConfigManager.loadConfig).toHaveBeenCalledTimes(1);
      expect(providersManager.getName()).toBe(PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME);
    });

    it('should throw error if ConfigManager fails to load config', async () => {
      mockConfigManager.loadConfig.mockRejectedValue(new Error('Config load failed'));
      
      await expect(providersManager.initialize(mockConfigManager)).rejects.toThrow('Config load failed');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const isValid = providersManager.validateConfig(mockConfig);
      expect(isValid).toBe(true);
    });

    it('should reject configuration without providers array', () => {
      const invalidConfig = { ...mockConfig, providers: null as any };
      const isValid = providersManager.validateConfig(invalidConfig);
      expect(isValid).toBe(false);
    });

    it('should reject configuration with invalid provider data', () => {
      const invalidConfig = {
        ...mockConfig,
        providers: [{ ...createMockProvider(), name: '' }] // Invalid empty name
      };
      const isValid = providersManager.validateConfig(invalidConfig);
      expect(isValid).toBe(false);
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      await providersManager.initialize(mockConfigManager);
    });

    describe('Get Providers', () => {
      it('should return all providers', async () => {
        const providers = await providersManager.getProviders();
        expect(providers).toHaveLength(1);
        expect(providers[0].name).toBe('Test Provider');
      });

      it('should return empty array when no providers exist', async () => {
        mockConfig.providers = [];
        await providersManager.onConfigUpdate(mockConfig);
        
        const providers = await providersManager.getProviders();
        expect(providers).toHaveLength(0);
      });
    });

    describe('Get Specific Provider', () => {
      it('should find provider by ID', async () => {
        const provider = await providersManager.getProvider('provider-1');
        expect(provider).toBeTruthy();
        expect(provider?.id).toBe('provider-1');
      });

      it('should find provider by name', async () => {
        const provider = await providersManager.getProvider('Test Provider');
        expect(provider).toBeTruthy();
        expect(provider?.name).toBe('Test Provider');
      });

      it('should return null for non-existent provider', async () => {
        const provider = await providersManager.getProvider('non-existent');
        expect(provider).toBeNull();
      });
    });

    describe('Add Provider', () => {
      it('should add valid provider', async () => {
        const newProviderData = {
          name: 'New Provider',
          protocol: 'anthropic',
          api_base_url: 'https://api.anthropic.com',
          api_key: ['new-test-key'],
          auth_type: 'api_key'
        };

        const result = await providersManager.addProvider(newProviderData);
        
        expect(result.success).toBe(true);
        expect(result.data.name).toBe('New Provider');
        expect(mockConfigManager.saveConfig).toHaveBeenCalledTimes(1);
      });

      it('should reject provider with duplicate name', async () => {
        const duplicateProviderData = {
          name: 'Test Provider', // Same as existing
          protocol: 'openai',
          api_base_url: 'https://api.test.com',
          api_key: ['test-key'],
          auth_type: 'api_key'
        };

        const result = await providersManager.addProvider(duplicateProviderData);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NAME_EXISTS);
        expect(result.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.CONFLICT);
      });

      it('should reject provider with invalid data', async () => {
        const invalidProviderData = {
          name: '', // Invalid empty name
          protocol: 'openai',
          api_base_url: 'https://api.test.com',
          api_key: ['test-key'],
          auth_type: 'api_key'
        };

        const result = await providersManager.addProvider(invalidProviderData);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Name is required');
      });
    });

    describe('Update Provider', () => {
      it('should update existing provider', async () => {
        const updateData = {
          name: 'Updated Provider',
          protocol: 'openai',
          api_base_url: 'https://api.updated.com',
          api_key: ['updated-key'],
          auth_type: 'api_key'
        };

        const result = await providersManager.updateProvider('provider-1', updateData);
        
        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Updated Provider');
        expect(mockConfigManager.saveConfig).toHaveBeenCalledTimes(1);
      });

      it('should reject update for non-existent provider', async () => {
        const updateData = {
          name: 'Updated Provider',
          protocol: 'openai',
          api_base_url: 'https://api.updated.com',
          api_key: ['updated-key'],
          auth_type: 'api_key'
        };

        const result = await providersManager.updateProvider('non-existent', updateData);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
        expect(result.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
      });
    });

    describe('Delete Provider', () => {
      it('should delete existing provider', async () => {
        const result = await providersManager.deleteProvider('provider-1');
        
        expect(result.success).toBe(true);
        expect(result.data.id).toBe('provider-1');
        expect(mockConfigManager.saveConfig).toHaveBeenCalledTimes(1);
      });

      it('should reject deletion of non-existent provider', async () => {
        const result = await providersManager.deleteProvider('non-existent');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
        expect(result.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
      });
    });
  });

  describe('API Route Handling', () => {
    beforeEach(async () => {
      await providersManager.initialize(mockConfigManager);
    });

    describe('GET Routes', () => {
      it('should handle GET /api/providers (get all)', async () => {
        const response = await providersManager.handle(['providers'], 'GET', '');
        
        expect(response.success).toBe(true);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data).toHaveLength(1);
      });

      it('should handle GET /api/providers/:id (get specific)', async () => {
        const response = await providersManager.handle(['providers', 'provider-1'], 'GET', '');
        
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('provider-1');
      });

      it('should return 404 for non-existent provider', async () => {
        const response = await providersManager.handle(['providers', 'non-existent'], 'GET', '');
        
        expect(response.success).toBe(false);
        expect(response.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND);
      });
    });

    describe('POST Routes', () => {
      it('should handle POST /api/providers (add provider)', async () => {
        const newProviderData = JSON.stringify({
          name: 'New Provider',
          protocol: 'anthropic',
          api_base_url: 'https://api.anthropic.com',
          api_key: ['new-test-key'],
          auth_type: 'api_key'
        });

        const response = await providersManager.handle(['providers'], 'POST', newProviderData);
        
        expect(response.success).toBe(true);
        expect(response.data.name).toBe('New Provider');
      });

      it('should handle POST /api/providers/:id/test (test provider)', async () => {
        const testData = JSON.stringify({ testAllKeys: true });

        const response = await providersManager.handle(['providers', 'provider-1', 'test'], 'POST', testData);
        
        expect(response.success).toBe(true);
        expect(response.data.provider).toBe('Test Provider');
      });
    });

    describe('PUT Routes', () => {
      it('should handle PUT /api/providers/:id (update provider)', async () => {
        const updateData = JSON.stringify({
          name: 'Updated Provider',
          protocol: 'openai',
          api_base_url: 'https://api.updated.com',
          api_key: ['updated-key'],
          auth_type: 'api_key'
        });

        const response = await providersManager.handle(['providers', 'provider-1'], 'PUT', updateData);
        
        expect(response.success).toBe(true);
        expect(response.data.name).toBe('Updated Provider');
      });
    });

    describe('DELETE Routes', () => {
      it('should handle DELETE /api/providers/:id (delete provider)', async () => {
        const response = await providersManager.handle(['providers', 'provider-1'], 'DELETE', '');
        
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('provider-1');
      });
    });

    describe('Error Handling', () => {
      it('should return 405 for unsupported HTTP methods', async () => {
        const response = await providersManager.handle(['providers'], 'PATCH', '');
        
        expect(response.success).toBe(false);
        expect(response.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.METHOD_NOT_ALLOWED);
      });

      it('should return 400 for invalid JSON data', async () => {
        const response = await providersManager.handle(['providers'], 'POST', 'invalid-json');
        
        expect(response.success).toBe(false);
        expect(response.statusCode).toBe(PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      });
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await providersManager.initialize(mockConfigManager);
    });

    it('should handle configuration updates', async () => {
      const newConfig = createMockConfig();
      newConfig.providers.push(createMockProvider('provider-2'));

      await providersManager.onConfigUpdate(newConfig);
      
      const providers = await providersManager.getProviders();
      expect(providers).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      await providersManager.initialize(mockConfigManager);
      await providersManager.destroy();
      
      expect(providersManager.getName()).toBe(PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME);
    });
  });
});
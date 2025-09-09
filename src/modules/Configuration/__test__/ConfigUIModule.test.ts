/**
 * ConfigUIModule Unit Tests
 * Comprehensive test suite following RCC governance requirements
 */

import { ConfigUIModule } from '../src/ConfigUIModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { DataTransfer } from '../../../interfaces/Connection';
import {
  UIAction,
  UIConfigurationRequest,
  WebSocketMessageType,
  UITheme,
  UIExtension,
  UIExtensionType,
  UIPlacement
} from '../interfaces/IConfigUIModule';
import {
  CONFIG_UI_MODULE_INFO,
  CONFIG_UI_WEB_SERVER,
  CONFIG_UI_WEBSOCKET,
  CONFIG_UI_AUTH,
  CONFIG_UI_ERROR_MESSAGES
} from '../constants/ConfigUIModule.constants';

// Mock external dependencies
jest.mock('fastify', () => {
  const mockFastify = {
    register: jest.fn().mockResolvedValue(undefined),
    listen: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    post: jest.fn()
  };
  return {
    fastify: jest.fn(() => mockFastify)
  };
});

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    unref: jest.fn()
  }))
}));

describe('ConfigUIModule', () => {
  let configUIModule: ConfigUIModule;
  let mockModuleInfo: ModuleInfo;

  beforeEach(() => {
    mockModuleInfo = {
      id: 'test-config-ui',
      name: 'Test Config UI Module',
      version: '1.0.0',
      description: 'Test configuration UI module',
      type: 'ui',
      metadata: {}
    };
    configUIModule = new ConfigUIModule(mockModuleInfo);
  });

  afterEach(async () => {
    await configUIModule.destroy();
  });

  describe('Module Lifecycle', () => {
    test('should create instance with default module info when none provided', () => {
      const module = new ConfigUIModule();
      const info = module.getInfo();
      
      expect(info.id).toBe(CONFIG_UI_MODULE_INFO.ID);
      expect(info.name).toBe(CONFIG_UI_MODULE_INFO.NAME);
      expect(info.version).toBe(CONFIG_UI_MODULE_INFO.VERSION);
      expect(info.type).toBe(CONFIG_UI_MODULE_INFO.TYPE);
    });

    test('should create instance with custom module info', () => {
      const info = configUIModule.getInfo();
      
      expect(info.id).toBe(mockModuleInfo.id);
      expect(info.name).toBe(mockModuleInfo.name);
      expect(info.version).toBe(mockModuleInfo.version);
      expect(info.type).toBe(mockModuleInfo.type);
    });

    test('should initialize successfully', async () => {
      await expect(configUIModule.initialize()).resolves.not.toThrow();
    });

    test('should configure before initialization', () => {
      const config = { port: 3005, theme: 'dark' };
      
      expect(() => configUIModule.configure(config)).not.toThrow();
      expect(configUIModule.getConfig()).toEqual(config);
    });

    test('should not allow configuration after initialization', async () => {
      await configUIModule.initialize();
      
      expect(() => configUIModule.configure({ port: 3005 })).toThrow(
        'Cannot configure module after initialization'
      );
    });

    test('should destroy successfully', async () => {
      await configUIModule.initialize();
      await expect(configUIModule.destroy()).resolves.not.toThrow();
    });
  });

  describe('Web Server Management', () => {
    test('should start web server with default port', async () => {
      await expect(configUIModule.startWebServer()).resolves.not.toThrow();
      
      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.port).toBe(CONFIG_UI_WEB_SERVER.DEFAULT_PORT);
      expect(serverInfo.host).toBe(CONFIG_UI_WEB_SERVER.DEFAULT_HOST);
      expect(serverInfo.status).toBe('running');
    });

    test('should start web server with custom port', async () => {
      const customPort = 4000;
      await expect(configUIModule.startWebServer(customPort)).resolves.not.toThrow();
      
      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.port).toBe(customPort);
      expect(serverInfo.status).toBe('running');
    });

    test('should not start server if already running', async () => {
      await configUIModule.startWebServer();
      
      await expect(configUIModule.startWebServer()).rejects.toThrow(
        'Web server is already running'
      );
    });

    test('should stop web server successfully', async () => {
      await configUIModule.startWebServer();
      await expect(configUIModule.stopWebServer()).resolves.not.toThrow();
      
      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.status).toBe('stopped');
      expect(serverInfo.uptime).toBe(0);
    });

    test('should handle stop request when server not running', async () => {
      await expect(configUIModule.stopWebServer()).resolves.not.toThrow();
    });

    test('should get server info with uptime calculation', async () => {
      await configUIModule.startWebServer();
      
      // Wait a bit to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.status).toBe('running');
      expect(serverInfo.uptime).toBeGreaterThan(0);
    });
  });

  describe('Browser Integration', () => {
    test('should open browser with default URL', async () => {
      const { spawn } = require('child_process');
      await configUIModule.startWebServer();
      
      await expect(configUIModule.openBrowser()).resolves.not.toThrow();
      expect(spawn).toHaveBeenCalled();
    });

    test('should open browser with custom URL', async () => {
      const { spawn } = require('child_process');
      const customUrl = 'http://localhost:3000/custom';
      
      await expect(configUIModule.openBrowser(customUrl)).resolves.not.toThrow();
      expect(spawn).toHaveBeenCalled();
    });

    test('should handle browser launch failure', async () => {
      const { spawn } = require('child_process');
      spawn.mockImplementationOnce(() => {
        throw new Error('Browser not found');
      });
      
      await expect(configUIModule.openBrowser()).rejects.toThrow(
        CONFIG_UI_ERROR_MESSAGES.BROWSER_LAUNCH_FAILED
      );
    });
  });

  describe('Configuration Request Handling', () => {
    test('should handle GET configuration request', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId: 'test-session',
        timestamp: Date.now(),
        section: 'server'
      };

      // Create mock session
      const mockSession = {
        id: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.timestamp).toBeDefined();
      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle UPDATE configuration request', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.UPDATE,
        sessionId: 'test-session',
        timestamp: Date.now(),
        data: { key: 'value' }
      };

      // Create mock session
      const mockSession = {
        id: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ key: 'value' });
    });

    test('should handle VALIDATE configuration request', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.VALIDATE,
        sessionId: 'test-session',
        timestamp: Date.now(),
        data: { config: 'test' }
      };

      // Create mock session
      const mockSession = {
        id: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.validationResult).toBeDefined();
      expect(response.validationResult?.isValid).toBe(true);
    });

    test('should reject request with invalid session', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId: 'invalid-session',
        timestamp: Date.now()
      };

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(false);
      expect(response.errors).toContain(CONFIG_UI_ERROR_MESSAGES.INVALID_SESSION);
    });

    test('should handle SAVE_AND_RESTART request with restart flag', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.SAVE_AND_RESTART,
        sessionId: 'test-session',
        timestamp: Date.now(),
        data: { restart: true }
      };

      // Create mock session
      const mockSession = {
        id: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.metadata?.requiresRestart).toBe(true);
    });

    test('should handle BACKUP configuration request', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.BACKUP,
        sessionId: 'test-session',
        timestamp: Date.now()
      };

      // Create mock session
      const mockSession = {
        id: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.metadata?.backupCreated).toBeDefined();
      expect(response.metadata?.backupCreated).toMatch(/^backup-\d+\.json$/);
    });
  });

  describe('UI Theme Management', () => {
    test('should set UI theme successfully', () => {
      const customTheme: UITheme = {
        name: 'dark',
        colors: {
          primary: '#333333',
          secondary: '#666666',
          background: '#000000',
          surface: '#111111',
          error: '#ff0000',
          warning: '#ffaa00',
          info: '#0088ff',
          success: '#00ff00',
          text: {
            primary: '#ffffff',
            secondary: '#cccccc',
            disabled: '#888888'
          }
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          fontSize: { xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '18px' },
          fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 }
        },
        spacing: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
        components: {
          button: {
            background: '#333333',
            border: '1px solid #666666',
            borderRadius: '4px',
            padding: '8px 16px',
            margin: '4px',
            fontSize: '14px',
            color: '#ffffff'
          },
          input: {
            background: '#111111',
            border: '1px solid #666666',
            borderRadius: '4px',
            padding: '8px 12px',
            margin: '4px 0',
            fontSize: '14px',
            color: '#ffffff'
          },
          panel: {
            background: '#111111',
            border: '1px solid #666666',
            borderRadius: '6px',
            padding: '16px',
            margin: '8px',
            fontSize: '14px',
            color: '#ffffff'
          },
          modal: {
            background: '#111111',
            border: 'none',
            borderRadius: '6px',
            padding: '24px',
            margin: '0',
            fontSize: '14px',
            color: '#ffffff'
          }
        }
      };

      expect(() => configUIModule.setUITheme(customTheme)).not.toThrow();
    });

    test('should preserve theme immutability', () => {
      const originalTheme: UITheme = {
        name: 'original',
        colors: {
          primary: '#000000',
          secondary: '#111111',
          background: '#ffffff',
          surface: '#f5f5f5',
          error: '#ff0000',
          warning: '#ffaa00',
          info: '#0088ff',
          success: '#00ff00',
          text: { primary: '#000000', secondary: '#666666', disabled: '#cccccc' }
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '18px' },
          fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 }
        },
        spacing: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
        components: {
          button: { background: '', border: '', borderRadius: '', padding: '', margin: '', fontSize: '', color: '' },
          input: { background: '', border: '', borderRadius: '', padding: '', margin: '', fontSize: '', color: '' },
          panel: { background: '', border: '', borderRadius: '', padding: '', margin: '', fontSize: '', color: '' },
          modal: { background: '', border: '', borderRadius: '', padding: '', margin: '', fontSize: '', color: '' }
        }
      };

      configUIModule.setUITheme(originalTheme);
      
      // Modify the original theme object
      originalTheme.name = 'modified';
      originalTheme.colors.primary = '#ff0000';
      
      // The module's theme should not be affected
      const currentTheme = (configUIModule as any).currentTheme;
      expect(currentTheme.name).toBe('original');
      expect(currentTheme.colors.primary).toBe('#000000');
    });
  });

  describe('UI Extension Management', () => {
    test('should register UI extension successfully', () => {
      const mockExtension: UIExtension = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension',
        type: UIExtensionType.PANEL,
        component: {} as any, // Mock React component
        placement: UIPlacement.SIDEBAR,
        permissions: ['read', 'write']
      };

      expect(() => configUIModule.registerUIExtension(mockExtension)).not.toThrow();
    });

    test('should prevent duplicate extension registration', () => {
      const mockExtension: UIExtension = {
        id: 'duplicate-extension',
        name: 'Duplicate Extension',
        version: '1.0.0',
        description: 'A duplicate extension',
        type: UIExtensionType.WIDGET,
        component: {} as any,
        placement: UIPlacement.MAIN,
        permissions: []
      };

      configUIModule.registerUIExtension(mockExtension);
      
      expect(() => configUIModule.registerUIExtension(mockExtension)).toThrow(
        "Extension with ID 'duplicate-extension' is already registered"
      );
    });

    test('should handle multiple extensions with different IDs', () => {
      const extension1: UIExtension = {
        id: 'extension-1',
        name: 'Extension 1',
        version: '1.0.0',
        description: 'First extension',
        type: UIExtensionType.TOOLBAR,
        component: {} as any,
        placement: UIPlacement.HEADER,
        permissions: []
      };

      const extension2: UIExtension = {
        id: 'extension-2',
        name: 'Extension 2',
        version: '1.0.0',
        description: 'Second extension',
        type: UIExtensionType.MENU,
        component: {} as any,
        placement: UIPlacement.FOOTER,
        permissions: []
      };

      expect(() => configUIModule.registerUIExtension(extension1)).not.toThrow();
      expect(() => configUIModule.registerUIExtension(extension2)).not.toThrow();
    });
  });

  describe('Data Transfer and Communication', () => {
    test('should receive data from connected modules', async () => {
      const dataTransfer: DataTransfer = {
        id: 'test-transfer',
        sourceConnectionId: 'source-connection',
        targetConnectionId: 'target-connection',
        data: { message: 'test data' },
        timestamp: Date.now(),
        metadata: { sourceModuleType: 'config-validator' }
      };

      await expect(configUIModule.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should handle validation result data', async () => {
      const dataTransfer: DataTransfer = {
        id: 'validation-transfer',
        sourceConnectionId: 'validator-connection',
        targetConnectionId: 'ui-connection',
        data: { isValid: true, errors: [], warnings: [] },
        timestamp: Date.now(),
        metadata: { sourceModuleType: 'config-validator' }
      };

      await expect(configUIModule.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should handle configuration data from persistence module', async () => {
      const dataTransfer: DataTransfer = {
        id: 'persistence-transfer',
        sourceConnectionId: 'persistence-connection',
        targetConnectionId: 'ui-connection',
        data: { configuration: { server: { port: 3000 } } },
        timestamp: Date.now(),
        metadata: { sourceModuleType: 'config-persistence' }
      };

      await expect(configUIModule.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should broadcast configuration updates', async () => {
      const updateData = { section: 'server', changes: { port: 3001 } };
      
      await expect(configUIModule.broadcastConfigurationUpdate(updateData)).resolves.not.toThrow();
    });

    test('should handle invalid data transfer gracefully', async () => {
      const invalidDataTransfer: DataTransfer = {
        id: 'invalid-transfer',
        sourceConnectionId: 'invalid-connection',
        targetConnectionId: 'ui-connection',
        data: null, // Invalid data
        timestamp: Date.now(),
        metadata: {}
      };

      // Should not throw, but should log warning
      await expect(configUIModule.receiveData(invalidDataTransfer)).resolves.not.toThrow();
    });
  });

  describe('Session Management', () => {
    test('should validate active sessions', () => {
      const sessionId = 'test-session-validation';
      const mockSession = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, mockSession);
      
      const isValid = (configUIModule as any).validateSession(sessionId);
      expect(isValid).toBe(true);
    });

    test('should reject expired sessions', () => {
      const sessionId = 'expired-session';
      const expiredSession = {
        id: sessionId,
        startTime: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        lastActivity: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        permissions: [],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, expiredSession);
      
      const isValid = (configUIModule as any).validateSession(sessionId);
      expect(isValid).toBe(false);
    });

    test('should reject non-existent sessions', () => {
      const isValid = (configUIModule as any).validateSession('non-existent-session');
      expect(isValid).toBe(false);
    });

    test('should update session activity', () => {
      const sessionId = 'activity-update-session';
      const initialActivity = Date.now() - 1000;
      const mockSession = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: initialActivity,
        permissions: [],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, mockSession);
      (configUIModule as any).updateSessionActivity(sessionId);
      
      const updatedSession = (configUIModule as any).activeSessions.get(sessionId);
      expect(updatedSession.lastActivity).toBeGreaterThan(initialActivity);
    });

    test('should clean up expired sessions', () => {
      const activeSessionId = 'active-session';
      const expiredSessionId = 'expired-session';
      
      const activeSession = {
        id: activeSessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      
      const expiredSession = {
        id: expiredSessionId,
        startTime: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        lastActivity: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        permissions: [],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(activeSessionId, activeSession);
      (configUIModule as any).activeSessions.set(expiredSessionId, expiredSession);
      
      (configUIModule as any).cleanupExpiredSessions();
      
      expect((configUIModule as any).activeSessions.has(activeSessionId)).toBe(true);
      expect((configUIModule as any).activeSessions.has(expiredSessionId)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle server start failure gracefully', async () => {
      // Mock fastify to throw error
      const mockFastify = require('fastify').fastify;
      mockFastify.mockImplementationOnce(() => {
        throw new Error('Port already in use');
      });

      await expect(configUIModule.startWebServer()).rejects.toThrow(
        CONFIG_UI_ERROR_MESSAGES.SERVER_START_FAILED
      );
      
      expect(configUIModule.getServerInfo().status).toBe('error');
    });

    test('should handle server stop failure gracefully', async () => {
      await configUIModule.startWebServer();
      
      // Mock server close to throw error
      const server = (configUIModule as any).server;
      server.close.mockRejectedValueOnce(new Error('Server close failed'));

      await expect(configUIModule.stopWebServer()).rejects.toThrow(
        CONFIG_UI_ERROR_MESSAGES.SERVER_STOP_FAILED
      );
    });

    test('should create proper error responses', () => {
      const startTime = Date.now();
      const errorMessage = 'Test error message';
      
      const errorResponse = (configUIModule as any).createErrorResponse(errorMessage, startTime);
      
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.errors).toContain(errorMessage);
      expect(errorResponse.timestamp).toBeDefined();
      expect(errorResponse.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle WebSocket client errors gracefully', () => {
      const mockClient = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
        close: jest.fn()
      };

      const sessionId = 'error-client-session';
      (configUIModule as any).websocketClients.set(sessionId, mockClient);
      
      const message = {
        type: WebSocketMessageType.HEARTBEAT,
        data: { timestamp: Date.now() },
        timestamp: Date.now()
      };

      expect(() => {
        (configUIModule as any).broadcastWebSocketMessage(message);
      }).not.toThrow();
      
      // Client should be removed from the list
      expect((configUIModule as any).websocketClients.has(sessionId)).toBe(false);
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track request processing time', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId: 'perf-test-session',
        timestamp: Date.now()
      };

      // Create mock session
      const mockSession = {
        id: 'perf-test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: [],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('perf-test-session', mockSession);

      const response = await configUIModule.handleConfigurationRequest(request);
      
      expect(response.metadata?.processingTime).toBeDefined();
      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle large data transfers efficiently', async () => {
      const largeData = {
        configuration: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `config-${i}`,
          value: `value-${i}`,
          metadata: { created: Date.now(), updated: Date.now() }
        }))
      };

      const dataTransfer: DataTransfer = {
        id: 'large-transfer',
        sourceConnectionId: 'large-source',
        targetConnectionId: 'ui-connection',
        data: largeData,
        timestamp: Date.now(),
        metadata: {}
      };

      const startTime = Date.now();
      await expect(configUIModule.receiveData(dataTransfer)).resolves.not.toThrow();
      const processingTime = Date.now() - startTime;
      
      // Should process large data within reasonable time (< 1 second)
      expect(processingTime).toBeLessThan(1000);
    });
  });

  describe('Integration Points', () => {
    test('should properly handle module handshake', async () => {
      const targetModule = new ConfigUIModule();
      
      const result = await configUIModule.handshake(targetModule);
      expect(result).toBe(true);
      
      await targetModule.destroy();
    });

    test('should maintain connection integrity during operations', async () => {
      const connectionInfo = {
        id: 'test-connection',
        type: 'output' as const,
        targetModuleId: 'target-module',
        dataTypes: ['configuration'],
        metadata: {}
      };

      configUIModule.addOutputConnection(connectionInfo);
      
      const connections = configUIModule.getOutputConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('test-connection');
    });

    test('should validate input data according to rules', () => {
      const validData = {
        action: UIAction.GET,
        sessionId: 'test-session',
        timestamp: Date.now()
      };

      const invalidData = {
        action: UIAction.GET
        // Missing required fields
      };

      const validResult = (configUIModule as any).validateInput(validData);
      const invalidResult = (configUIModule as any).validateInput(invalidData);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});
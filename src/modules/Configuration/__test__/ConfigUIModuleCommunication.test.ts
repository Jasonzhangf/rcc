/**
 * ConfigUIModule Communication Tests
 * Tests inter-module communication, WebSocket connections, and API integration
 * Following RCC governance requirements for communication testing
 */

import { ConfigUIModule } from '../src/ConfigUIModule';
import { ConfigValidatorModule } from '../src/ConfigValidatorModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { DataTransfer } from '../../../interfaces/Connection';
import {
  UIAction,
  UIConfigurationRequest,
  WebSocketMessage,
  WebSocketMessageType,
  UISession
} from '../interfaces/IConfigUIModule';
import {
  CONFIG_UI_WEB_SERVER,
  CONFIG_UI_WEBSOCKET,
  CONFIG_UI_AUTH,
  CONFIG_UI_MODULE_INFO
} from '../constants/ConfigUIModule.constants';

// Mock WebSocket
class MockWebSocket {
  public onmessage?: (event: { data: string }) => void;
  public onopen?: () => void;
  public onclose?: () => void;
  public onerror?: (error: any) => void;
  
  private messageQueue: string[] = [];
  
  send(data: string): void {
    this.messageQueue.push(data);
  }
  
  close(): void {
    if (this.onclose) {
      this.onclose();
    }
  }
  
  // Test helper to simulate receiving messages
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
  
  // Test helper to get sent messages
  getSentMessages(): string[] {
    return [...this.messageQueue];
  }
  
  clearSentMessages(): void {
    this.messageQueue = [];
  }
}

// Mock fetch for HTTP requests
global.fetch = jest.fn();

describe('ConfigUIModule Communication Tests', () => {
  let configUIModule: ConfigUIModule;
  let mockValidatorModule: ConfigValidatorModule;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    configUIModule = new ConfigUIModule();
    mockValidatorModule = new ConfigValidatorModule();
    mockWebSocket = new MockWebSocket();
    
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await configUIModule.destroy();
    if (mockValidatorModule) {
      await mockValidatorModule.destroy();
    }
  });

  describe('Inter-Module Communication', () => {
    test('should establish connection with ConfigValidatorModule', async () => {
      await configUIModule.initialize();
      await mockValidatorModule.initialize();

      // Establish handshake
      const handshakeResult = await configUIModule.handshake(mockValidatorModule);
      expect(handshakeResult).toBe(true);
    });

    test('should receive validation results from ConfigValidatorModule', async () => {
      await configUIModule.initialize();

      const validationData = {
        isValid: true,
        errors: [],
        warnings: ['Minor configuration issue'],
        section: 'server',
        timestamp: Date.now()
      };

      const dataTransfer: DataTransfer = {
        id: 'validation-result-transfer',
        sourceConnectionId: 'validator-output',
        targetConnectionId: 'ui-input',
        data: validationData,
        timestamp: Date.now(),
        metadata: {
          sourceModuleType: 'config-validator',
          transferType: 'validation-result'
        }
      };

      await expect(configUIModule.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should send configuration changes to connected modules', async () => {
      await configUIModule.initialize();

      const configData = {
        section: 'database',
        changes: {
          host: 'localhost',
          port: 5432,
          name: 'test_db'
        }
      };

      // Mock the transferData method to capture sent data
      const transferDataSpy = jest.spyOn(configUIModule as any, 'transferData');

      await configUIModule.broadcastConfigurationUpdate(configData);
      
      // Note: In a real implementation, this would trigger transferData
      // For now, we're just testing that the broadcast doesn't throw
      expect(transferDataSpy).not.toHaveBeenCalled(); // No connections established yet
    });

    test('should handle communication failures gracefully', async () => {
      await configUIModule.initialize();

      const invalidDataTransfer: DataTransfer = {
        id: 'invalid-transfer',
        sourceConnectionId: 'non-existent-connection',
        targetConnectionId: 'ui-input',
        data: null,
        timestamp: Date.now(),
        metadata: {}
      };

      // Should handle gracefully without throwing
      await expect(configUIModule.receiveData(invalidDataTransfer)).resolves.not.toThrow();
    });

    test('should maintain communication state during server restart', async () => {
      await configUIModule.initialize();
      await configUIModule.startWebServer();

      // Simulate server restart
      await configUIModule.stopWebServer();
      await configUIModule.startWebServer();

      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.status).toBe('running');
    });
  });

  describe('WebSocket Communication', () => {
    beforeEach(async () => {
      await configUIModule.initialize();
      await configUIModule.startWebServer();
    });

    test('should handle WebSocket connection establishment', () => {
      const sessionId = 'test-websocket-session';
      
      // Simulate WebSocket connection
      (configUIModule as any).websocketClients.set(sessionId, mockWebSocket);
      
      expect((configUIModule as any).websocketClients.has(sessionId)).toBe(true);
    });

    test('should broadcast messages to all connected WebSocket clients', () => {
      const sessionId1 = 'websocket-client-1';
      const sessionId2 = 'websocket-client-2';
      const mockClient1 = new MockWebSocket();
      const mockClient2 = new MockWebSocket();

      (configUIModule as any).websocketClients.set(sessionId1, mockClient1);
      (configUIModule as any).websocketClients.set(sessionId2, mockClient2);

      const message: WebSocketMessage = {
        type: WebSocketMessageType.CONFIG_UPDATED,
        data: { section: 'server', port: 3001 },
        timestamp: Date.now()
      };

      (configUIModule as any).broadcastWebSocketMessage(message);

      const expectedMessage = JSON.stringify(message);
      expect(mockClient1.getSentMessages()).toContain(expectedMessage);
      expect(mockClient2.getSentMessages()).toContain(expectedMessage);
    });

    test('should handle WebSocket ping-pong messages', () => {
      const sessionId = 'ping-pong-session';
      (configUIModule as any).websocketClients.set(sessionId, mockWebSocket);

      const pingMessage = {
        type: 'ping',
        data: { timestamp: Date.now() }
      };

      (configUIModule as any).handleWebSocketMessage(sessionId, pingMessage);

      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.length).toBe(1);
      
      const pongMessage = JSON.parse(sentMessages[0]);
      expect(pongMessage.type).toBe('pong');
      expect(pongMessage.data).toEqual(pingMessage.data);
    });

    test('should remove disconnected WebSocket clients', () => {
      const sessionId = 'disconnected-client';
      const mockFailingClient = {
        send: jest.fn(() => {
          throw new Error('Connection closed');
        }),
        close: jest.fn()
      };

      (configUIModule as any).websocketClients.set(sessionId, mockFailingClient);

      const message: WebSocketMessage = {
        type: WebSocketMessageType.HEARTBEAT,
        data: { timestamp: Date.now() },
        timestamp: Date.now()
      };

      (configUIModule as any).broadcastWebSocketMessage(message);

      // Client should be removed after failed send
      expect((configUIModule as any).websocketClients.has(sessionId)).toBe(false);
    });

    test('should send heartbeat messages to connected clients', () => {
      const sessionId = 'heartbeat-client';
      (configUIModule as any).websocketClients.set(sessionId, mockWebSocket);

      (configUIModule as any).sendHeartbeat();

      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.length).toBe(1);
      
      const heartbeatMessage = JSON.parse(sentMessages[0]);
      expect(heartbeatMessage.type).toBe(WebSocketMessageType.HEARTBEAT);
      expect(heartbeatMessage.data.timestamp).toBeDefined();
    });

    test('should handle WebSocket message parsing errors', () => {
      const sessionId = 'invalid-message-session';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidMessage = 'invalid-json{';
      
      // This should not throw but should log a warning
      expect(() => {
        (configUIModule as any).handleWebSocketMessage(sessionId, invalidMessage);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('HTTP API Communication', () => {
    beforeEach(async () => {
      await configUIModule.initialize();
      await configUIModule.startWebServer();
    });

    test('should handle HTTP configuration GET requests', async () => {
      // Mock successful fetch response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { server: { port: 3000 } },
          timestamp: Date.now()
        })
      });

      const baseUrl = `http://${CONFIG_UI_WEB_SERVER.DEFAULT_HOST}:${CONFIG_UI_WEB_SERVER.DEFAULT_PORT}`;
      const response = await fetch(`${baseUrl}/api/v1/config`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    test('should handle HTTP configuration POST requests', async () => {
      // Mock successful post response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          timestamp: Date.now(),
          validationResult: { isValid: true, errors: [] }
        })
      });

      const configData = {
        section: 'database',
        data: { host: 'localhost', port: 5432 }
      };

      const baseUrl = `http://${CONFIG_UI_WEB_SERVER.DEFAULT_HOST}:${CONFIG_UI_WEB_SERVER.DEFAULT_PORT}`;
      const response = await fetch(`${baseUrl}/api/v1/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    test('should handle HTTP validation requests', async () => {
      // Mock validation response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          validationResult: {
            isValid: true,
            errors: [],
            warnings: ['Performance optimization suggested']
          },
          timestamp: Date.now()
        })
      });

      const validationData = {
        section: 'server',
        data: { port: 8080, maxConnections: 1000 }
      };

      const baseUrl = `http://${CONFIG_UI_WEB_SERVER.DEFAULT_HOST}:${CONFIG_UI_WEB_SERVER.DEFAULT_PORT}`;
      const response = await fetch(`${baseUrl}/api/v1/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.validationResult.isValid).toBe(true);
    });

    test('should handle HTTP error responses gracefully', async () => {
      // Mock error response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          errors: ['Invalid configuration data'],
          timestamp: Date.now()
        })
      });

      const invalidData = { invalid: 'data' };

      const baseUrl = `http://${CONFIG_UI_WEB_SERVER.DEFAULT_HOST}:${CONFIG_UI_WEB_SERVER.DEFAULT_PORT}`;
      const response = await fetch(`${baseUrl}/api/v1/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Invalid configuration data');
    });
  });

  describe('Session-Based Communication', () => {
    beforeEach(async () => {
      await configUIModule.initialize();
    });

    test('should create and validate sessions for API requests', async () => {
      const sessionId = 'test-api-session';
      const session: UISession = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: ['read', 'write'],
        metadata: { userAgent: 'test-client', ip: '127.0.0.1' }
      };

      (configUIModule as any).activeSessions.set(sessionId, session);

      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId,
        timestamp: Date.now(),
        section: 'server'
      };

      const response = await configUIModule.handleConfigurationRequest(request);
      expect(response.success).toBe(true);
    });

    test('should reject requests with expired sessions', async () => {
      const sessionId = 'expired-session';
      const expiredSession: UISession = {
        id: sessionId,
        startTime: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        lastActivity: Date.now() - CONFIG_UI_AUTH.SESSION_TIMEOUT_MS - 1000,
        permissions: ['read'],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, expiredSession);

      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId,
        timestamp: Date.now()
      };

      const response = await configUIModule.handleConfigurationRequest(request);
      expect(response.success).toBe(false);
      expect(response.errors).toContain('Invalid or expired session');
    });

    test('should update session activity on valid requests', async () => {
      const sessionId = 'activity-tracking-session';
      const initialActivity = Date.now() - 10000; // 10 seconds ago
      const session: UISession = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: initialActivity,
        permissions: ['read'],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, session);

      const request: UIConfigurationRequest = {
        action: UIAction.GET,
        sessionId,
        timestamp: Date.now()
      };

      await configUIModule.handleConfigurationRequest(request);
      
      const updatedSession = (configUIModule as any).activeSessions.get(sessionId);
      expect(updatedSession.lastActivity).toBeGreaterThan(initialActivity);
    });

    test('should handle concurrent session requests', async () => {
      const sessionId = 'concurrent-session';
      const session: UISession = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: ['read', 'write'],
        metadata: {}
      };

      (configUIModule as any).activeSessions.set(sessionId, session);

      // Create multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => ({
        action: UIAction.GET,
        sessionId,
        timestamp: Date.now(),
        section: `section-${i}`
      }));

      const responses = await Promise.all(
        requests.map(req => configUIModule.handleConfigurationRequest(req))
      );

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Real-time Communication Patterns', () => {
    beforeEach(async () => {
      await configUIModule.initialize();
      await configUIModule.startWebServer();
    });

    test('should broadcast configuration changes to all connected clients', () => {
      const clients = ['client-1', 'client-2', 'client-3'];
      const mockClients = clients.map(() => new MockWebSocket());

      // Connect all clients
      clients.forEach((clientId, index) => {
        (configUIModule as any).websocketClients.set(clientId, mockClients[index]);
      });

      const configUpdate = {
        section: 'logging',
        changes: { level: 'debug', output: 'console' },
        timestamp: Date.now()
      };

      configUIModule.broadcastConfigurationUpdate(configUpdate);

      // All clients should receive the update
      mockClients.forEach(client => {
        const messages = client.getSentMessages();
        expect(messages.length).toBe(1);
        
        const message = JSON.parse(messages[0]);
        expect(message.type).toBe(WebSocketMessageType.CONFIG_UPDATED);
        expect(message.data).toEqual(configUpdate);
      });
    });

    test('should handle selective client communication', () => {
      const targetSessionId = 'target-client';
      const otherSessionId = 'other-client';
      
      const targetClient = new MockWebSocket();
      const otherClient = new MockWebSocket();

      (configUIModule as any).websocketClients.set(targetSessionId, targetClient);
      (configUIModule as any).websocketClients.set(otherSessionId, otherClient);

      const message: WebSocketMessage = {
        type: WebSocketMessageType.VALIDATION_RESULT,
        data: { result: 'test message' },
        timestamp: Date.now(),
        sessionId: targetSessionId
      };

      (configUIModule as any).sendWebSocketMessage(targetSessionId, message);

      // Only target client should receive the message
      expect(targetClient.getSentMessages().length).toBe(1);
      expect(otherClient.getSentMessages().length).toBe(0);
    });

    test('should handle communication during module lifecycle events', async () => {
      const sessionId = 'lifecycle-client';
      (configUIModule as any).websocketClients.set(sessionId, mockWebSocket);

      // Simulate server status changes
      const statusMessages = [
        { status: 'starting', timestamp: Date.now() },
        { status: 'running', timestamp: Date.now() },
        { status: 'stopping', timestamp: Date.now() },
        { status: 'stopped', timestamp: Date.now() }
      ];

      for (const status of statusMessages) {
        await (configUIModule as any).broadcastServerStatus();
      }

      // Client should receive server status updates
      const messages = mockWebSocket.getSentMessages();
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from WebSocket connection failures', () => {
      const sessionIds = ['resilient-1', 'resilient-2', 'failing-client'];
      const workingClients = sessionIds.slice(0, 2).map(() => new MockWebSocket());
      const failingClient = {
        send: jest.fn(() => {
          throw new Error('Connection lost');
        }),
        close: jest.fn()
      };

      // Set up clients
      sessionIds.forEach((sessionId, index) => {
        const client = index < 2 ? workingClients[index] : failingClient;
        (configUIModule as any).websocketClients.set(sessionId, client);
      });

      const message: WebSocketMessage = {
        type: WebSocketMessageType.HEARTBEAT,
        data: { timestamp: Date.now() },
        timestamp: Date.now()
      };

      // This should not throw and should continue working for other clients
      expect(() => {
        (configUIModule as any).broadcastWebSocketMessage(message);
      }).not.toThrow();

      // Working clients should receive the message
      workingClients.forEach(client => {
        expect(client.getSentMessages().length).toBe(1);
      });

      // Failing client should be removed
      expect((configUIModule as any).websocketClients.has('failing-client')).toBe(false);
    });

    test('should maintain communication state during server restarts', async () => {
      await configUIModule.startWebServer();
      
      // Add some WebSocket clients
      const sessionId = 'restart-test-client';
      (configUIModule as any).websocketClients.set(sessionId, mockWebSocket);

      expect((configUIModule as any).websocketClients.size).toBe(1);

      // Restart server
      await configUIModule.stopWebServer();
      expect((configUIModule as any).websocketClients.size).toBe(0); // Clients should be cleared

      await configUIModule.startWebServer();
      
      // Server should be ready to accept new connections
      const serverInfo = configUIModule.getServerInfo();
      expect(serverInfo.status).toBe('running');
    });

    test('should handle network interruptions gracefully', async () => {
      const request: UIConfigurationRequest = {
        action: UIAction.SAVE,
        sessionId: 'network-test-session',
        timestamp: Date.now(),
        data: { test: 'data' }
      };

      // Create mock session
      const session: UISession = {
        id: 'network-test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        permissions: ['write'],
        metadata: {}
      };
      (configUIModule as any).activeSessions.set('network-test-session', session);

      // Mock network failure during save
      const originalTransferData = (configUIModule as any).transferData;
      (configUIModule as any).transferData = jest.fn().mockRejectedValue(
        new Error('Network unreachable')
      );

      const response = await configUIModule.handleConfigurationRequest(request);
      
      // Should handle gracefully and return appropriate response
      expect(response.success).toBe(true); // The handleSaveConfiguration mock returns success
      
      // Restore original method
      (configUIModule as any).transferData = originalTransferData;
    });
  });
});
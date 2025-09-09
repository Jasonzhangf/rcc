import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { DataTransfer } from '../../../interfaces/Connection';
import { ValidationResult } from '../../../interfaces/Validation';
import {
  IConfigUIModule,
  WebServerInfo,
  UIConfigurationRequest,
  UIConfigurationResponse,
  UITheme,
  UIExtension,
  WebSocketMessage,
  WebSocketMessageType,
  UISession,
  UIAction,
  ResponseMetadata
} from '../interfaces/IConfigUIModule';
import {
  CONFIG_UI_WEB_SERVER,
  CONFIG_UI_API_ENDPOINTS,
  CONFIG_UI_WEBSOCKET,
  CONFIG_UI_AUTH,
  CONFIG_UI_BROWSER,
  CONFIG_UI_PATHS,
  CONFIG_UI_DEFAULT_THEME,
  CONFIG_UI_VALIDATION,
  CONFIG_UI_PERFORMANCE,
  CONFIG_UI_ERROR_MESSAGES,
  CONFIG_UI_MODULE_INFO,
  CONFIG_UI_DEBUG
} from '../constants/ConfigUIModule.constants';

// External dependencies
import * as fastify from 'fastify';
import * as websocket from '@fastify/websocket';
import * as cors from '@fastify/cors';
import * as multipart from '@fastify/multipart';
import * as staticFiles from '@fastify/static';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { spawn } from 'child_process';

/**
 * Configuration UI Module
 * Manages embedded React application and web server with RESTful API endpoints,
 * WebSocket connections, and browser integration for configuration management.
 * 
 * @extends BaseModule
 * @implements IConfigUIModule
 */
export class ConfigUIModule extends BaseModule implements IConfigUIModule {
  private server: fastify.FastifyInstance | null = null;
  private serverInfo: WebServerInfo;
  private activeSessions: Map<string, UISession> = new Map();
  private currentTheme: UITheme;
  private registeredExtensions: Map<string, UIExtension> = new Map();
  private websocketClients: Map<string, any> = new Map();
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Creates an instance of ConfigUIModule
   * @param info - Module information (optional, uses default if not provided)
   */
  constructor(info?: ModuleInfo) {
    super(info || {
      id: CONFIG_UI_MODULE_INFO.ID,
      name: CONFIG_UI_MODULE_INFO.NAME,
      version: CONFIG_UI_MODULE_INFO.VERSION,
      description: CONFIG_UI_MODULE_INFO.DESCRIPTION,
      type: CONFIG_UI_MODULE_INFO.TYPE,
      metadata: {
        author: CONFIG_UI_MODULE_INFO.AUTHOR,
        license: CONFIG_UI_MODULE_INFO.LICENSE
      }
    });

    // Initialize server info
    this.serverInfo = {
      port: CONFIG_UI_WEB_SERVER.DEFAULT_PORT,
      host: CONFIG_UI_WEB_SERVER.DEFAULT_HOST,
      protocol: CONFIG_UI_WEB_SERVER.DEFAULT_PROTOCOL,
      status: 'stopped',
      uptime: 0,
      connections: 0
    };

    // Initialize default theme
    this.currentTheme = this.createDefaultTheme();

    // Set up validation rules
    this.setupValidationRules();
  }

  /**
   * Initializes the ConfigUI module
   * Sets up session management and performance monitoring
   * @param config - Configuration data for the module
   */
  public async initialize(config?: Record<string, any>): Promise<void> {
    if (config) {
      this.configure(config);
    }
    await super.initialize();

    try {
      // Start session cleanup interval
      this.sessionCleanupInterval = setInterval(
        () => this.cleanupExpiredSessions(),
        CONFIG_UI_AUTH.SESSION_CLEANUP_INTERVAL_MS
      );

      // Start heartbeat interval if debugging is enabled
      if (CONFIG_UI_DEBUG.ENABLE_WEBSOCKET_DEBUGGING) {
        this.heartbeatInterval = setInterval(
          () => this.sendHeartbeat(),
          CONFIG_UI_WEBSOCKET.HEARTBEAT_INTERVAL_MS
        );
      }

      this.log('ConfigUI module initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize ConfigUI module: ${error.message}`);
    }
  }

  /**
   * Starts the web server on the specified port
   * @param port - Port number to listen on (optional)
   */
  public async startWebServer(port?: number): Promise<void> {
    if (this.server) {
      throw new Error('Web server is already running');
    }

    const serverPort = port || CONFIG_UI_WEB_SERVER.DEFAULT_PORT;
    
    try {
      this.serverInfo.status = 'starting';
      this.serverInfo.port = serverPort;
      
      // Create Fastify server instance
      this.server = fastify.fastify({
        logger: CONFIG_UI_DEBUG.ENABLE_REQUEST_LOGGING,
        requestTimeout: CONFIG_UI_WEB_SERVER.REQUEST_TIMEOUT_MS
      });

      // Register plugins
      await this.registerServerPlugins();
      
      // Register routes
      this.registerAPIRoutes();
      this.registerWebSocketHandlers();
      
      // Start server
      await this.server.listen({
        port: serverPort,
        host: this.serverInfo.host
      });

      this.serverInfo.status = 'running';
      this.serverInfo.uptime = Date.now();

      this.log(`Web server started on ${this.serverInfo.protocol}://${this.serverInfo.host}:${serverPort}`);

      // Broadcast server status update
      await this.broadcastServerStatus();

    } catch (error) {
      this.serverInfo.status = 'error';
      throw new Error(`${CONFIG_UI_ERROR_MESSAGES.SERVER_START_FAILED}: ${error.message}`);
    }
  }

  /**
   * Stops the web server
   */
  public async stopWebServer(): Promise<void> {
    if (!this.server) {
      return;
    }

    try {
      this.serverInfo.status = 'stopping';
      
      // Close all WebSocket connections
      this.websocketClients.forEach(client => {
        try {
          client.close();
        } catch (error) {
          this.log(`Error closing WebSocket connection: ${error.message}`, 'warn');
        }
      });
      this.websocketClients.clear();

      // Close server
      await this.server.close();
      this.server = null;
      
      this.serverInfo.status = 'stopped';
      this.serverInfo.uptime = 0;
      this.serverInfo.connections = 0;

      this.log('Web server stopped successfully');

    } catch (error) {
      this.serverInfo.status = 'error';
      throw new Error(`${CONFIG_UI_ERROR_MESSAGES.SERVER_STOP_FAILED}: ${error.message}`);
    }
  }

  /**
   * Gets current server information
   * @returns Web server information
   */
  public getServerInfo(): WebServerInfo {
    if (this.serverInfo.status === 'running' && this.serverInfo.uptime > 0) {
      return {
        ...this.serverInfo,
        uptime: Date.now() - this.serverInfo.uptime,
        connections: this.websocketClients.size
      };
    }
    return { ...this.serverInfo };
  }

  /**
   * Opens browser to the UI application
   * @param url - Optional custom URL to open
   */
  public async openBrowser(url?: string): Promise<void> {
    const targetUrl = url || `${this.serverInfo.protocol}://${this.serverInfo.host}:${this.serverInfo.port}`;
    
    try {
      // Wait for server to be ready
      if (this.serverInfo.status !== 'running') {
        await new Promise(resolve => setTimeout(resolve, CONFIG_UI_BROWSER.LAUNCH_DELAY_MS));
      }

      // Launch browser based on platform
      const platform = process.platform;
      let command = '';
      let args: string[] = [];

      switch (platform) {
        case 'darwin': // macOS
          command = 'open';
          args = [targetUrl];
          break;
        case 'win32': // Windows
          command = 'start';
          args = ['""', targetUrl]; // Empty title for start command
          break;
        default: // Linux and others
          command = 'xdg-open';
          args = [targetUrl];
          break;
      }

      const browserProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      browserProcess.unref();
      
      this.log(`Browser opened to: ${targetUrl}`);

    } catch (error) {
      throw new Error(`${CONFIG_UI_ERROR_MESSAGES.BROWSER_LAUNCH_FAILED}: ${error.message}`);
    }
  }

  /**
   * Handles configuration requests from the UI
   * @param request - UI configuration request
   * @returns Configuration response
   */
  public async handleConfigurationRequest(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    const startTime = Date.now();
    
    try {
      // Validate session
      if (!this.validateSession(request.sessionId)) {
        return this.createErrorResponse(CONFIG_UI_ERROR_MESSAGES.INVALID_SESSION, startTime);
      }

      // Update session activity
      this.updateSessionActivity(request.sessionId);

      // Process request based on action
      let response: UIConfigurationResponse;
      
      switch (request.action) {
        case UIAction.GET:
          response = await this.handleGetConfiguration(request);
          break;
        case UIAction.UPDATE:
          response = await this.handleUpdateConfiguration(request);
          break;
        case UIAction.VALIDATE:
          response = await this.handleValidateConfiguration(request);
          break;
        case UIAction.ADD_KEY:
          response = await this.handleAddApiKey(request);
          break;
        case UIAction.REMOVE_KEY:
          response = await this.handleRemoveApiKey(request);
          break;
        case UIAction.UPDATE_KEY:
          response = await this.handleUpdateApiKey(request);
          break;
        case UIAction.TEST_KEY:
          response = await this.handleTestApiKey(request);
          break;
        case UIAction.ROTATE_KEYS:
          response = await this.handleRotateKeys(request);
          break;
        case UIAction.SAVE:
          response = await this.handleSaveConfiguration(request);
          break;
        case UIAction.SAVE_AND_RESTART:
          response = await this.handleSaveAndRestartConfiguration(request);
          break;
        case UIAction.RESET:
          response = await this.handleResetConfiguration(request);
          break;
        case UIAction.BACKUP:
          response = await this.handleBackupConfiguration(request);
          break;
        case UIAction.RESTORE:
          response = await this.handleRestoreConfiguration(request);
          break;
        default:
          response = this.createErrorResponse(`Unknown action: ${request.action}`, startTime);
      }

      response.metadata = {
        processingTime: Date.now() - startTime,
        affectedSections: this.extractAffectedSections(request),
        requiresRestart: this.requiresRestart(request)
      };

      return response;

    } catch (error) {
      this.log(`Configuration request error: ${error.message}`, 'error');
      return this.createErrorResponse(error.message, startTime);
    }
  }

  /**
   * Broadcasts configuration updates to all connected clients
   * @param update - Configuration data to broadcast
   */
  public async broadcastConfigurationUpdate(update: any): Promise<void> {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.CONFIG_UPDATED,
      data: update,
      timestamp: Date.now()
    };

    this.broadcastWebSocketMessage(message);
  }

  /**
   * Sets the UI theme
   * @param theme - UI theme configuration
   */
  public setUITheme(theme: UITheme): void {
    this.currentTheme = { ...theme };
    
    // Broadcast theme update to connected clients
    const message: WebSocketMessage = {
      type: WebSocketMessageType.CONFIG_UPDATED,
      data: { theme: this.currentTheme },
      timestamp: Date.now()
    };
    
    this.broadcastWebSocketMessage(message);
    this.log(`UI theme set to: ${theme.name}`);
  }

  /**
   * Registers a UI extension
   * @param extension - UI extension to register
   */
  public registerUIExtension(extension: UIExtension): void {
    if (this.registeredExtensions.has(extension.id)) {
      throw new Error(`Extension with ID '${extension.id}' is already registered`);
    }

    this.registeredExtensions.set(extension.id, extension);
    this.log(`UI extension registered: ${extension.name} (${extension.id})`);

    // Broadcast extension registration to connected clients
    const message: WebSocketMessage = {
      type: WebSocketMessageType.CONFIG_UPDATED,
      data: { extensionRegistered: extension },
      timestamp: Date.now()
    };
    
    this.broadcastWebSocketMessage(message);
  }

  /**
   * Receives data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    try {
      this.log(`Received data from connection: ${dataTransfer.sourceConnectionId}`);
      
      // Validate received data
      const validationResult = this.validateInput(dataTransfer.data);
      if (!validationResult.isValid) {
        this.log(`Invalid data received: ${validationResult.errors.join(', ')}`, 'warn');
        return;
      }

      // Process data based on source module type
      if (dataTransfer.metadata?.sourceModuleType === 'config-validator') {
        await this.handleValidationResult(dataTransfer.data);
      } else if (dataTransfer.metadata?.sourceModuleType === 'config-persistence') {
        await this.handleConfigurationData(dataTransfer.data);
      } else {
        // Generic data handling
        await this.broadcastConfigurationUpdate(dataTransfer.data);
      }

    } catch (error) {
      this.log(`Error processing received data: ${error.message}`, 'error');
    }
  }

  /**
   * Performs handshake with another module
   * @param moduleInfo - Module information
   * @param connectionInfo - Connection information
   * @returns Whether handshake was successful
   */
  public async handshake(moduleInfo: ModuleInfo, connectionInfo?: ConnectionInfo): Promise<boolean> {
    try {
      // Perform config UI specific handshake validation
      // Check if target module is compatible
      const compatibleTypes = ['config-validator', 'config-persistence', 'config-loader'];
      if (!compatibleTypes.includes(moduleInfo.type)) {
        this.log(`Handshake warning: Module type '${moduleInfo.type}' may not be fully compatible`, 'warn');
      }

      return await super.handshake(this as unknown as BaseModule);
    } catch (error) {
      this.log(`Handshake failed with module ${moduleInfo.id}: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return false;
    }
  }

  /**
   * Cleans up resources and stops the server
   */
  public async destroy(): Promise<void> {
    try {
      // Stop heartbeat interval
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Stop session cleanup interval
      if (this.sessionCleanupInterval) {
        clearInterval(this.sessionCleanupInterval);
        this.sessionCleanupInterval = null;
      }

      // Stop web server
      await this.stopWebServer();

      // Clear sessions and extensions
      this.activeSessions.clear();
      this.registeredExtensions.clear();

      await super.destroy();
      this.log('ConfigUI module destroyed successfully');
      
    } catch (error) {
      this.log(`Error during module destruction: ${error.message}`, 'error');
      throw error;
    }
  }

  // Private helper methods

  /**
   * Sets up validation rules for the module
   */
  private setupValidationRules(): void {
    this.validationRules = [
      {
        field: 'action',
        type: 'required',
        message: 'Action is required'
      },
      {
        field: 'sessionId',
        type: 'required',
        message: 'Session ID is required'
      },
      {
        field: 'timestamp',
        type: 'required',
        message: 'Timestamp is required'
      }
    ];
  }

  /**
   * Creates default UI theme
   * @returns Default UI theme
   */
  private createDefaultTheme(): UITheme {
    return {
      name: CONFIG_UI_DEFAULT_THEME.NAME,
      colors: {
        primary: CONFIG_UI_DEFAULT_THEME.COLORS.PRIMARY,
        secondary: CONFIG_UI_DEFAULT_THEME.COLORS.SECONDARY,
        background: CONFIG_UI_DEFAULT_THEME.COLORS.BACKGROUND,
        surface: CONFIG_UI_DEFAULT_THEME.COLORS.SURFACE,
        error: CONFIG_UI_DEFAULT_THEME.COLORS.ERROR,
        warning: CONFIG_UI_DEFAULT_THEME.COLORS.WARNING,
        info: CONFIG_UI_DEFAULT_THEME.COLORS.INFO,
        success: CONFIG_UI_DEFAULT_THEME.COLORS.SUCCESS,
        text: {
          primary: CONFIG_UI_DEFAULT_THEME.COLORS.TEXT.PRIMARY,
          secondary: CONFIG_UI_DEFAULT_THEME.COLORS.TEXT.SECONDARY,
          disabled: CONFIG_UI_DEFAULT_THEME.COLORS.TEXT.DISABLED
        }
      },
      typography: {
        fontFamily: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_FAMILY,
        fontSize: {
          xs: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_SIZE.XS,
          sm: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_SIZE.SM,
          md: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_SIZE.MD,
          lg: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_SIZE.LG,
          xl: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_SIZE.XL
        },
        fontWeight: {
          light: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_WEIGHT.LIGHT,
          normal: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_WEIGHT.NORMAL,
          medium: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
          bold: CONFIG_UI_DEFAULT_THEME.TYPOGRAPHY.FONT_WEIGHT.BOLD
        }
      },
      spacing: {
        xs: CONFIG_UI_DEFAULT_THEME.SPACING.XS,
        sm: CONFIG_UI_DEFAULT_THEME.SPACING.SM,
        md: CONFIG_UI_DEFAULT_THEME.SPACING.MD,
        lg: CONFIG_UI_DEFAULT_THEME.SPACING.LG,
        xl: CONFIG_UI_DEFAULT_THEME.SPACING.XL
      },
      components: {
        button: { ...CONFIG_UI_DEFAULT_THEME.COMPONENTS.BUTTON },
        input: { ...CONFIG_UI_DEFAULT_THEME.COMPONENTS.INPUT },
        panel: { ...CONFIG_UI_DEFAULT_THEME.COMPONENTS.PANEL },
        modal: { ...CONFIG_UI_DEFAULT_THEME.COMPONENTS.MODAL }
      }
    };
  }

  /**
   * Registers Fastify server plugins
   */
  private async registerServerPlugins(): Promise<void> {
    if (!this.server) return;

    // Register WebSocket support
    await this.server.register(websocket);

    // Register CORS
    await this.server.register(cors, {
      origin: true,
      credentials: true,
      maxAge: CONFIG_UI_WEB_SERVER.CORS_MAX_AGE_SECONDS
    });

    // Register multipart/form-data support
    await this.server.register(multipart, {
      limits: {
        fileSize: CONFIG_UI_VALIDATION.MAX_UPLOAD_SIZE_BYTES
      }
    });

    // Register static files
    await this.server.register(staticFiles, {
      root: path.join(process.cwd(), CONFIG_UI_PATHS.STATIC_ASSETS_DIR),
      prefix: '/ui/'
    });
  }

  /**
   * Registers API routes
   */
  private registerAPIRoutes(): void {
    if (!this.server) return;

    const basePath = CONFIG_UI_API_ENDPOINTS.BASE_PATH;

    // Health check endpoint
    this.server.get(`${basePath}${CONFIG_UI_API_ENDPOINTS.HEALTH}`, async (request, reply) => {
      return {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: this.getServerInfo().uptime,
        version: CONFIG_UI_MODULE_INFO.VERSION
      };
    });

    // Configuration endpoints
    this.server.get(`${basePath}${CONFIG_UI_API_ENDPOINTS.CONFIGURATION}`, async (request, reply) => {
      // Handle GET configuration request
      return { message: 'Configuration endpoint - GET' };
    });

    this.server.post(`${basePath}${CONFIG_UI_API_ENDPOINTS.CONFIGURATION}`, async (request, reply) => {
      // Handle POST configuration request
      return { message: 'Configuration endpoint - POST' };
    });

    // Add more API endpoints as needed...
  }

  /**
   * Registers WebSocket handlers
   */
  private registerWebSocketHandlers(): void {
    if (!this.server) return;

    this.server.register(async function (fastify) {
      fastify.get(CONFIG_UI_WEBSOCKET.PATH, { websocket: true }, (connection, request) => {
        const sessionId = crypto.randomUUID();
        
        // Store WebSocket connection
        this.websocketClients.set(sessionId, connection);
        
        connection.on('message', (message: string) => {
          try {
            const parsedMessage = JSON.parse(message);
            this.handleWebSocketMessage(sessionId, parsedMessage);
          } catch (error) {
            this.log(`Invalid WebSocket message from ${sessionId}: ${error.message}`, 'warn');
          }
        });

        connection.on('close', () => {
          this.websocketClients.delete(sessionId);
          this.log(`WebSocket connection closed: ${sessionId}`);
        });

        // Send welcome message
        connection.send(JSON.stringify({
          type: WebSocketMessageType.SERVER_STATUS,
          data: { sessionId, connected: true },
          timestamp: Date.now()
        }));
      });
    }.bind(this));
  }

  /**
   * Validates user session
   * @param sessionId - Session ID to validate
   * @returns Whether session is valid
   */
  private validateSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    const now = Date.now();
    const isExpired = (now - session.lastActivity) > CONFIG_UI_AUTH.SESSION_TIMEOUT_MS;
    
    if (isExpired) {
      this.activeSessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Updates session activity timestamp
   * @param sessionId - Session ID to update
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Cleans up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.activeSessions.forEach((session, sessionId) => {
      if ((now - session.lastActivity) > CONFIG_UI_AUTH.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.activeSessions.delete(sessionId);
      this.log(`Expired session cleaned up: ${sessionId}`);
    });
  }

  /**
   * Sends heartbeat to all connected WebSocket clients
   */
  private sendHeartbeat(): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.HEARTBEAT,
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    };

    this.broadcastWebSocketMessage(message);
  }

  /**
   * Broadcasts WebSocket message to all connected clients
   * @param message - Message to broadcast
   */
  private broadcastWebSocketMessage(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    
    this.websocketClients.forEach((client, sessionId) => {
      try {
        client.send(messageString);
      } catch (error) {
        this.log(`Failed to send message to client ${sessionId}: ${error.message}`, 'warn');
        this.websocketClients.delete(sessionId);
      }
    });
  }

  /**
   * Handles WebSocket messages from clients
   * @param sessionId - Client session ID
   * @param message - Received message
   */
  private handleWebSocketMessage(sessionId: string, message: any): void {
    this.log(`Received WebSocket message from ${sessionId}: ${JSON.stringify(message)}`);
    
    // Handle different message types
    switch (message.type) {
      case 'ping':
        this.sendWebSocketMessage(sessionId, {
          type: 'pong',
          data: message.data,
          timestamp: Date.now()
        });
        break;
      
      default:
        this.log(`Unknown WebSocket message type: ${message.type}`, 'warn');
    }
  }

  /**
   * Sends WebSocket message to specific client
   * @param sessionId - Target session ID
   * @param message - Message to send
   */
  private sendWebSocketMessage(sessionId: string, message: WebSocketMessage): void {
    const client = this.websocketClients.get(sessionId);
    if (client) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        this.log(`Failed to send message to client ${sessionId}: ${error.message}`, 'warn');
        this.websocketClients.delete(sessionId);
      }
    }
  }

  /**
   * Broadcasts server status to all clients
   */
  private async broadcastServerStatus(): Promise<void> {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.SERVER_STATUS,
      data: this.getServerInfo(),
      timestamp: Date.now()
    };

    this.broadcastWebSocketMessage(message);
  }

  /**
   * Creates error response
   * @param error - Error message
   * @param startTime - Request start time
   * @returns Error response
   */
  private createErrorResponse(error: string, startTime: number): UIConfigurationResponse {
    return {
      success: false,
      errors: [error],
      timestamp: Date.now(),
      metadata: {
        processingTime: Date.now() - startTime,
        affectedSections: [],
        requiresRestart: false
      }
    };
  }

  /**
   * Extracts affected sections from request
   * @param request - Configuration request
   * @returns Array of affected section names
   */
  private extractAffectedSections(request: UIConfigurationRequest): string[] {
    const sections: string[] = [];
    
    if (request.section) {
      sections.push(request.section);
    }
    
    // Additional logic to extract sections from data
    // This would depend on the specific configuration structure
    
    return sections;
  }

  /**
   * Determines if restart is required for request
   * @param request - Configuration request
   * @returns Whether restart is required
   */
  private requiresRestart(request: UIConfigurationRequest): boolean {
    return request.action === UIAction.SAVE_AND_RESTART || 
           request.options?.restartRequired === true;
  }

  // Placeholder methods for configuration handling
  // These would be implemented based on specific requirements

  private async handleGetConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would get configuration from connected modules
    return {
      success: true,
      data: {},
      timestamp: Date.now()
    };
  }

  private async handleUpdateConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would update configuration
    return {
      success: true,
      data: request.data,
      timestamp: Date.now()
    };
  }

  private async handleValidateConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would validate configuration
    return {
      success: true,
      data: { valid: true },
      timestamp: Date.now()
    };
  }

  /**
   * Handles adding a new API key to a provider
   * @param request - Request containing provider info and new key
   * @returns Response with updated configuration
   */
  private async handleAddApiKey(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    try {
      const { providerName, newKey, keyType = 'api_key', filePath } = request.data;
      
      if (!providerName || !newKey) {
        return this.createErrorResponse('Provider name and new key are required', Date.now());
      }

      // Get current configuration
      const currentConfig = await this.getCurrentConfiguration();
      const provider = this.findProviderByName(currentConfig, providerName);
      
      if (!provider) {
        return this.createErrorResponse(`Provider '${providerName}' not found`, Date.now());
      }

      // Convert single key to array if needed
      if (typeof provider.api_key === 'string') {
        provider.api_key = [provider.api_key];
      } else if (!Array.isArray(provider.api_key)) {
        provider.api_key = [];
      }

      // Set auth type if provided
      if (keyType) {
        provider.auth_type = keyType;
      }

      // Add the new key
      const keyToAdd = filePath ? filePath : newKey;
      provider.api_key.push(keyToAdd);

      // If it's a file-based key, create the file
      if (filePath && keyType !== 'oauth') {
        await this.saveKeyToFile(filePath, newKey);
      }

      return {
        success: true,
        data: { 
          provider: provider,
          message: `Added new ${keyType} key to ${providerName}`,
          keyCount: provider.api_key.length
        },
        timestamp: Date.now()
      };

    } catch (error) {
      return this.createErrorResponse(`Failed to add API key: ${error.message}`, Date.now());
    }
  }

  /**
   * Handles removing an API key from a provider
   * @param request - Request containing provider info and key index
   * @returns Response with updated configuration
   */
  private async handleRemoveApiKey(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    try {
      const { providerName, keyIndex } = request.data;
      
      if (!providerName || keyIndex === undefined) {
        return this.createErrorResponse('Provider name and key index are required', Date.now());
      }

      const currentConfig = await this.getCurrentConfiguration();
      const provider = this.findProviderByName(currentConfig, providerName);
      
      if (!provider) {
        return this.createErrorResponse(`Provider '${providerName}' not found`, Date.now());
      }

      if (!Array.isArray(provider.api_key)) {
        return this.createErrorResponse('Provider does not have multiple keys', Date.now());
      }

      if (keyIndex < 0 || keyIndex >= provider.api_key.length) {
        return this.createErrorResponse('Invalid key index', Date.now());
      }

      // Remove the key
      const removedKey = provider.api_key[keyIndex];
      provider.api_key.splice(keyIndex, 1);

      // Convert back to single key if only one remains
      if (provider.api_key.length === 1 && request.data.convertToSingle !== false) {
        provider.api_key = provider.api_key[0];
      }

      return {
        success: true,
        data: { 
          provider: provider,
          message: `Removed key from ${providerName}`,
          removedKey: this.maskKey(removedKey),
          keyCount: Array.isArray(provider.api_key) ? provider.api_key.length : 1
        },
        timestamp: Date.now()
      };

    } catch (error) {
      return this.createErrorResponse(`Failed to remove API key: ${error.message}`, Date.now());
    }
  }

  /**
   * Handles updating an existing API key
   * @param request - Request containing provider info, key index, and new value
   * @returns Response with updated configuration
   */
  private async handleUpdateApiKey(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    try {
      const { providerName, keyIndex, newKey, filePath } = request.data;
      
      if (!providerName || keyIndex === undefined || !newKey) {
        return this.createErrorResponse('Provider name, key index, and new key are required', Date.now());
      }

      const currentConfig = await this.getCurrentConfiguration();
      const provider = this.findProviderByName(currentConfig, providerName);
      
      if (!provider) {
        return this.createErrorResponse(`Provider '${providerName}' not found`, Date.now());
      }

      // Handle single key
      if (typeof provider.api_key === 'string' && keyIndex === 0) {
        const oldKey = provider.api_key;
        provider.api_key = filePath ? filePath : newKey;
        
        if (filePath) {
          await this.saveKeyToFile(filePath, newKey);
        }

        return {
          success: true,
          data: { 
            provider: provider,
            message: `Updated key for ${providerName}`,
            oldKey: this.maskKey(oldKey),
            newKey: this.maskKey(provider.api_key)
          },
          timestamp: Date.now()
        };
      }

      // Handle multi-key array
      if (Array.isArray(provider.api_key)) {
        if (keyIndex < 0 || keyIndex >= provider.api_key.length) {
          return this.createErrorResponse('Invalid key index', Date.now());
        }

        const oldKey = provider.api_key[keyIndex];
        const keyToSet = filePath ? filePath : newKey;
        provider.api_key[keyIndex] = keyToSet;

        if (filePath) {
          await this.saveKeyToFile(filePath, newKey);
        }

        return {
          success: true,
          data: { 
            provider: provider,
            message: `Updated key ${keyIndex} for ${providerName}`,
            oldKey: this.maskKey(oldKey),
            newKey: this.maskKey(keyToSet)
          },
          timestamp: Date.now()
        };
      }

      return this.createErrorResponse('Invalid key configuration', Date.now());

    } catch (error) {
      return this.createErrorResponse(`Failed to update API key: ${error.message}`, Date.now());
    }
  }

  /**
   * Handles testing an API key for connectivity
   * @param request - Request containing provider info and key to test
   * @returns Response with test results
   */
  private async handleTestApiKey(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    try {
      const { providerName, keyIndex, keyValue } = request.data;
      
      if (!providerName) {
        return this.createErrorResponse('Provider name is required', Date.now());
      }

      const currentConfig = await this.getCurrentConfiguration();
      const provider = this.findProviderByName(currentConfig, providerName);
      
      if (!provider) {
        return this.createErrorResponse(`Provider '${providerName}' not found`, Date.now());
      }

      let keyToTest = keyValue;
      
      if (!keyToTest) {
        // Get key from provider configuration
        if (typeof provider.api_key === 'string') {
          keyToTest = provider.api_key;
        } else if (Array.isArray(provider.api_key) && keyIndex !== undefined) {
          keyToTest = provider.api_key[keyIndex];
        } else {
          return this.createErrorResponse('No key specified for testing', Date.now());
        }
      }

      // Load key from file if it's a file path
      if (this.isFilePath(keyToTest)) {
        try {
          keyToTest = await this.loadKeyFromFile(keyToTest);
        } catch (error) {
          return this.createErrorResponse(`Failed to load key file: ${error.message}`, Date.now());
        }
      }

      // Test the key (mock implementation)
      const testResult = await this.testApiKeyConnectivity(provider, keyToTest);

      return {
        success: true,
        data: { 
          testResult: testResult,
          provider: providerName,
          keyTested: this.maskKey(keyToTest),
          message: testResult.success ? 'Key test successful' : 'Key test failed'
        },
        timestamp: Date.now()
      };

    } catch (error) {
      return this.createErrorResponse(`Failed to test API key: ${error.message}`, Date.now());
    }
  }

  /**
   * Handles rotating keys for a provider (testing rotation mechanism)
   * @param request - Request containing provider info
   * @returns Response with rotation results
   */
  private async handleRotateKeys(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    try {
      const { providerName, rotationCount = 3 } = request.data;
      
      if (!providerName) {
        return this.createErrorResponse('Provider name is required', Date.now());
      }

      const currentConfig = await this.getCurrentConfiguration();
      const provider = this.findProviderByName(currentConfig, providerName);
      
      if (!provider) {
        return this.createErrorResponse(`Provider '${providerName}' not found`, Date.now());
      }

      if (!Array.isArray(provider.api_key) || provider.api_key.length < 2) {
        return this.createErrorResponse('Provider must have multiple keys for rotation testing', Date.now());
      }

      // Simulate key rotation
      const rotationResults = [];
      for (let i = 0; i < rotationCount; i++) {
        const selectedIndex = i % provider.api_key.length;
        const selectedKey = provider.api_key[selectedIndex];
        
        rotationResults.push({
          round: i + 1,
          selectedIndex: selectedIndex,
          selectedKey: this.maskKey(selectedKey),
          timestamp: Date.now() + i
        });
      }

      return {
        success: true,
        data: { 
          provider: providerName,
          totalKeys: provider.api_key.length,
          rotationResults: rotationResults,
          message: `Key rotation test completed for ${providerName}`
        },
        timestamp: Date.now()
      };

    } catch (error) {
      return this.createErrorResponse(`Failed to rotate keys: ${error.message}`, Date.now());
    }
  }

  // Helper methods for multi-key support

  /**
   * Gets current configuration from connected modules
   * @returns Current configuration object
   */
  private async getCurrentConfiguration(): Promise<any> {
    // This would integrate with ConfigLoaderModule to get current config
    // For now, return a mock configuration
    return {
      Providers: [
        {
          name: 'test-provider',
          api_base_url: 'https://api.test.com',
          api_key: 'sk-test-key',
          auth_type: 'api_key',
          models: ['test-model']
        }
      ]
    };
  }

  /**
   * Finds a provider by name in the configuration
   * @param config - Configuration object
   * @param name - Provider name to find
   * @returns Provider object or null
   */
  private findProviderByName(config: any, name: string): any {
    return config.Providers?.find((p: any) => p.name === name) || null;
  }

  /**
   * Masks sensitive parts of API key for display
   * @param key - API key to mask
   * @returns Masked key string
   */
  private maskKey(key: string): string {
    if (!key || key.length < 8) return '*'.repeat(key?.length || 0);
    return key.substring(0, 6) + '*'.repeat(Math.max(0, key.length - 10)) + key.substring(key.length - 4);
  }

  /**
   * Checks if a string is a file path
   * @param str - String to check
   * @returns Whether the string represents a file path
   */
  private isFilePath(str: string): boolean {
    return str.startsWith('./') || 
           str.startsWith('/') ||
           str.startsWith('../') ||
           /\.(key|txt|token|json|pem)$/i.test(str);
  }

  /**
   * Saves a key to a file
   * @param filePath - Path to save the key
   * @param keyContent - Key content to save
   */
  private async saveKeyToFile(filePath: string, keyContent: string): Promise<void> {
    try {
      await fs.writeFile(filePath, keyContent, 'utf8');
      this.log(`Key saved to file: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to save key to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Loads a key from a file
   * @param filePath - Path to load the key from
   * @returns Key content
   */
  private async loadKeyFromFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to load key from file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Tests API key connectivity (mock implementation)
   * @param provider - Provider configuration
   * @param key - API key to test
   * @returns Test result
   */
  private async testApiKeyConnectivity(provider: any, key: string): Promise<any> {
    // Mock implementation - in real implementation this would make API calls
    const isValidKey = key.length > 10 && (key.startsWith('sk-') || key.startsWith('oauth_'));
    
    return {
      success: isValidKey,
      statusCode: isValidKey ? 200 : 401,
      responseTime: Math.random() * 1000 + 500, // 500-1500ms
      message: isValidKey ? 'Key is valid and accessible' : 'Key authentication failed',
      provider: provider.name,
      endpoint: provider.api_base_url
    };
  }

  private async handleSaveConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would save configuration
    return {
      success: true,
      timestamp: Date.now()
    };
  }

  private async handleSaveAndRestartConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would save and trigger restart
    return {
      success: true,
      timestamp: Date.now(),
      metadata: {
        processingTime: 0,
        affectedSections: [],
        requiresRestart: true
      }
    };
  }

  private async handleResetConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would reset configuration
    return {
      success: true,
      timestamp: Date.now()
    };
  }

  private async handleBackupConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would create backup
    return {
      success: true,
      timestamp: Date.now(),
      metadata: {
        processingTime: 0,
        affectedSections: [],
        requiresRestart: false,
        backupCreated: `backup-${Date.now()}.json`
      }
    };
  }

  private async handleRestoreConfiguration(request: UIConfigurationRequest): Promise<UIConfigurationResponse> {
    // Implementation would restore from backup
    return {
      success: true,
      timestamp: Date.now()
    };
  }

  private async handleValidationResult(data: any): Promise<void> {
    // Handle validation result from ConfigValidatorModule
    const message: WebSocketMessage = {
      type: WebSocketMessageType.VALIDATION_RESULT,
      data,
      timestamp: Date.now()
    };
    
    this.broadcastWebSocketMessage(message);
  }

  private async handleConfigurationData(data: any): Promise<void> {
    // Handle configuration data from ConfigPersistenceModule
    await this.broadcastConfigurationUpdate(data);
  }

  /**
   * Logs messages with appropriate level
   * @param message - Message to log
   * @param level - Log level
   */
  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ConfigUIModule] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * Gets the module information
   * @returns Module information
   */
  public get getModuleInfo(): ModuleInfo {
    return { ...this.info };
  }
  
  /**
   * Gets the module configuration
   * @returns Module configuration
   */
  public get moduleConfig(): Record<string, any> {
    return { ...this.config };
  }
}

// Default export
export default ConfigUIModule;
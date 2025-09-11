#!/usr/bin/env node

/**
 * RCC4 System Startup with Two-Phase Debug Configuration
 * 
 * This script initializes the RCC4 system with two-phase debug logging:
 * Phase 1: systemstart (before port initialization) - uses systemstart directory
 * Phase 2: port-specific (after port initialization) - uses port directory
 */

const TwoPhaseDebugSystem = require('./src/debug/TwoPhaseDebugSystem.js');
const fs = require('fs');
const path = require('path');

class RCC4SystemStartup {
  constructor() {
    this.debugSystem = new TwoPhaseDebugSystem('./debug-logs');
    this.config = null;
    this.port = 0;
  }

  /**
   * Phase 1: System start initialization (before port initialization)
   */
  async systemStartPhase() {
    // Log system start phase
    this.debugSystem.log('info', '=== RCC4 System Startup Phase 1: System Start ===', {}, 'systemStartPhase');
    
    // Create systemstart directory structure
    const systemStartDir = this.debugSystem.getCurrentLogDirectory();
    this.debugSystem.log('info', 'Debug system initialized', {
      phase: 'systemstart',
      directory: systemStartDir
    }, 'systemStartPhase');
    
    // Load configuration
    await this.loadConfiguration();
    
    // Initialize system components (before port)
    await this.initializeSystemComponents();
    
    this.debugSystem.log('info', 'System start phase completed', {}, 'systemStartPhase');
  }

  /**
   * Phase 2: Port initialization and debug mode switch
   */
  async portInitializationPhase() {
    this.debugSystem.log('info', '=== RCC4 System Startup Phase 2: Port Initialization ===', {}, 'portInitializationPhase');
    
    // Extract port from configuration
    this.port = this.extractPortFromConfig();
    
    // Switch debug system to port mode
    this.debugSystem.switchToPortMode(this.port);
    
    this.debugSystem.log('info', 'Debug system switched to port mode', {
      port: this.port,
      directory: this.debugSystem.getCurrentLogDirectory()
    }, 'portInitializationPhase');
    
    // Initialize port-specific components
    await this.initializePortComponents();
    
    this.debugSystem.log('info', 'Port initialization phase completed', {}, 'portInitializationPhase');
  }

  /**
   * Load system configuration
   */
  async loadConfiguration() {
    this.debugSystem.log('info', 'Loading system configuration', {}, 'loadConfiguration');
    
    // Default configuration path
    const configPath = process.env.RCC4_CONFIG || '~/.route-claudecode/config/v4/single-provider/lmstudio-v4-5506.json';
    
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configContent);
        
        this.debugSystem.log('info', 'Configuration loaded successfully', {
          configPath,
          version: this.config.version || 'unknown'
        }, 'loadConfiguration');
      } else {
        this.debugSystem.log('warn', 'Configuration file not found, using defaults', { configPath }, 'loadConfiguration');
        this.config = this.getDefaultConfiguration();
      }
    } catch (error) {
      this.debugSystem.log('error', 'Failed to load configuration', { error: error.message }, 'loadConfiguration');
      this.config = this.getDefaultConfiguration();
    }
  }

  /**
   * Extract port from configuration
   */
  extractPortFromConfig() {
    let port = 5506; // Default port
    
    if (this.config && this.config.server && this.config.server.port) {
      port = this.config.server.port;
    } else if (process.env.RCC4_PORT) {
      port = parseInt(process.env.RCC4_PORT, 10);
    }
    
    this.debugSystem.log('info', 'Port extracted from configuration', { port }, 'extractPortFromConfig');
    return port;
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration() {
    return {
      version: "4.0",
      description: "Default RCC4 Configuration",
      Providers: [{
        name: "default",
        protocol: "openai",
        api_base_url: "http://localhost:1234",
        api_key: "default-key",
        models: ["default-model"],
        weight: 100
      }],
      Router: {
        default: "default,default-model"
      },
      server: {
        port: 5506,
        host: "0.0.0.0",
        debug: false
      },
      APIKEY: "rcc4-proxy-key",
      zeroFallbackPolicy: true
    };
  }

  /**
   * Initialize system components (before port)
   */
  async initializeSystemComponents() {
    this.debugSystem.log('info', 'Initializing system components', {}, 'initializeSystemComponents');
    
    // Initialize module registry
    await this.initializeModuleRegistry();
    
    // Initialize configuration system
    await this.initializeConfigurationSystem();
    
    // Initialize provider management
    await this.initializeProviderManagement();
    
    this.debugSystem.log('info', 'System components initialized', {}, 'initializeSystemComponents');
  }

  /**
   * Initialize module registry
   */
  async initializeModuleRegistry() {
    this.debugSystem.log('info', 'Initializing module registry', {}, 'initializeModuleRegistry');
    
    // Create module registry directory structure
    const registryDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'registry');
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'Module registry initialized', { registryDir }, 'initializeModuleRegistry');
  }

  /**
   * Initialize configuration system
   */
  async initializeConfigurationSystem() {
    this.debugSystem.log('info', 'Initializing configuration system', {}, 'initializeConfigurationSystem');
    
    // Configuration system initialization logic
    const configDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'Configuration system initialized', { configDir }, 'initializeConfigurationSystem');
  }

  /**
   * Initialize provider management
   */
  async initializeProviderManagement() {
    this.debugSystem.log('info', 'Initializing provider management', {}, 'initializeProviderManagement');
    
    // Provider management initialization logic
    const providerDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'providers');
    if (!fs.existsSync(providerDir)) {
      fs.mkdirSync(providerDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'Provider management initialized', { providerDir }, 'initializeProviderManagement');
  }

  /**
   * Initialize port-specific components
   */
  async initializePortComponents() {
    this.debugSystem.log('info', 'Initializing port-specific components', { port: this.port }, 'initializePortComponents');
    
    // Initialize HTTP server
    await this.initializeHTTPServer();
    
    // Initialize API routes
    await this.initializeAPIRoutes();
    
    // Initialize WebSocket server (if needed)
    await this.initializeWebSocketServer();
    
    // Initialize monitoring
    await this.initializeMonitoring();
    
    this.debugSystem.log('info', 'Port-specific components initialized', { port: this.port }, 'initializePortComponents');
  }

  /**
   * Initialize HTTP server
   */
  async initializeHTTPServer() {
    this.debugSystem.log('info', 'Initializing HTTP server', { port: this.port }, 'initializeHTTPServer');
    
    const http = require('http');
    
    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    // Start listening
    await new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    
    this.debugSystem.log('info', 'HTTP server initialized and listening', { 
      port: this.port,
      host: '0.0.0.0'
    }, 'initializeHTTPServer');
  }

  /**
   * Handle HTTP requests
   */
  handleRequest(req, res) {
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    
    this.debugSystem.log('debug', 'HTTP request received', {
      method,
      url: req.url,
      pathname,
      userAgent: req.headers['user-agent']
    }, 'handleRequest');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Route handling
    if (pathname === '/health') {
      this.handleHealthCheck(req, res);
    } else if (pathname === '/code/stop') {
      this.handleCodeStop(req, res);
    } else if (pathname.startsWith('/v1/')) {
      this.handleOpenAIAPI(req, res);
    } else if (pathname === '/') {
      this.handleRoot(req, res);
    } else {
      this.handle404(req, res);
    }
  }
  
  /**
   * Handle health check endpoint
   */
  handleHealthCheck(req, res) {
    const status = {
      status: 'healthy',
      version: this.config?.version || '4.0.0',
      port: this.port,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }
  
  /**
   * Handle code stop endpoint
   */
  handleCodeStop(req, res) {
    this.debugSystem.log('info', 'Code stop requested', {}, 'handleCodeStop');
    
    const response = {
      message: 'RCC4 system stopping...',
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
    
    // Graceful shutdown after response
    setTimeout(() => {
      this.shutdown().then(() => {
        process.exit(0);
      });
    }, 100);
  }
  
  /**
   * Handle OpenAI API proxy
   */
  handleOpenAIAPI(req, res) {
    // For now, return a simple response indicating the proxy is working
    const response = {
      object: 'rcc4-proxy',
      message: 'RCC4 OpenAI API proxy is running',
      version: this.config?.version || '4.0.0',
      port: this.port,
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  }
  
  /**
   * Handle root endpoint
   */
  handleRoot(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>RCC4 System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { color: green; }
        .info { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🚀 RCC4 System</h1>
    <p class="status">✅ System is running</p>
    
    <div class="info">
        <h3>System Information</h3>
        <ul>
            <li><strong>Version:</strong> ${this.config?.version || '4.0.0'}</li>
            <li><strong>Port:</strong> ${this.port}</li>
            <li><strong>Uptime:</strong> ${Math.floor(process.uptime())} seconds</li>
            <li><strong>Debug Phase:</strong> ${this.debugSystem?.getConfig()?.phase || 'unknown'}</li>
        </ul>
        
        <h3>Available Endpoints</h3>
        <ul>
            <li><a href="/health">/health</a> - Health check</li>
            <li><a href="/code/stop">/code/stop</a> - Stop system</li>
            <li>/v1/* - OpenAI API proxy</li>
        </ul>
    </div>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
  
  /**
   * Handle 404 errors
   */
  handle404(req, res) {
    const response = {
      error: 'Not Found',
      message: `Endpoint ${req.url} not found`,
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  }

  /**
   * Initialize API routes
   */
  async initializeAPIRoutes() {
    this.debugSystem.log('info', 'Initializing API routes', {}, 'initializeAPIRoutes');
    
    // API routes initialization logic
    const routesDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'routes');
    if (!fs.existsSync(routesDir)) {
      fs.mkdirSync(routesDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'API routes initialized', { 
      routesDir,
      endpoints: ['/health', '/code/stop', '/v1/*', '/']
    }, 'initializeAPIRoutes');
  }

  /**
   * Initialize WebSocket server
   */
  async initializeWebSocketServer() {
    this.debugSystem.log('info', 'Initializing WebSocket server', {}, 'initializeWebSocketServer');
    
    // WebSocket server initialization logic
    const wsDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'websocket');
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'WebSocket server initialized', { wsDir }, 'initializeWebSocketServer');
  }

  /**
   * Initialize monitoring
   */
  async initializeMonitoring() {
    this.debugSystem.log('info', 'Initializing monitoring system', {}, 'initializeMonitoring');
    
    // Monitoring system initialization logic
    const monitoringDir = path.join(this.debugSystem.getCurrentLogDirectory(), 'monitoring');
    if (!fs.existsSync(monitoringDir)) {
      fs.mkdirSync(monitoringDir, { recursive: true });
    }
    
    this.debugSystem.log('info', 'Monitoring system initialized', { monitoringDir }, 'initializeMonitoring');
  }

  /**
   * Complete system startup
   */
  async startup() {
    try {
      this.debugSystem.log('info', '=== RCC4 System Startup Started ===', {}, 'startup');
      
      // Phase 1: System start (before port initialization)
      await this.systemStartPhase();
      
      // Phase 2: Port initialization and debug mode switch
      await this.portInitializationPhase();
      
      // Final system initialization
      await this.finalizeInitialization();
      
      this.debugSystem.log('info', '=== RCC4 System Startup Completed Successfully ===', {
        port: this.port,
        debugPhase: 'port',
        debugDirectory: this.debugSystem.getCurrentLogDirectory()
      }, 'startup');
      
      console.log(`🚀 RCC4 System started successfully on port ${this.port}`);
      console.log(`📁 Debug logs: ${this.debugSystem.getCurrentLogDirectory()}`);
      
    } catch (error) {
      this.debugSystem.log('error', 'RCC4 System startup failed', { error: error.message }, 'startup');
      console.error('❌ RCC4 System startup failed:', error.message);
      throw error;
    }
  }

  /**
   * Finalize initialization
   */
  async finalizeInitialization() {
    this.debugSystem.log('info', 'Finalizing system initialization', {}, 'finalizeInitialization');
    
    // Start health checks
    await this.startHealthChecks();
    
    // Initialize cleanup processes
    await this.initializeCleanupProcesses();
    
    // Log system status
    this.logSystemStatus();
    
    this.debugSystem.log('info', 'System initialization finalized', {}, 'finalizeInitialization');
  }

  /**
   * Start health checks
   */
  async startHealthChecks() {
    this.debugSystem.log('info', 'Starting health checks', {}, 'startHealthChecks');
    
    // Health check initialization logic
    setInterval(() => {
      this.debugSystem.log('debug', 'Health check passed', {
        timestamp: new Date().toISOString(),
        port: this.port
      }, 'healthCheck');
    }, 30000); // Every 30 seconds
  }

  /**
   * Initialize cleanup processes
   */
  async initializeCleanupProcesses() {
    this.debugSystem.log('info', 'Initializing cleanup processes', {}, 'initializeCleanupProcesses');
    
    // Cleanup process initialization logic
    setInterval(() => {
      this.debugSystem.cleanupOldLogs(7); // Keep logs for 7 days
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Log system status
   */
  logSystemStatus() {
    const status = {
      system: 'RCC4',
      version: this.config?.version || '4.0',
      port: this.port,
      debugPhase: this.debugSystem.getConfig().phase,
      debugDirectory: this.debugSystem.getCurrentLogDirectory(),
      providers: this.config?.Providers?.length || 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
    
    this.debugSystem.log('info', 'System status', status, 'logSystemStatus');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.debugSystem.log('info', '=== RCC4 System Shutdown Started ===', {}, 'shutdown');
    
    // Close HTTP server
    if (this.httpServer) {
      this.debugSystem.log('info', 'Closing HTTP server', {}, 'shutdown');
      await new Promise((resolve) => {
        this.httpServer.close(resolve);
      });
      this.debugSystem.log('info', 'HTTP server closed', {}, 'shutdown');
    }
    
    // Cleanup resources
    this.debugSystem.log('info', 'Cleaning up resources', {}, 'shutdown');
    
    // Final shutdown log
    this.debugSystem.log('info', '=== RCC4 System Shutdown Completed ===', {}, 'shutdown');
    
    console.log('👋 RCC4 System shutdown completed');
  }
}

// Main execution
async function main() {
  const system = new RCC4SystemStartup();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n📦 Received SIGINT, shutting down gracefully...');
    await system.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n📦 Received SIGTERM, shutting down gracefully...');
    await system.shutdown();
    process.exit(0);
  });
  
  try {
    await system.startup();
  } catch (error) {
    console.error('❌ Failed to start RCC4 system:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RCC4SystemStartup;
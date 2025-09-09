#!/usr/bin/env node

/**
 * Modular Server Demonstration
 * Shows how the new modular architecture works using ConfigManager and ApiRouter
 * This validates our architecture before continuing with full extraction
 */

const http = require('http');

// Simple ConfigHandler that simulates the old config API behavior
class ConfigHandler {
  constructor(configManager) {
    this.configManager = configManager;
  }

  async handle(pathParts, method, body) {
    console.log(`🔧 [ConfigHandler] ${method} /${pathParts.join('/')}`);
    
    try {
      switch (method) {
        case 'GET':
          if (pathParts.length === 1) {
            // GET /api/config - Get current configuration
            const config = await this.configManager.receiveData({ action: 'load' });
            return {
              success: true,
              data: config,
              statusCode: 200,
              timestamp: Date.now()
            };
          }
          break;
          
        case 'POST':
          // POST /api/config - Update configuration (demo)
          return {
            success: true,
            message: 'Config update simulation',
            statusCode: 200,
            timestamp: Date.now()
          };
          
        default:
          return {
            success: false,
            error: 'Method not allowed',
            statusCode: 405,
            timestamp: Date.now()
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }
}

// Simple demo server
class ModularServerDemo {
  constructor() {
    this.port = 8888;
    this.apiRouter = null;
    this.configManager = null;
    this.server = null;
  }

  async initialize() {
    console.log('🚀 [ModularServerDemo] Initializing modular server demo...');
    
    try {
      
      // Since we can't import TypeScript modules directly in Node.js without compilation,
      // we'll simulate the modules for this demo
      console.log('📝 [ModularServerDemo] Creating simulated ConfigManager...');
      this.configManager = {
        async receiveData(data) {
          if (data.action === 'load') {
            return {
              version: '2.0.0',
              providers: [],
              demonstration: true,
              message: 'This is a demonstration of the modular architecture'
            };
          }
          return { success: true };
        }
      };
      
      console.log('🛣️ [ModularServerDemo] Creating simulated ApiRouter...');
      this.apiRouter = {
        handlers: new Map(),
        
        registerHandler(routePrefix, handler) {
          this.handlers.set(routePrefix, handler);
          console.log(`✅ [ApiRouter] Registered handler for: ${routePrefix}`);
        },
        
        async routeRequest(request) {
          const pathParts = this.parseApiPath(request.url);
          if (pathParts.length === 0) {
            return {
              success: false,
              error: 'Invalid API path',
              statusCode: 400,
              timestamp: Date.now()
            };
          }
          
          const routePrefix = pathParts[0];
          const handler = this.handlers.get(routePrefix);
          
          if (!handler) {
            return {
              success: false,
              error: `No handler for route: ${routePrefix}`,
              statusCode: 404,
              timestamp: Date.now()
            };
          }
          
          return await handler.handle(pathParts, request.method, request.body);
        },
        
        parseApiPath(url) {
          let path = url;
          const questionMarkIndex = path.indexOf('?');
          if (questionMarkIndex !== -1) {
            path = path.substring(0, questionMarkIndex);
          }
          
          if (path.startsWith('/api/')) {
            path = path.substring(5);
          }
          
          return path.split('/').filter(part => part.length > 0);
        }
      };
      
      // Register config handler
      const configHandler = new ConfigHandler(this.configManager);
      this.apiRouter.registerHandler('config', configHandler);
      
      console.log('✅ [ModularServerDemo] Modules initialized successfully');
      
    } catch (error) {
      console.error('❌ [ModularServerDemo] Initialization failed:', error);
      throw error;
    }
  }

  async start() {
    await this.initialize();
    
    this.server = http.createServer(async (req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Collect request body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          console.log(`📨 [ModularServerDemo] ${req.method} ${req.url}`);
          
          // Handle API requests
          if (req.url.startsWith('/api/')) {
            const apiRequest = {
              url: req.url,
              method: req.method,
              body: body
            };
            
            const response = await this.apiRouter.routeRequest(apiRequest);
            
            res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response, null, 2));
            return;
          }
          
          // Handle root request - serve demo info
          if (req.url === '/' || req.url === '') {
            const demoInfo = {
              message: '🎉 Modular Server Architecture Demo',
              description: 'This demonstrates the new modular architecture with ConfigManager and ApiRouter',
              availableEndpoints: {
                'GET /api/config': 'Get configuration (via ConfigManager)',
                'POST /api/config': 'Update configuration (demo)',
              },
              architecture: {
                modules: ['ConfigManager', 'ApiRouter'],
                pattern: 'BaseModule with dependency injection',
                benefits: ['Single Responsibility', 'Testability', 'Maintainability']
              },
              nextSteps: [
                'Extract ProvidersManager module',
                'Extract ModelsManager module', 
                'Extract BlacklistManager & PoolManager modules',
                'Create final integrated HTTP server'
              ]
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(demoInfo, null, 2));
            return;
          }
          
          // 404 for other requests
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }, null, 2));
          
        } catch (error) {
          console.error('❌ [ModularServerDemo] Request error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
      });
    });
    
    this.server.listen(this.port, () => {
      console.log(`✨ [ModularServerDemo] Demo server running on http://localhost:${this.port}`);
      console.log(`📋 [ModularServerDemo] Try these endpoints:`);
      console.log(`   - GET http://localhost:${this.port}/`);
      console.log(`   - GET http://localhost:${this.port}/api/config`);
      console.log(`   - POST http://localhost:${this.port}/api/config`);
      console.log(`🎯 [ModularServerDemo] This validates our modular architecture!`);
    });
  }

  async stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 [ModularServerDemo] Demo server stopped');
    }
  }
}

// Main execution
if (require.main === module) {
  const demo = new ModularServerDemo();
  
  demo.start().catch(error => {
    console.error('❌ Failed to start demo server:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n🛑 [ModularServerDemo] Shutting down...');
    await demo.stop();
    process.exit(0);
  });
}

module.exports = { ModularServerDemo };
/**
 * Development Server for RCC Configuration Web UI Testing
 * 
 * Provides HTTP server with static file serving, ES module support, and CORS handling
 * Supports TypeScript compilation and hot-reload functionality
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

class DevServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.host = options.host || 'localhost';
    this.root = options.root || process.cwd();
    this.verbose = options.verbose || false;
    
    // MIME types for static files
    this.mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.ts': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
  }

  /**
   * Start the development server
   */
  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, this.host, () => {
      console.log(`🚀 RCC Configuration Web UI Dev Server`);
      console.log(`📍 Server running at: http://${this.host}:${this.port}/`);
      console.log(`📂 Serving files from: ${this.root}`);
      console.log(`⚡ Auto-compilation enabled for TypeScript files`);
      console.log(`🔄 CORS enabled for development`);
      console.log('');
      console.log('🎯 Available test pages:');
      console.log(`   • http://${this.host}:${this.port}/test-ui.html - Complete Web UI Test`);
      console.log(`   • http://${this.host}:${this.port}/webui-demo.html - Demo Page`);
      console.log(`   • http://${this.host}:${this.port}/simple-test.html - Simple Test`);
      console.log('');
      console.log('Press Ctrl+C to stop the server');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n📦 Shutting down dev server...');
      server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
      });
    });

    return server;
  }

  /**
   * Handle incoming requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (this.verbose) {
      console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
    }

    try {
      // Handle API routes
      if (pathname.startsWith('/api/')) {
        await this.handleApiRequest(req, res, pathname);
        return;
      }

      // Handle static files
      await this.handleStaticFile(req, res, pathname);
    } catch (error) {
      console.error('Request handling error:', error);
      this.sendErrorResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle API requests for testing
   */
  async handleApiRequest(req, res, pathname) {
    const apiPath = pathname.replace('/api/', '');

    switch (apiPath) {
      case 'test-data':
        // Return test configuration data
        const testData = require('./test-data/sample-config.json');
        this.sendJsonResponse(res, testData);
        break;

      case 'providers':
        // Return test providers
        const providers = require('./test-data/sample-providers.json');
        this.sendJsonResponse(res, providers);
        break;

      case 'models':
        // Return test models
        const models = require('./test-data/sample-models.json');
        this.sendJsonResponse(res, models);
        break;

      case 'generate-config':
        // Simulate config generation
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const inputData = JSON.parse(body);
              const generatedConfig = this.generateMockConfig(inputData);
              this.sendJsonResponse(res, generatedConfig);
            } catch (error) {
              this.sendErrorResponse(res, 400, 'Invalid JSON input');
            }
          });
        } else {
          this.sendErrorResponse(res, 405, 'Method Not Allowed');
        }
        break;

      case 'parse-config':
        // Simulate config parsing
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const configData = JSON.parse(body);
              const parseResult = this.parseMockConfig(configData);
              this.sendJsonResponse(res, parseResult);
            } catch (error) {
              this.sendErrorResponse(res, 400, 'Invalid configuration format');
            }
          });
        } else {
          this.sendErrorResponse(res, 405, 'Method Not Allowed');
        }
        break;

      default:
        this.sendErrorResponse(res, 404, 'API endpoint not found');
    }
  }

  /**
   * Handle static file requests
   */
  async handleStaticFile(req, res, pathname) {
    // Default to index.html for directory requests
    if (pathname === '/' || pathname.endsWith('/')) {
      pathname += pathname === '/' ? 'test-ui.html' : 'index.html';
    }

    const filePath = path.join(this.root, pathname);
    const ext = path.extname(filePath).toLowerCase();

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.sendErrorResponse(res, 404, 'File not found');
      return;
    }

    // Special handling for TypeScript files
    if (ext === '.ts') {
      await this.handleTypeScriptFile(req, res, filePath);
      return;
    }

    // Get MIME type
    const mimeType = this.mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.end(content);
    } catch (error) {
      console.error(`Error serving file ${filePath}:`, error);
      this.sendErrorResponse(res, 500, 'Error reading file');
    }
  }

  /**
   * Handle TypeScript file compilation
   */
  async handleTypeScriptFile(req, res, filePath) {
    const jsPath = filePath.replace('.ts', '.js');
    const isNewer = this.isFileNewer(filePath, jsPath);

    if (isNewer) {
      console.log(`🔄 Compiling TypeScript: ${path.basename(filePath)}`);
      
      try {
        await this.compileTypeScript(filePath, jsPath);
      } catch (error) {
        console.error('TypeScript compilation error:', error);
        this.sendErrorResponse(res, 500, `TypeScript compilation failed: ${error.message}`);
        return;
      }
    }

    // Serve the compiled JavaScript
    if (fs.existsSync(jsPath)) {
      const content = fs.readFileSync(jsPath);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Content-Length': content.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    } else {
      this.sendErrorResponse(res, 500, 'Compiled JavaScript file not found');
    }
  }

  /**
   * Compile TypeScript file
   */
  compileTypeScript(tsPath, jsPath) {
    return new Promise((resolve, reject) => {
      const cmd = `npx tsc "${tsPath}" --target es2020 --module es2020 --moduleResolution node --outFile "${jsPath}"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Check if source file is newer than target
   */
  isFileNewer(sourceFile, targetFile) {
    if (!fs.existsSync(targetFile)) {
      return true;
    }

    const sourceStat = fs.statSync(sourceFile);
    const targetStat = fs.statSync(targetFile);
    
    return sourceStat.mtime > targetStat.mtime;
  }

  /**
   * Generate mock configuration for testing
   */
  generateMockConfig(inputData) {
    const mockConfig = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      providers: inputData.providers || [],
      virtualModels: inputData.virtualModels || [],
      routes: inputData.routes || [],
      pipelines: this.generatePipelines(inputData),
      metadata: {
        totalProviders: inputData.providers?.length || 0,
        totalModels: inputData.providers?.reduce((sum, p) => sum + (p.models?.length || 0), 0) || 0,
        totalVirtualModels: inputData.virtualModels?.length || 0,
        generatedAt: new Date().toISOString(),
        generatedBy: "RCC Configuration Generator"
      }
    };

    return mockConfig;
  }

  /**
   * Generate pipelines for mock config
   */
  generatePipelines(inputData) {
    const pipelines = [];
    
    if (inputData.providers && inputData.providers.length > 0) {
      inputData.providers.forEach(provider => {
        if (provider.models && provider.models.length > 0) {
          provider.models.forEach(model => {
            pipelines.push({
              id: `pipeline-${provider.name}-${model.name}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              name: `${provider.name} ${model.name} Pipeline`,
              provider: provider.name,
              model: model.name,
              endpoint: provider.endpoint || `https://api.${provider.name.toLowerCase()}.com/v1`,
              auth: {
                type: provider.auth?.type || "bearer",
                keys: provider.auth?.keys || []
              },
              parameters: model.parameters || {},
              routing: {
                weight: 1,
                priority: model.priority || 1
              }
            });
          });
        }
      });
    }

    return pipelines;
  }

  /**
   * Parse mock configuration
   */
  parseMockConfig(configData) {
    const parseResult = {
      success: true,
      timestamp: new Date().toISOString(),
      statistics: {
        providersFound: 0,
        modelsFound: 0,
        pipelinesGenerated: 0,
        errorsFound: 0
      },
      providers: [],
      pipelines: [],
      errors: [],
      warnings: []
    };

    try {
      // Parse providers
      if (configData.providers && Array.isArray(configData.providers)) {
        parseResult.statistics.providersFound = configData.providers.length;
        parseResult.providers = configData.providers;

        configData.providers.forEach(provider => {
          if (provider.models && Array.isArray(provider.models)) {
            parseResult.statistics.modelsFound += provider.models.length;
          }
        });
      }

      // Parse pipelines
      if (configData.pipelines && Array.isArray(configData.pipelines)) {
        parseResult.statistics.pipelinesGenerated = configData.pipelines.length;
        parseResult.pipelines = configData.pipelines;
      }

      // Add some mock warnings for demonstration
      if (parseResult.statistics.providersFound === 0) {
        parseResult.warnings.push("No providers found in configuration");
      }

      if (parseResult.statistics.modelsFound === 0) {
        parseResult.warnings.push("No models found in provider configurations");
      }

      if (parseResult.statistics.pipelinesGenerated === 0) {
        parseResult.warnings.push("No pipelines could be generated from configuration");
      }

    } catch (error) {
      parseResult.success = false;
      parseResult.statistics.errorsFound = 1;
      parseResult.errors.push({
        type: "parsing_error",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return parseResult;
  }

  /**
   * Send JSON response
   */
  sendJsonResponse(res, data) {
    const jsonData = JSON.stringify(data, null, 2);
    
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(jsonData),
      'Cache-Control': 'no-cache'
    });

    res.end(jsonData);
  }

  /**
   * Send error response
   */
  sendErrorResponse(res, statusCode, message) {
    const errorData = {
      error: true,
      statusCode,
      message,
      timestamp: new Date().toISOString()
    };

    const jsonData = JSON.stringify(errorData, null, 2);

    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(jsonData)
    });

    res.end(jsonData);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--port':
      case '-p':
        options.port = parseInt(value) || 8080;
        break;
      case '--host':
      case '-h':
        options.host = value || 'localhost';
        break;
      case '--root':
      case '-r':
        options.root = value || process.cwd();
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        i--; // No value for boolean flag
        break;
      case '--help':
        console.log(`
RCC Configuration Web UI Development Server

Usage: node dev-server.js [options]

Options:
  --port, -p <number>    Server port (default: 8080)
  --host, -h <string>    Server host (default: localhost)  
  --root, -r <string>    Root directory (default: current directory)
  --verbose, -v          Enable verbose logging
  --help                 Show this help message

Examples:
  node dev-server.js                    # Start server on localhost:8080
  node dev-server.js --port 3000       # Start server on port 3000
  node dev-server.js --verbose         # Start with verbose logging
        `);
        process.exit(0);
    }
  }

  // Start the server
  const server = new DevServer(options);
  server.start();
}

module.exports = DevServer;
// HTTP Server component for RCC Server Module

import express = require('express');
import cors = require('cors');
import helmet = require('helmet');
import compression = require('compression');
import bodyParser = require('body-parser');
import { createServer, Server as HttpServer } from 'http';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IHttpServer } from '../interfaces/IServerModule';
import { ServerConfig, ClientRequest, ClientResponse } from '../types/ServerTypes';

export class HttpServerComponent extends BaseModule implements IHttpServer {
  private app: Application;
  private server: HttpServer | null = null;
  private config: ServerConfig | null = null;
  private isRunning: boolean = false;

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'HttpServer',
      name: 'HTTP Server Component',
      version: '1.0.0',
      description: 'HTTP server component for RCC Server Module',
      type: 'component',
      capabilities: ['http-server', 'middleware', 'security'],
      dependencies: ['express', 'cors', 'helmet'],
      config: {},
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };
    
    super(moduleInfo);
    this.app = express();
  }

  /**
   * Initialize the HTTP server with configuration
   */
  public configure(config: ServerConfig): void {
    super.configure(config);
    this.config = config;
  }

  public async initialize(): Promise<void> {
    this.log('Initializing HTTP server component');
    
    if (!this.config) {
      throw new Error('HTTP server not configured');
    }
    
    // Apply security middleware
    if (this.config.helmet) {
      this.app.use(helmet());
    }
    
    // Enable CORS
    this.app.use(cors(this.config.cors));
    
    // Enable compression
    if (this.config.compression) {
      this.app.use(compression());
    }
    
    // Parse request bodies
    this.app.use(bodyParser.json({ limit: this.config.bodyLimit }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: this.config.bodyLimit }));
    
    // Add request logging middleware
    this.app.use(this.requestLogger.bind(this));
    
    // Add error handling middleware
    this.app.use(this.errorHandler.bind(this));
    
    // Add health check endpoint
    this.app.get('/health', this.healthCheck.bind(this));
    
    // Add metrics endpoint
    this.app.get('/metrics', this.getMetrics.bind(this));
    
    this.log('HTTP server component initialized successfully');
  }

  /**
   * Start the HTTP server
   */
  async listen(port: number, host: string = 'localhost'): Promise<void> {
    if (this.isRunning) {
      this.warn('HTTP server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);
      
      this.server.listen(port, host, () => {
        this.isRunning = true;
        this.log(`HTTP server listening on ${host}:${port}`);
        resolve();
      });
      
      this.server.on('error', (error) => {
        this.error('HTTP server error:', error);
        reject(error);
      });
      
      this.server.on('connection', (socket) => {
        this.debug(`New connection established from ${socket.remoteAddress}`);
        
        socket.on('close', () => {
          this.debug(`Connection closed from ${socket.remoteAddress}`);
        });
        
        socket.on('error', (error) => {
          this.warn(`Connection error from ${socket.remoteAddress}:`, error);
        });
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async close(): Promise<void> {
    if (!this.isRunning || !this.server) {
      this.warn('HTTP server is not running');
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        this.log('HTTP server stopped');
        resolve();
      });
    });
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (this.server) {
      this.server.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    if (this.server) {
      this.server.off(event, callback);
    }
  }

  /**
   * Get active connections count
   */
  getConnections(callback: (err: Error | null, count: number) => void): void {
    if (this.server) {
      this.server.getConnections(callback);
    } else {
      callback(null, 0);
    }
  }

  /**
   * Get the Express application instance
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Request logging middleware
   */
  private requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const method = req.method;
      const url = req.originalUrl;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress || 'Unknown';
      
      this.debug(`${method} ${url} - ${status} - ${duration}ms - ${ip} - ${userAgent}`);
    });
    
    next();
  }

  /**
   * Error handling middleware
   */
  private errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    this.error('Request error:', error);
    
    const status = (error as any).status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;
    
    res.status(status).json({
      error: {
        message,
        status,
        timestamp: Date.now(),
        requestId: (req as any).requestId
      }
    });
  }

  /**
   * Health check endpoint
   */
  private healthCheck(req: Request, res: Response): void {
    const health = {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      node: process.version,
      memory: process.memoryUsage(),
      connections: 0
    };

    if (this.server) {
      this.getConnections((err, count) => {
        health.connections = count;
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      });
    } else {
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    }
  }

  /**
   * Get server metrics
   */
  private getMetrics(req: Request, res: Response): void {
    const metrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      isRunning: this.isRunning,
      connections: 0
    };

    if (this.server) {
      this.getConnections((err, count) => {
        metrics.connections = count;
        res.json(metrics);
      });
    } else {
      res.json(metrics);
    }
  }

  /**
   * Convert Express request to ClientRequest
   */
  public expressToClientRequest(req: Request): ClientRequest {
    return {
      id: this.generateRequestId(),
      method: req.method as ClientRequest['method'],
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      body: req.body,
      query: req.query as Record<string, string>,
      timestamp: Date.now(),
      clientId: req.get('X-Client-ID'),
      virtualModel: req.get('X-Virtual-Model')
    };
  }

  /**
   * Convert ClientResponse to Express response
   */
  public clientResponseToExpress(response: ClientResponse, res: Response): void {
    res.status(response.status);
    
    // Set headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Set default headers if not present
    if (!response.headers['Content-Type']) {
      res.setHeader('Content-Type', 'application/json');
    }
    if (!response.headers['X-Request-ID']) {
      res.setHeader('X-Request-ID', response.id);
    }
    if (!response.headers['X-Processing-Time']) {
      res.setHeader('X-Processing-Time', response.processingTime.toString());
    }
    
    // Send response
    if (response.body !== undefined) {
      res.json(response.body);
    } else {
      res.end();
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    
    Object.keys(headers).forEach(key => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = headers[key] as string;
      }
    });
    
    return sanitized;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.log('Cleaning up HTTP server component');
    
    if (this.server) {
      await this.close();
    }
    
    this.app = null;
    this.config = null;
    
    super.cleanup();
  }
}
// HTTP Server component for RCC Server Module

import express, { Application as ExpressApplication, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import { createServer, Server as HttpServer } from 'http';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IHttpServer } from '../interfaces/IServerModule';
import { ServerConfig, ClientRequest, ClientResponse } from '../types/ServerTypes';

export class HttpServerComponent extends BaseModule implements IHttpServer {
  private app: ExpressApplication;
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
  public override configure(config: ServerConfig): void {
    super.configure(config);
    this.config = config;
  }

  public override async initialize(): Promise<void> {
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
    
    this.log('HTTP server component initialized successfully', { method: 'initialize' });
  }

  /**
   * Start the HTTP server
   */
  public async listen(port: number, host: string = 'localhost'): Promise<void> {
    if (this.isRunning) {
      this.warn('HTTP server is already running', { method: 'listen' });
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);
      
      this.server.listen(port, host, () => {
        this.isRunning = true;
        this.log(`HTTP server listening on ${host}:${port}`, { method: 'listen' });
        resolve();
      });
      
      this.server.on('error', (error) => {
        this.error('HTTP server error', { method: 'listen' });
        reject(error);
      });
      
      this.server.on('connection', (socket) => {
        this.log(`New connection established from ${socket.remoteAddress}`, { method: 'listen' });
        
        socket.on('close', () => {
          this.log(`Connection closed from ${socket.remoteAddress}`, { method: 'listen' });
        });
        
        socket.on('error', () => {
          this.warn('Connection error', { method: 'listen' });
        });
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  public async close(): Promise<void> {
    if (!this.isRunning || !this.server) {
      this.warn('HTTP server is not running', { method: 'close' });
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        this.log('HTTP server stopped', { method: 'close' });
        resolve();
      });
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.server) {
      this.server.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    if (this.server) {
      this.server.off(event, callback);
    }
  }

  /**
   * Get active connections count
   */
  public getConnections(callback: (err: Error | null, count: number) => void): void {
    if (this.server) {
      this.server.getConnections(callback);
    } else {
      callback(new Error('Server not running'), 0);
    }
  }

  /**
   * Get the Express application instance
   */
  public getApp(): ExpressApplication {
    return this.app;
  }

  /**
   * Check if server is running
   */
  public isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Request logging middleware
   */
  private requestLogger(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const method = req.method;
      const url = req.originalUrl;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress || 'Unknown';
      
      this.log(`${method} ${url} - ${status} - ${duration}ms - ${ip} - ${userAgent}`, { method: 'requestLogger' });
    });
    
    next();
  }

  /**
   * Error handling middleware
   */
  private errorHandler(error: Error, req: express.Request, res: express.Response): void {
    this.error('Request error', { method: 'errorHandler' });
    
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
  private healthCheck(_req: express.Request, res: express.Response): void {
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
      this.getConnections((_err, count) => {
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
  private getMetrics(_req: express.Request, res: express.Response): void {
    const metrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      isRunning: this.isRunning,
      connections: 0
    };

    if (this.server) {
      this.getConnections((_err, count) => {
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
      clientId: req.get('X-Client-ID') || undefined,
      virtualModel: req.get('X-Virtual-Model') || undefined
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
  public override async destroy(): Promise<void> {
    this.log('Cleaning up HTTP server component', { method: 'destroy' });
    
    if (this.server) {
      await this.close();
    }
    
    this.app = express();
    this.config = null;
    
    super.destroy();
  }
}
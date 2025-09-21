import { Application as ExpressApplication, Request, Response } from 'express';
import { BaseModule } from 'rcc-basemodule';
import { IHttpServer } from '../interfaces/IServerModule';
import { ServerConfig, ClientRequest, ClientResponse } from '../types/ServerTypes';
export declare class HttpServerComponent extends BaseModule implements IHttpServer {
    private app;
    private server;
    private serverConfig;
    private requestHandler;
    isRunning(): boolean;
    /**
     * Set request handler for API routes
     */
    setRequestHandler(handler: (request: ClientRequest) => Promise<ClientResponse>): void;
    constructor();
    /**
     * Initialize the HTTP server with configuration
     */
    configure(config: ServerConfig): void;
    initialize(): Promise<void>;
    /**
     * Start the HTTP server (alias for listen)
     */
    start(): Promise<void>;
    /**
     * Start the HTTP server
     */
    listen(port: number, host?: string): Promise<void>;
    /**
     * Stop the HTTP server
     */
    stop(): Promise<void>;
    /**
     * Add event listener
     */
    on(event: string, callback: (...args: any[]) => void): void;
    /**
     * Remove event listener
     */
    off(event: string, callback: (...args: any[]) => void): void;
    /**
     * Get active connections count
     */
    getConnections(callback: (err: Error | null, count: number) => void): void;
    /**
     * Get the Express application instance
     */
    getApp(): ExpressApplication;
    /**
     * Get the Express application instance (alias for getApp)
     */
    getExpressApp(): ExpressApplication;
    /**
     * Check if server is running
     */
    isServerRunning(): boolean;
    /**
     * Request logging middleware
     */
    private requestLogger;
    /**
     * Error handling middleware
     */
    private errorHandler;
    /**
     * Health check endpoint
     */
    private healthCheck;
    /**
     * Register API routes with proper error handling
     */
    private registerApiRoutes;
    /**
     * Status check endpoint - RCC system health check
     */
    private statusCheck;
    /**
     * Handle chat request - OpenAI compatible endpoint
     */
    private handleChatRequest;
    /**
     * Get server metrics
     */
    private getMetrics;
    /**
     * Convert Express request to ClientRequest
     */
    expressToClientRequest(req: Request): ClientRequest;
    /**
     * Convert ClientResponse to Express response
     */
    clientResponseToExpress(response: ClientResponse, res: Response): void;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Sanitize headers for logging
     */
    private sanitizeHeaders;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=HttpServer.d.ts.map
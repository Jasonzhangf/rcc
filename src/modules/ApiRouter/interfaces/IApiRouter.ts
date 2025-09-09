/**
 * API Router Interface
 * Routes API requests to appropriate modules and handles unified response formatting
 */

export interface IApiRequest {
  url: string;
  method: string;
  body: string;
  headers?: Record<string, string>;
}

export interface IApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  timestamp: number;
  message?: string;
}

export interface IRouteHandler {
  /**
   * Handle API request for a specific route
   */
  handle(pathParts: string[], method: string, body: string): Promise<IApiResponse>;
}

export interface IModuleRegistry {
  /**
   * Register a module handler for a specific route prefix
   */
  registerHandler(routePrefix: string, handler: IRouteHandler): void;
  
  /**
   * Get handler for a specific route prefix
   */
  getHandler(routePrefix: string): IRouteHandler | null;
  
  /**
   * List all registered route prefixes
   */
  getRegisteredRoutes(): string[];
}

export interface IApiRouter extends IModuleRegistry {
  /**
   * Route incoming API request to appropriate handler
   */
  routeRequest(request: IApiRequest): Promise<IApiResponse>;
  
  /**
   * Parse API path into components
   */
  parseApiPath(url: string): string[];
  
  /**
   * Create standardized API response
   */
  createResponse(
    success: boolean,
    data?: any,
    error?: string,
    statusCode?: number,
    message?: string
  ): IApiResponse;
  
  /**
   * Validate API request format
   */
  validateRequest(request: IApiRequest): boolean;
}

export interface IRouteConfig {
  prefix: string;
  handler: IRouteHandler;
  description?: string;
  methods?: string[];
}
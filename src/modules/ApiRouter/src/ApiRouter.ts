/**
 * API Router Module
 * Routes API requests to appropriate modules and handles unified response formatting
 * Extracted from monolithic server for better modularity
 */

import { BaseModule } from '../../../core/BaseModule';
import { API_ROUTER_CONSTANTS } from '../constants/ApiRouter.constants';
import {
  IApiRouter,
  IApiRequest,
  IApiResponse,
  IRouteHandler,
  IRouteConfig
} from '../interfaces/IApiRouter';

export class ApiRouter extends BaseModule implements IApiRouter {
  private handlers: Map<string, IRouteHandler>;
  private routeConfigs: Map<string, IRouteConfig>;

  constructor() {
    super({
      id: 'api-router',
      name: 'ApiRouter',
      version: '1.0.0',
      description: 'API request routing and response formatting',
      type: 'system'
    });
    this.handlers = new Map();
    this.routeConfigs = new Map();
  }

  async initialize(): Promise<void> {
    console.log(`${API_ROUTER_CONSTANTS.LOG_PREFIX} API Router initialized`);
  }

  registerHandler(routePrefix: string, handler: IRouteHandler): void {
    this.handlers.set(routePrefix, handler);
    console.log(`${API_ROUTER_CONSTANTS.LOG_PREFIX} ${API_ROUTER_CONSTANTS.SUCCESS.ROUTE_REGISTERED}: ${routePrefix}`);
  }

  getHandler(routePrefix: string): IRouteHandler | null {
    return this.handlers.get(routePrefix) || null;
  }

  getRegisteredRoutes(): string[] {
    return Array.from(this.handlers.keys());
  }

  async routeRequest(request: IApiRequest): Promise<IApiResponse> {
    try {
      // Validate request
      if (!this.validateRequest(request)) {
        return this.createResponse(
          false,
          null,
          API_ROUTER_CONSTANTS.ERRORS.INVALID_REQUEST,
          API_ROUTER_CONSTANTS.STATUS_CODES.BAD_REQUEST
        );
      }

      // Parse API path
      const pathParts = this.parseApiPath(request.url);
      if (pathParts.length === 0) {
        return this.createResponse(
          false,
          null,
          API_ROUTER_CONSTANTS.ERRORS.MALFORMED_URL,
          API_ROUTER_CONSTANTS.STATUS_CODES.BAD_REQUEST
        );
      }

      // Get route prefix (first part of path)
      const routePrefix = pathParts[0];
      const handler = this.getHandler(routePrefix);

      if (!handler) {
        return this.createResponse(
          false,
          null,
          `${API_ROUTER_CONSTANTS.ERRORS.ROUTE_NOT_FOUND}: /${routePrefix}`,
          API_ROUTER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      // Route to handler
      console.log(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Routing ${request.method} /${routePrefix} to handler`);
      const response = await handler.handle(pathParts, request.method, request.body);
      
      console.log(`${API_ROUTER_CONSTANTS.LOG_PREFIX} ${API_ROUTER_CONSTANTS.SUCCESS.REQUEST_ROUTED}: ${response.success ? 'SUCCESS' : 'FAILURE'}`);
      return response;

    } catch (error) {
      console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Routing error:`, error);
      return this.createResponse(
        false,
        null,
        `${API_ROUTER_CONSTANTS.ERRORS.HANDLER_ERROR}: ${(error as Error).message}`,
        API_ROUTER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  parseApiPath(url: string): string[] {
    try {
      // Remove API prefix and query string
      let path = url;
      const questionMarkIndex = path.indexOf('?');
      if (questionMarkIndex !== -1) {
        path = path.substring(0, questionMarkIndex);
      }

      // Remove /api/ prefix if present
      if (path.startsWith(API_ROUTER_CONSTANTS.API_PREFIX)) {
        path = path.substring(API_ROUTER_CONSTANTS.API_PREFIX.length);
      }

      // Split and filter empty parts
      const parts = path.split(API_ROUTER_CONSTANTS.PATH_SEPARATOR)
        .filter(part => part.length > 0);

      return parts;
    } catch (error) {
      console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Path parsing error:`, error);
      return [];
    }
  }

  createResponse(
    success: boolean,
    data?: any,
    error?: string,
    statusCode?: number,
    message?: string
  ): IApiResponse {
    const response: IApiResponse = {
      success,
      statusCode: statusCode || (success ? API_ROUTER_CONSTANTS.STATUS_CODES.OK : API_ROUTER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR),
      timestamp: Date.now()
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (error) {
      response.error = error;
    }

    if (message) {
      response.message = message;
    }

    return response;
  }

  validateRequest(request: IApiRequest): boolean {
    try {
      // Check required fields
      for (const field of API_ROUTER_CONSTANTS.VALIDATION.REQUIRED_FIELDS) {
        if (!(field in request)) {
          console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Missing required field: ${field}`);
          return false;
        }
      }

      // Validate HTTP method
      if (!API_ROUTER_CONSTANTS.VALIDATION.SUPPORTED_METHODS.includes(request.method)) {
        console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Unsupported HTTP method: ${request.method}`);
        return false;
      }

      // Validate body size
      if (request.body && request.body.length > API_ROUTER_CONSTANTS.VALIDATION.MAX_BODY_SIZE) {
        console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} ${API_ROUTER_CONSTANTS.ERRORS.BODY_TOO_LARGE}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Request validation error:`, error);
      return false;
    }
  }

  // BaseModule required methods
  async receiveData(data: any): Promise<any> {
    const { action, request } = data;

    switch (action) {
      case 'route':
        return await this.routeRequest(request);
      case 'register':
        this.registerHandler(data.routePrefix, data.handler);
        return { success: true };
      case 'list_routes':
        return { routes: this.getRegisteredRoutes() };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async destroy(): Promise<void> {
    this.handlers.clear();
    this.routeConfigs.clear();
    console.log(`${API_ROUTER_CONSTANTS.LOG_PREFIX} Module destroyed`);
  }
}
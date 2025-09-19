import { ClientRequest, ClientResponse, RouteConfig, MiddlewareConfig } from '../types/ServerTypes';
import { ServerCore } from '../core/ServerCore';
import { VirtualModelManager } from '../core/VirtualModelManager';

export class RequestHandlerService {
  constructor(
    private serverCore: ServerCore,
    private virtualModelManager: VirtualModelManager
  ) {}

  public async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    const startTime = Date.now();
    let response: ClientResponse | null = null;

    try {
      // Apply middleware
      await this.applyMiddleware(request);

      // Route request
      response = await this.routeRequest(request);

      // Apply post-middleware
      await this.applyPostMiddleware(request, response);

      return response!;
    } catch (error) {
      console.error('Request handling error:', error);
      response = this.createErrorResponse(error, request);
      return response!;
    } finally {
      // Record metrics
      if (response) {
        await this.recordRequestMetrics({
          id: request.id,
          timestamp: startTime,
          duration: Date.now() - startTime,
          method: request.method,
          path: request.path,
          status: response.status,
          error: response.error,
          size: JSON.stringify(response).length
        });
      }
    }
  }

  private async applyMiddleware(request: ClientRequest): Promise<void> {
    const middlewares = this.serverCore['middlewares'] as Map<string, MiddlewareConfig>;

    for (const middleware of middlewares.values()) {
      if (middleware.enabled !== false) {
        try {
          await this.executeMiddleware(middleware, request);
        } catch (error) {
          console.error(`Middleware failed:`, error);
          // Continue with other middlewares unless it's critical
        }
      }
    }
  }

  private async applyPostMiddleware(request: ClientRequest, response: ClientResponse): Promise<void> {
    // Post-middleware logic can be added here
  }

  private async routeRequest(request: ClientRequest): Promise<ClientResponse> {
    const routes = this.serverCore['routes'] as Map<string, RouteConfig>;

    // Find matching route
    for (const route of routes.values()) {
      if (this.isRouteMatch(route, request)) {
        return await this.executeRoute(route, request);
      }
    }

    // Default route handling
    return await this.handleDefaultRoute(request);
  }

  private isRouteMatch(route: RouteConfig, request: ClientRequest): boolean {
    if (route.method && route.method !== request.method) {
      return false;
    }

    if (route.path && !this.pathMatches(route.path, request.path)) {
      return false;
    }

    return true;
  }

  private pathMatches(routePath: string, requestPath: string): boolean {
    // Simple path matching - can be enhanced with proper routing logic
    return routePath === requestPath || routePath === '*';
  }

  private async executeRoute(route: RouteConfig, request: ClientRequest): Promise<ClientResponse> {
    if (route.virtualModel) {
      const virtualModel = this.virtualModelManager.getVirtualModel(route.virtualModel);
      if (virtualModel) {
        return await this.virtualModelManager.processVirtualModelRequest(request, virtualModel);
      }
    }

    // Handler is string type, not implemented in this version
    throw new Error(`Route ${route.id} has no virtual model configured`);
  }

  private async handleDefaultRoute(request: ClientRequest): Promise<ClientResponse> {
    // Default request handling logic
    return {
      id: request.id,
      status: 404,
      error: 'Route not found',
      headers: {},
      timestamp: Date.now(),
      processingTime: 0,
      requestId: request.id
    };
  }

  private async executeMiddleware(middleware: MiddlewareConfig, request: ClientRequest): Promise<void> {
    // Middleware execution logic
    // This is a placeholder - actual middleware logic would be implemented here
  }

  private async recordRequestMetrics(metrics: any): Promise<void> {
    await this.serverCore.recordRequestMetrics(metrics);
  }

  private createErrorResponse(error: any, request?: ClientRequest): ClientResponse {
    return {
      id: request?.id || 'unknown',
      status: 500,
      error: error.message || 'Internal server error',
      headers: {},
      timestamp: Date.now(),
      processingTime: 0,
      requestId: request?.id || 'unknown'
    };
  }
}
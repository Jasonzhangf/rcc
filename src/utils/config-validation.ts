/**
 * Configuration Validation and Wrapper Integration System
 *
 * Phase 4: Enhanced validation and wrapper integration for RCC system
 *
 * This module provides comprehensive validation for configuration data
 * and wrapper generation, ensuring clean separation between HTTP and pipeline
 * configuration components.
 */

import {
  RccConfig,
  ProviderConfig,
  ServerWrapper,
  PipelineWrapper,
  ConfigValidationError,
  WrapperGenerationResult,
} from '../types';

/**
 * Configuration validation rules and utilities
 */
export class ConfigValidator {
  /**
   * Validate main RCC configuration structure
   */
  static validateRccConfig(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        code: 'INVALID_CONFIG',
        message: 'Configuration must be an object',
        path: '',
        actual: typeof config,
        expected: 'object',
        severity: 'error',
      });
      return errors;
    }

    // Validate providers
    if (config.providers !== undefined) {
      if (typeof config.providers !== 'object' || config.providers === null) {
        errors.push({
          code: 'INVALID_PROVIDERS',
          message: 'Providers must be an object',
          path: 'providers',
          actual: typeof config.providers,
          expected: 'object',
          severity: 'error',
        });
      } else {
        Object.entries(config.providers).forEach(([providerId, provider]: [string, any]) => {
          errors.push(...this.validateProvider(providerId, provider));
        });
      }
    }

    // Validate dynamic routing
    if (config.dynamicRouting !== undefined) {
      if (typeof config.dynamicRouting !== 'object' || config.dynamicRouting === null) {
        errors.push({
          code: 'INVALID_DYNAMIC_ROUTING',
          message: 'Dynamic routing must be an object',
          path: 'dynamicRouting',
          actual: typeof config.dynamicRouting,
          expected: 'object',
          severity: 'error',
        });
      } else {
        Object.entries(config.dynamicRouting).forEach(([routingId, routing]: [string, any]) => {
          errors.push(...this.validateDynamicRouting(routingId, routing));
        });
      }
    }

    // Validate server configuration
    if (config.server !== undefined) {
      errors.push(...this.validateServerConfig(config.server));
    }

    return errors;
  }

  /**
   * Validate individual provider configuration
   */
  private static validateProvider(providerId: string, provider: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const basePath = `providers.${providerId}`;

    if (typeof provider !== 'object' || provider === null) {
      errors.push({
        code: 'INVALID_PROVIDER',
        message: `Provider ${providerId} must be an object`,
        path: basePath,
        actual: typeof provider,
        expected: 'object',
        severity: 'error',
      });
      return errors;
    }

    // Required fields
    if (!provider.name) {
      errors.push({
        code: 'MISSING_PROVIDER_NAME',
        message: `Provider ${providerId} missing name field`,
        path: `${basePath}.name`,
        severity: 'error',
      });
    }

    if (!provider.type) {
      errors.push({
        code: 'MISSING_PROVIDER_TYPE',
        message: `Provider ${providerId} missing type field`,
        path: `${basePath}.type`,
        severity: 'error',
      });
    }

    if (!provider.endpoint) {
      errors.push({
        code: 'MISSING_PROVIDER_ENDPOINT',
        message: `Provider ${providerId} missing endpoint field`,
        path: `${basePath}.endpoint`,
        severity: 'warning', // Warning as some providers might not need endpoint
      });
    }

    // Validate auth structure
    if (provider.auth !== undefined) {
      if (typeof provider.auth !== 'object' || provider.auth === null) {
        errors.push({
          code: 'INVALID_AUTH',
          message: `Provider ${providerId} auth must be an object`,
          path: `${basePath}.auth`,
          actual: typeof provider.auth,
          expected: 'object',
          severity: 'error',
        });
      } else if (!provider.auth.type) {
        errors.push({
          code: 'MISSING_AUTH_TYPE',
          message: `Provider ${providerId} auth missing type field`,
          path: `${basePath}.auth.type`,
          severity: 'error',
        });
      }
    }

    // Validate models
    if (provider.models !== undefined) {
      if (typeof provider.models !== 'object' || provider.models === null) {
        errors.push({
          code: 'INVALID_MODELS',
          message: `Provider ${providerId} models must be an object`,
          path: `${basePath}.models`,
          actual: typeof provider.models,
          expected: 'object',
          severity: 'error',
        });
      } else {
        Object.entries(provider.models).forEach(([modelId, model]: [string, any]) => {
          if (typeof model !== 'object' || model === null) {
            errors.push({
              code: 'INVALID_MODEL',
              message: `Model ${modelId} in provider ${providerId} must be an object`,
              path: `${basePath}.models.${modelId}`,
              actual: typeof model,
              expected: 'object',
              severity: 'error',
            });
          }
        });
      }
    }

    return errors;
  }

  /**
   * Validate individual dynamic routing configuration
   */
  private static validateDynamicRouting(routingId: string, routing: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const basePath = `dynamicRouting.${routingId}`;

    if (typeof routing !== 'object' || routing === null) {
      errors.push({
        code: 'INVALID_DYNAMIC_ROUTING',
        message: `Dynamic routing ${routingId} must be an object`,
        path: basePath,
        actual: typeof routing,
        expected: 'object',
        severity: 'error',
      });
      return errors;
    }

    // Validate targets array
    if (!Array.isArray(routing.targets)) {
      errors.push({
        code: 'INVALID_TARGETS',
        message: `Dynamic routing ${routingId} targets must be an array`,
        path: `${basePath}.targets`,
        actual: typeof routing.targets,
        expected: 'array',
        severity: 'error',
      });
    } else if (routing.targets.length === 0) {
      errors.push({
        code: 'EMPTY_TARGETS',
        message: `Dynamic routing ${routingId} must have at least one target`,
        path: `${basePath}.targets`,
        severity: 'error',
      });
    } else {
      routing.targets.forEach((target: any, index: number) => {
        if (typeof target !== 'object' || target === null) {
          errors.push({
            code: 'INVALID_TARGET',
            message: `Dynamic routing ${routingId} target ${index} must be an object`,
            path: `${basePath}.targets[${index}]`,
            actual: typeof target,
            expected: 'object',
            severity: 'error',
          });
        } else {
          if (!target.providerId) {
            errors.push({
              code: 'MISSING_TARGET_PROVIDER',
              message: `Dynamic routing ${routingId} target ${index} missing providerId`,
              path: `${basePath}.targets[${index}].providerId`,
              severity: 'error',
            });
          }

          if (!target.modelId) {
            errors.push({
              code: 'MISSING_TARGET_MODEL',
              message: `Dynamic routing ${routingId} target ${index} missing modelId`,
              path: `${basePath}.targets[${index}].modelId`,
              severity: 'error',
            });
          }
        }
      });
    }

    // Validate boolean fields
    if (routing.enabled !== undefined && typeof routing.enabled !== 'boolean') {
      errors.push({
        code: 'INVALID_ENABLED',
        message: `Dynamic routing ${routingId} enabled must be a boolean`,
        path: `${basePath}.enabled`,
        actual: typeof routing.enabled,
        expected: 'boolean',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate server configuration section
   */
  private static validateServerConfig(server: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const basePath = 'server';

    if (typeof server !== 'object' || server === null) {
      errors.push({
        code: 'INVALID_SERVER_CONFIG',
        message: 'Server configuration must be an object',
        path: basePath,
        actual: typeof server,
        expected: 'object',
        severity: 'error',
      });
      return errors;
    }

    // Validate port
    if (server.port !== undefined) {
      if (typeof server.port !== 'number' || server.port < 1 || server.port > 65535) {
        errors.push({
          code: 'INVALID_PORT',
          message: 'Server port must be a number between 1 and 65535',
          path: `${basePath}.port`,
          actual: server.port,
          expected: 'number (1-65535)',
          severity: 'error',
        });
      }
    }

    // Validate CORS
    if (server.cors !== undefined) {
      if (typeof server.cors !== 'object' || server.cors === null) {
        errors.push({
          code: 'INVALID_CORS',
          message: 'Server CORS must be an object',
          path: `${basePath}.cors`,
          actual: typeof server.cors,
          expected: 'object',
          severity: 'error',
        });
      } else {
        if (
          server.cors.origin !== undefined &&
          !['string', 'object'].includes(typeof server.cors.origin)
        ) {
          errors.push({
            code: 'INVALID_CORS_ORIGIN',
            message: 'CORS origin must be a string or array',
            path: `${basePath}.cors.origin`,
            actual: typeof server.cors.origin,
            expected: 'string or array',
            severity: 'error',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate generated ServerWrapper for compliance
   */
  static validateServerWrapper(wrapper: ServerWrapper): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    // Ensure no dynamic routing information is present
    if ((wrapper as any).dynamicRouting || (wrapper as any).providers) {
      errors.push({
        code: 'SERVER_WRAPPER_CONTAINS_DYNAMIC_ROUTING',
        message: 'ServerWrapper should not contain dynamic routing or provider information',
        path: 'wrapper',
        severity: 'error',
      });
    }

    // Validate required fields
    if (!wrapper.port || wrapper.port < 1 || wrapper.port > 65535) {
      errors.push({
        code: 'INVALID_SERVER_WRAPPER_PORT',
        message: 'ServerWrapper port must be a number between 1 and 65535',
        path: 'wrapper.port',
        actual: wrapper.port,
        expected: 'number (1-65535)',
        severity: 'error',
      });
    }

    if (!wrapper.host || typeof wrapper.host !== 'string') {
      errors.push({
        code: 'INVALID_SERVER_WRAPPER_HOST',
        message: 'ServerWrapper host must be a string',
        path: 'wrapper.host',
        actual: wrapper.host,
        expected: 'string',
        severity: 'error',
      });
    }

    // Validate CORS configuration
    if (!wrapper.cors || typeof wrapper.cors !== 'object') {
      errors.push({
        code: 'INVALID_SERVER_WRAPPER_CORS',
        message: 'ServerWrapper must have CORS configuration',
        path: 'wrapper.cors',
        actual: wrapper.cors,
        expected: 'object',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate generated PipelineWrapper for compliance
   */
  static validatePipelineWrapper(wrapper: PipelineWrapper): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    // Ensure dynamic routing configurations are present and properly formatted
    if (!Array.isArray(wrapper.dynamicRouting)) {
      errors.push({
        code: 'PIPELINE_WRAPPER_MISSING_DYNAMIC_ROUTING',
        message: 'PipelineWrapper must have dynamicRouting array',
        path: 'wrapper.dynamicRouting',
        actual: typeof wrapper.dynamicRouting,
        expected: 'array',
        severity: 'error',
      });
    } else if (wrapper.dynamicRouting.length === 0) {
      errors.push({
        code: 'PIPELINE_WRAPPER_EMPTY_DYNAMIC_ROUTING',
        message: 'PipelineWrapper dynamicRouting array cannot be empty',
        path: 'wrapper.dynamicRouting',
        severity: 'error',
      });
    } else {
      wrapper.dynamicRouting.forEach((routing, index) => {
        if (
          !routing.id ||
          !routing.targets ||
          !Array.isArray(routing.targets) ||
          routing.targets.length === 0
        ) {
          errors.push({
            code: 'INVALID_PIPELINE_WRAPPER_DYNAMIC_ROUTING',
            message: `Dynamic routing at index ${index} is invalid`,
            path: `wrapper.dynamicRouting[${index}]`,
            severity: 'error',
          });
        }
      });
    }

    // Validate modules
    if (!Array.isArray(wrapper.modules)) {
      errors.push({
        code: 'PIPELINE_WRAPPER_INVALID_MODULES',
        message: 'PipelineWrapper modules must be an array',
        path: 'wrapper.modules',
        actual: typeof wrapper.modules,
        expected: 'array',
        severity: 'error',
      });
    }

    // Validate routing
    if (!wrapper.routing || typeof wrapper.routing !== 'object') {
      errors.push({
        code: 'PIPELINE_WRAPPER_INVALID_ROUTING',
        message: 'PipelineWrapper must have routing configuration',
        path: 'wrapper.routing',
        actual: wrapper.routing,
        expected: 'object',
        severity: 'error',
      });
    }

    // Validate metadata
    if (!wrapper.metadata || typeof wrapper.metadata !== 'object') {
      errors.push({
        code: 'PIPELINE_WRAPPER_INVALID_METADATA',
        message: 'PipelineWrapper must have metadata',
        path: 'wrapper.metadata',
        actual: wrapper.metadata,
        expected: 'object',
        severity: 'error',
      });
    }

    return errors;
  }
}

/**
 * Enhanced wrapper generation with comprehensive validation
 */
export class WrapperGenerator {
  /**
   * Generate wrappers with enhanced validation and error handling
   */
  static async generateWrappersWithValidation(
    config: RccConfig,
    generateWrappersFn: (
      config: RccConfig
    ) => Promise<{ server: ServerWrapper; pipeline: PipelineWrapper }>
  ): Promise<WrapperGenerationResult> {
    const startTime = Date.now();
    const result: WrapperGenerationResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {
        generationTime: 0,
        providerCount: Object.keys(config.providers || {}).length,
        dynamicRoutingCount: Object.keys(config.dynamicRouting || {}).length,
        configVersion: (config as any)['version'] || '1.0.0',
      },
    };

    try {
      // Validate input configuration
      const validationErrors = ConfigValidator.validateRccConfig(config);
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        result.metadata!.generationTime = Date.now() - startTime;
        return result;
      }

      // Generate wrappers
      const wrappers = await generateWrappersFn(config);

      // Validate server wrapper
      const serverErrors = ConfigValidator.validateServerWrapper(wrappers.server);
      if (serverErrors.length > 0) {
        if (!result.errors) result.errors = [];
        result.errors.push(...serverErrors);
      }

      // Validate pipeline wrapper
      const pipelineErrors = ConfigValidator.validatePipelineWrapper(wrappers.pipeline);
      if (pipelineErrors.length > 0) {
        if (!result.errors) result.errors = [];
        result.errors.push(...pipelineErrors);
      }

      if ((result.errors || []).length === 0) {
        result.success = true;
        result.server = wrappers.server;
        result.pipeline = wrappers.pipeline;
      }

      result.metadata!.generationTime = Date.now() - startTime;

      return result;
    } catch (error) {
      if (!result.errors) result.errors = [];
      (result.errors as any[]).push({
        code: 'WRAPPER_GENERATION_FAILED',
        message: `Wrapper generation failed: ${error instanceof Error ? error.message : String(error)}`,
        path: '',
        severity: 'error',
      });

      result.metadata!.generationTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Fallback configuration generation for robustness
   */
  static generateFallbackWrappers(config: RccConfig): {
    server: ServerWrapper;
    pipeline: PipelineWrapper;
  } {
    return {
      server: {
        port: config.port || config.server?.port || 5506,
        host: config.server?.host || 'localhost',
        cors: {
          origin: config.server?.cors?.origin || ['*'],
          credentials: config.server?.cors?.credentials !== false,
        },
        compression: config.server?.compression !== false,
        helmet: config.server?.helmet !== false,
        rateLimit: {
          windowMs: config.server?.rateLimit?.windowMs || 900000,
          max: config.server?.rateLimit?.max || 100,
        },
        timeout: config.server?.timeout || 30000,
        bodyLimit: config.server?.bodyLimit || '10mb',
        pipeline: {
          enabled: true,
          unifiedErrorHandling: true,
          unifiedMonitoring: true,
          errorMapping: {
            ECONNREFUSED: 'SERVICE_UNAVAILABLE',
            ETIMEDOUT: 'TIMEOUT_ERROR',
            EAI_AGAIN: 'DNS_RESOLUTION_FAILED',
          },
        },
      },
      pipeline: {
        dynamicRouting: Object.values(config.dynamicRouting || {}).map((routing) => ({
          id: routing.id,
          name: routing.name || routing.id,
          modelId: routing.targets[0]?.modelId || '',
          provider: routing.targets[0]?.providerId || '',
          enabled: routing.enabled,
          targets: routing.targets.map((target) => ({
            providerId: target.providerId,
            modelId: target.modelId,
            weight: 1.0,
            enabled: true,
            keyIndex: target.keyIndex || 0,
          })),
          capabilities: routing.capabilities || ['chat', 'function-calling'],
          metadata: {
            priority: (routing as any)['priority'],
            weight: (routing as any)['weight'],
            targetCount: routing.targets.length,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        modules: [
          {
            id: 'llmswitch',
            type: 'switch',
            config: {
              strategy: 'weighted',
              healthCheck: { enabled: true, interval: 30000 },
            },
            enabled: true,
            priority: 1,
          },
          {
            id: 'workflow',
            type: 'processor',
            config: { maxSteps: 100, timeout: 300000 },
            enabled: true,
            priority: 2,
          },
        ],
        routing: {
          strategy: 'weighted',
          fallbackStrategy: 'round-robin',
          rules: [{ condition: 'default', action: 'allow', target: 'primary' }],
        },
        metadata: {
          version: (config as any)['version'] || '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          providerCount: Object.keys(config.providers || {}).length,
          dynamicRoutingCount: Object.keys(config.dynamicRouting || {}).length,
        },
      },
    };
  }
}

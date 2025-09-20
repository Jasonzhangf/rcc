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
  VirtualModelConfig,
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

    // Validate virtual models
    if (config.virtualModels !== undefined) {
      if (typeof config.virtualModels !== 'object' || config.virtualModels === null) {
        errors.push({
          code: 'INVALID_VIRTUAL_MODELS',
          message: 'Virtual models must be an object',
          path: 'virtualModels',
          actual: typeof config.virtualModels,
          expected: 'object',
          severity: 'error',
        });
      } else {
        Object.entries(config.virtualModels).forEach(([vmId, vm]: [string, any]) => {
          errors.push(...this.validateVirtualModel(vmId, vm));
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
   * Validate individual virtual model configuration
   */
  private static validateVirtualModel(vmId: string, vm: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const basePath = `virtualModels.${vmId}`;

    if (typeof vm !== 'object' || vm === null) {
      errors.push({
        code: 'INVALID_VIRTUAL_MODEL',
        message: `Virtual model ${vmId} must be an object`,
        path: basePath,
        actual: typeof vm,
        expected: 'object',
        severity: 'error',
      });
      return errors;
    }

    // Validate targets array
    if (!Array.isArray(vm.targets)) {
      errors.push({
        code: 'INVALID_TARGETS',
        message: `Virtual model ${vmId} targets must be an array`,
        path: `${basePath}.targets`,
        actual: typeof vm.targets,
        expected: 'array',
        severity: 'error',
      });
    } else if (vm.targets.length === 0) {
      errors.push({
        code: 'EMPTY_TARGETS',
        message: `Virtual model ${vmId} must have at least one target`,
        path: `${basePath}.targets`,
        severity: 'error',
      });
    } else {
      vm.targets.forEach((target: any, index: number) => {
        if (typeof target !== 'object' || target === null) {
          errors.push({
            code: 'INVALID_TARGET',
            message: `Virtual model ${vmId} target ${index} must be an object`,
            path: `${basePath}.targets[${index}]`,
            actual: typeof target,
            expected: 'object',
            severity: 'error',
          });
        } else {
          if (!target.providerId) {
            errors.push({
              code: 'MISSING_TARGET_PROVIDER',
              message: `Virtual model ${vmId} target ${index} missing providerId`,
              path: `${basePath}.targets[${index}].providerId`,
              severity: 'error',
            });
          }

          if (!target.modelId) {
            errors.push({
              code: 'MISSING_TARGET_MODEL',
              message: `Virtual model ${vmId} target ${index} missing modelId`,
              path: `${basePath}.targets[${index}].modelId`,
              severity: 'error',
            });
          }
        }
      });
    }

    // Validate boolean fields
    if (vm.enabled !== undefined && typeof vm.enabled !== 'boolean') {
      errors.push({
        code: 'INVALID_ENABLED',
        message: `Virtual model ${vmId} enabled must be a boolean`,
        path: `${basePath}.enabled`,
        actual: typeof vm.enabled,
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

    // Ensure no virtual model information is present
    if ((wrapper as any).virtualModels || (wrapper as any).providers) {
      errors.push({
        code: 'SERVER_WRAPPER_CONTAINS_VIRTUAL_MODELS',
        message: 'ServerWrapper should not contain virtual model or provider information',
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

    // Ensure virtual models are present and properly formatted
    if (!Array.isArray(wrapper.virtualModels)) {
      errors.push({
        code: 'PIPELINE_WRAPPER_MISSING_VIRTUAL_MODELS',
        message: 'PipelineWrapper must have virtualModels array',
        path: 'wrapper.virtualModels',
        actual: typeof wrapper.virtualModels,
        expected: 'array',
        severity: 'error',
      });
    } else if (wrapper.virtualModels.length === 0) {
      errors.push({
        code: 'PIPELINE_WRAPPER_EMPTY_VIRTUAL_MODELS',
        message: 'PipelineWrapper virtualModels array cannot be empty',
        path: 'wrapper.virtualModels',
        severity: 'error',
      });
    } else {
      wrapper.virtualModels.forEach((vm, index) => {
        if (!vm.id || !vm.targets || !Array.isArray(vm.targets) || vm.targets.length === 0) {
          errors.push({
            code: 'INVALID_PIPELINE_WRAPPER_VIRTUAL_MODEL',
            message: `Virtual model at index ${index} is invalid`,
            path: `wrapper.virtualModels[${index}]`,
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
        virtualModelCount: Object.keys(config.virtualModels || {}).length,
        configVersion: config.version || '1.0.0',
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
        result.errors.push(...serverErrors);
      }

      // Validate pipeline wrapper
      const pipelineErrors = ConfigValidator.validatePipelineWrapper(wrappers.pipeline);
      if (pipelineErrors.length > 0) {
        result.errors.push(...pipelineErrors);
      }

      if (result.errors.length === 0) {
        result.success = true;
        result.server = wrappers.server;
        result.pipeline = wrappers.pipeline;
      }

      result.metadata!.generationTime = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errors.push({
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
        virtualModels: Object.values(config.virtualModels || {}).map((vm) => ({
          id: vm.id,
          name: vm.id,
          modelId: vm.targets[0]?.modelId || '',
          provider: vm.targets[0]?.providerId || '',
          enabled: vm.enabled,
          targets: vm.targets.map((target) => ({
            providerId: target.providerId,
            modelId: target.modelId,
            weight: 1.0,
            enabled: true,
            keyIndex: target.keyIndex || 0,
          })),
          capabilities: ['chat', 'function-calling'],
          metadata: {
            priority: vm.priority,
            weight: vm.weight,
            targetCount: vm.targets.length,
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
          version: config.version || '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          providerCount: Object.keys(config.providers || {}).length,
          virtualModelCount: Object.keys(config.virtualModels || {}).length,
        },
      },
    };
  }
}

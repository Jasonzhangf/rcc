import { BaseModule, ModuleInfo } from '../basemodule/src/BaseModule';
import { TwoPhaseDebugSystem } from './TwoPhaseDebugSystem';

/**
 * Module startup configuration with two-phase debug support
 */
export interface ModuleStartupConfig {
  /**
   * Module information
   */
  moduleInfo: ModuleInfo;

  /**
   * Two-phase debug configuration
   */
  debugConfig: {
    enabled: boolean;
    baseDirectory: string;
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
    logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  };

  /**
   * Port configuration
   */
  portConfig: {
    port: number;
    host: string;
    useHttps: boolean;
  };

  /**
   * Module-specific configuration
   */
  moduleConfig: Record<string, any>;

  /**
   * Startup sequence configuration
   */
  startupSequence: {
    /**
     * Whether to enable two-phase debug
     */
    enableTwoPhaseDebug: boolean;

    /**
     * Whether to initialize debug before port setup
     */
    debugBeforePort: boolean;

    /**
     * Whether to switch to port mode after port initialization
     */
    switchToPortMode: boolean;

    /**
     * Timeout for startup operations (ms)
     */
    startupTimeout: number;
  };
}

/**
 * Base class for modules with two-phase debug startup support
 */
export abstract class TwoPhaseDebugModule extends BaseModule {
  protected startupConfig: ModuleStartupConfig;
  protected debugSystem: TwoPhaseDebugSystem;

  constructor(moduleInfo: ModuleInfo, startupConfig: Partial<ModuleStartupConfig> = {}) {
    super(moduleInfo);

    // Default startup configuration
    this.startupConfig = {
      moduleInfo,
      debugConfig: {
        enabled: true,
        baseDirectory: './debug-logs',
        enableFileLogging: true,
        enableConsoleLogging: true,
        logLevel: 'debug',
      },
      portConfig: {
        port: 0,
        host: '0.0.0.0',
        useHttps: false,
      },
      moduleConfig: {},
      startupSequence: {
        enableTwoPhaseDebug: true,
        debugBeforePort: true,
        switchToPortMode: true,
        startupTimeout: 30000,
      },
      ...startupConfig,
    };

    // Initialize debug system
    this.debugSystem = new TwoPhaseDebugSystem(this.startupConfig.debugConfig.baseDirectory);
  }

  /**
   * Phase 1: System start initialization (before port initialization)
   */
  protected async systemStartPhase(): Promise<void> {
    if (this.startupConfig.startupSequence.enableTwoPhaseDebug) {
      // Enable two-phase debug system
      this.enableTwoPhaseDebug(this.startupConfig.debugConfig.baseDirectory);

      // Log system start phase
      this.logInfo(
        'System start phase initialized',
        {
          module: this.info.id,
          phase: 'systemstart',
          directory: this.debugSystem.getCurrentLogDirectory(),
        },
        'systemStartPhase'
      );
    }

    // Configure module with startup config
    this.configure(this.startupConfig.moduleConfig);

    // Module-specific system start initialization
    await this.initializeSystemStart();
  }

  /**
   * Phase 2: Port initialization and debug mode switch
   */
  protected async portInitializationPhase(): Promise<void> {
    const { portConfig, startupSequence } = this.startupConfig;

    // Initialize port
    await this.initializePort(portConfig);

    // Switch debug to port mode if enabled
    if (
      startupSequence.enableTwoPhaseDebug &&
      startupSequence.switchToPortMode &&
      portConfig.port > 0
    ) {
      this.switchDebugToPortMode(portConfig.port);

      this.logInfo(
        'Port initialization phase completed',
        {
          port: portConfig.port,
          phase: 'port',
          directory: this.debugSystem.getCurrentLogDirectory(),
        },
        'portInitializationPhase'
      );
    }

    // Module-specific port initialization
    await this.initializePortSpecific();
  }

  /**
   * Module startup sequence with two-phase debug
   */
  public async startup(): Promise<void> {
    const { startupSequence } = this.startupConfig;

    try {
      // Phase 1: System start (before port initialization)
      if (startupSequence.debugBeforePort) {
        await this.systemStartPhase();
      }

      // Phase 2: Port initialization
      await this.portInitializationPhase();

      // Initialize the module
      await this.initialize();

      this.logInfo(
        'Module startup completed successfully',
        {
          module: this.info.id,
          port: this.startupConfig.portConfig.port,
          debugPhase: this.startupConfig.startupSequence.enableTwoPhaseDebug
            ? 'port'
            : 'systemstart',
        },
        'startup'
      );
    } catch (error) {
      this.error('Module startup failed', { error: (error as Error).message }, 'startup');
      throw error;
    }
  }

  /**
   * Initialize system start phase (override in subclasses)
   */
  protected async initializeSystemStart(): Promise<void> {
    // Base implementation - can be overridden
    this.logInfo('System start initialization completed', {}, 'initializeSystemStart');
  }

  /**
   * Initialize port (override in subclasses)
   */
  protected async initializePort(portConfig: any): Promise<void> {
    // Base implementation - can be overridden
    this.logInfo('Port initialization completed', { portConfig }, 'initializePort');
  }

  /**
   * Initialize port-specific features (override in subclasses)
   */
  protected async initializePortSpecific(): Promise<void> {
    // Base implementation - can be overridden
    this.logInfo('Port-specific initialization completed', {}, 'initializePortSpecific');
  }

  /**
   * Get startup configuration
   */
  public getStartupConfig(): ModuleStartupConfig {
    return { ...this.startupConfig };
  }

  /**
   * Update startup configuration
   */
  public updateStartupConfig(updates: Partial<ModuleStartupConfig>): void {
    this.startupConfig = { ...this.startupConfig, ...updates };
  }

  /**
   * Get debug system
   */
  public getDebugSystem(): TwoPhaseDebugSystem {
    return this.debugSystem;
  }
}

/**
 * Factory function to create module startup configuration
 */
export function createModuleStartupConfig(
  moduleId: string,
  port: number,
  overrides: Partial<ModuleStartupConfig> = {}
): ModuleStartupConfig {
  return {
    moduleInfo: {
      id: moduleId,
      name: moduleId,
      version: '1.0.0',
      description: `${moduleId} module`,
      type: 'generic',
      dependencies: [],
      config: {},
    },
    debugConfig: {
      enabled: true,
      baseDirectory: './debug-logs',
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: 'debug',
    },
    portConfig: {
      port,
      host: '0.0.0.0',
      useHttps: false,
    },
    moduleConfig: {},
    startupSequence: {
      enableTwoPhaseDebug: true,
      debugBeforePort: true,
      switchToPortMode: true,
      startupTimeout: 30000,
    },
    ...overrides,
  };
}

/**
 * Predefined module startup configurations
 */
export const ModuleStartupConfigs = {
  // API Server module configuration
  apiServer: (port: number = 3000) =>
    createModuleStartupConfig('api-server', port, {
      moduleInfo: {
        id: 'api-server',
        name: 'API Server',
        version: '1.0.0',
        description: 'API server module',
        type: 'server',
        dependencies: [],
      },
      moduleConfig: {
        corsEnabled: true,
        rateLimiting: true,
      },
    }),

  // Database module configuration
  database: (port: number = 5432) =>
    createModuleStartupConfig('database', port, {
      moduleInfo: {
        id: 'database',
        name: 'Database',
        version: '1.0.0',
        description: 'Database module',
        type: 'database',
        dependencies: [],
      },
      moduleConfig: {
        connectionPoolSize: 10,
        sslEnabled: false,
      },
    }),

  // Authentication module configuration
  auth: (port: number = 3001) =>
    createModuleStartupConfig('auth', port, {
      moduleInfo: {
        id: 'auth',
        name: 'Authentication',
        version: '1.0.0',
        description: 'Authentication module',
        type: 'service',
        dependencies: [],
      },
      moduleConfig: {
        jwtSecret: 'your-secret-key',
        tokenExpiry: 3600,
      },
    }),

  // Configuration module configuration
  config: (port: number = 3002) =>
    createModuleStartupConfig('config', port, {
      moduleInfo: {
        id: 'config',
        name: 'Configuration',
        version: '1.0.0',
        description: 'Configuration module',
        type: 'service',
        dependencies: [],
      },
      moduleConfig: {
        configFile: './config.json',
        watchChanges: true,
      },
    }),
};

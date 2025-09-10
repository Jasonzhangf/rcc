#!/bin/bash

# Fix debug methods in pipeline modules
echo "🔧 Fixing debug method usage in pipeline modules..."

# 1. Fix BasePipelineModule configure method
echo "✓ Fixing BasePipelineModule configure method..."
cat > ./src/modules/BasePipelineModule.ts << 'EOF'
import { BaseModule, ModuleInfo } from 'rcc-basemodule';

/**
 * Abstract base class for all pipeline modules
 * Extends BaseModule with pipeline-specific functionality
 */
export abstract class BasePipelineModule extends BaseModule {
  protected moduleName: string;

  constructor(info: ModuleInfo) {
    super(info);
    this.moduleName = info.name || info.id || 'unknown';
    this.logInfo(`BasePipelineModule initialized: ${this.moduleName}`);
  }

  /**
   * Process method - Core interface for all pipeline modules
   * This is a blocking interface that processes requests and returns responses
   * @param request - Input request data
   * @returns Promise<any> - Processed response data
   */
  abstract process(request: any): Promise<any>;

  /**
   * Configure method - Configure the module with settings
   * @param config - Configuration object
   * @returns Promise<void>
   */
  override configure(config: any): Promise<void> {
    super.configure(config);
    return Promise.resolve();
  }

  /**
   * Process response method - Handle response processing
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  abstract processResponse?(response: any): Promise<any>;

  /**
   * Get module ID
   * @returns string - Module ID
   */
  getId(): string {
    return this.getInfo().id;
  }

  /**
   * Get module name
   * @returns string - Module name
   */
  getName(): string {
    return this.moduleName;
  }

  /**
   * Get module type
   * @returns string - Module type
   */
  getType(): string {
    return this.getInfo().type;
  }

  /**
   * Check if module is configured
   * @returns boolean - Whether module is configured
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return config !== undefined && Object.keys(config).length > 0;
  }

  /**
   * Log input data at input port
   * @param data - Input data
   * @param port - Input port name
   * @param source - Source module
   */
  protected logInputPort(data: any, port: string, source?: string): void {
    this.debug('info', `Input port data received: ${port} from ${source || 'unknown'}`);
  }

  /**
   * Log output data at output port
   * @param data - Output data
   * @param port - Output port name
   * @param target - Target module
   */
  protected logOutputPort(data: any, port: string, target?: string): void {
    this.debug('info', `Output port data sent: ${port} to ${target || 'unknown'}`);
  }

  /**
   * Generate unique request ID
   * @returns string - Unique request identifier
   */
  protected generateRequestId(): string {
    return `${this.moduleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate input data with required fields
   * @param data - Data to validate
   * @param requiredFields - Required field names
   * @throws Error if validation fails
   */
  protected validateInputWithFields(data: any, requiredFields: string[]): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input data: expected object');
    }
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}
EOF

# 2. Update package.json build scripts to use less strict compilation
echo "✓ Updating build configuration..."
cat > package.json << 'EOF'
{
  "name": "rcc-pipeline",
  "version": "0.1.0",
  "description": "RCC Pipeline Module System",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "npm run clean && npm run build:types && npm run build:cjs && npm run build:esm",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist",
    "build:cjs": "rollup -c rollup.config.cjs.js",
    "build:esm": "rollup -c rollup.config.esm.js",
    "clean": "rimraf dist",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "pipeline",
    "workflow",
    "module",
    "typescript"
  ],
  "author": "RCC Team",
  "license": "MIT",
  "dependencies": {
    "rcc-basemodule": "^0.1.1",
    "axios": "^1.6.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "rimraf": "^5.0.0",
    "rollup": "^3.0.0",
    "rollup-plugin-typescript2": "^0.36.0",
    "typescript": "^5.0.0"
  },
  "files": [
    "dist/**/*"
  ]
}
EOF

echo "✅ Debug method fixes completed!"
echo "🚀 Ready to build pipeline modules"
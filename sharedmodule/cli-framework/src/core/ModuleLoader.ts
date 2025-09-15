/**
 * Module Loader for RCC CLI Framework
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ICommandModule, ModuleLoadResult } from '../interfaces/ICommandModule';
import { glob } from 'glob';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

export class ModuleLoader extends BaseModule {
  private loadedModules: Map<string, ICommandModule> = new Map();
  private moduleFiles: Map<string, string> = new Map();

  constructor(_framework: any, private modulePaths: string[]) {
    const moduleInfo: ModuleInfo = {
      id: 'ModuleLoader',
      name: 'Module Loader',
      version: '1.0.0',
      description: 'Dynamic module loader for CLI commands',
      type: 'loader',

      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);
  }

  async loadModules(): Promise<ModuleLoadResult[]> {
    const results: ModuleLoadResult[] = [];
    
    this.log('Scanning for command modules...');
    
    // Find all module files
    const moduleFiles = await this.findModuleFiles();
    this.log(`Found ${moduleFiles.length} potential module files`);

    for (const filePath of moduleFiles) {
      try {
        const result = await this.loadModule(filePath);
        results.push(result);
        
        if (result.success && result.module) {
          this.loadedModules.set(result.module.metadata.name, result.module);
          this.moduleFiles.set(result.module.metadata.name, filePath);
        }
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to load ${filePath}: ${(error as Error).message}`
        });
      }
    }

    return results;
  }

  async loadModule(filePath: string): Promise<ModuleLoadResult> {
    try {
      this.log(`Loading module from: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `Module file not found: ${filePath}`
        };
      }

      let moduleExports: any;
      
      // Try CommonJS require first
      try {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(filePath)];
        moduleExports = require(filePath);
      } catch (requireError) {
        // If require fails, try ES module import
        try {
          const fileUrl = pathToFileURL(path.resolve(filePath)).href;
          moduleExports = await import(fileUrl);
        } catch (importError) {
          return {
            success: false,
            error: `Failed to load module with both CommonJS and ES module import: ${(importError as Error).message}`
          };
        }
      }
      
      // Look for module class or default export
      let ModuleClass = moduleExports.default || moduleExports;
      
      // If no default export, look for common module export patterns
      if (!ModuleClass || typeof ModuleClass !== 'function') {
        const exportNames = Object.keys(moduleExports);
        const moduleExportName = exportNames.find(name => 
          name.endsWith('Module') || name.endsWith('CommandModule')
        );
        
        if (moduleExportName) {
          ModuleClass = moduleExports[moduleExportName];
        }
      }

      if (!ModuleClass) {
        return {
          success: false,
          error: `No module class found in ${filePath}. Expected default export or *Module class.`
        };
      }

      // Instantiate module
      const moduleInstance = new ModuleClass();
      
      // Validate module implements ICommandModule
      if (!this.isValidCommandModule(moduleInstance)) {
        return {
          success: false,
          error: `Module ${filePath} does not implement ICommandModule interface`
        };
      }

      // Check if module can be loaded
      if (moduleInstance.canLoad) {
        const canLoad = await moduleInstance.canLoad();
        if (!canLoad) {
          return {
            success: false,
            error: `Module ${moduleInstance.metadata.name} cannot be loaded in current environment`
          };
        }
      }

      this.log(`Successfully loaded module: ${moduleInstance.metadata.name}`);
      
      return {
        success: true,
        module: moduleInstance
      };

    } catch (error) {
      return {
        success: false,
        error: `Error loading module ${filePath}: ${(error as Error).message}`
      };
    }
  }

  async reloadModules(): Promise<void> {
    this.log('Reloading all modules...');
    
    // Clear module cache
    for (const [, filePath] of this.moduleFiles.entries()) {
      // Clear Node.js module cache
      delete require.cache[require.resolve(filePath)];
    }
    
    // Clear loaded modules
    this.loadedModules.clear();
    this.moduleFiles.clear();
    
    this.log('Module cache cleared');
  }

  getModule(name: string): ICommandModule | undefined {
    return this.loadedModules.get(name);
  }

  getAllModules(): ICommandModule[] {
    return Array.from(this.loadedModules.values());
  }

  getModuleNames(): string[] {
    return Array.from(this.loadedModules.keys());
  }

  private async findModuleFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.modulePaths) {
      try {
        const matches = await glob(pattern, { 
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*']
        });
        files.push(...matches);
      } catch (error) {
        this.warn(`Error scanning pattern ${pattern}: ${(error as Error).message}`);
      }
    }
    
    // Remove duplicates and sort
    return Array.from(new Set(files)).sort();
  }

  private isValidCommandModule(obj: any): obj is ICommandModule {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.metadata &&
      typeof obj.metadata.name === 'string' &&
      typeof obj.metadata.version === 'string' &&
      typeof obj.getCommands === 'function'
    );
  }

  getStats(): { loadedModules: number; moduleFiles: number } {
    return {
      loadedModules: this.loadedModules.size,
      moduleFiles: this.moduleFiles.size
    };
  }
}
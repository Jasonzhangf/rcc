declare module 'rcc-configuration' {
  export function createConfigurationSystem(options?: any): Promise<any>;
  export class ConfigurationSystem {
    // Add any methods or properties you need here
    loadConfiguration(configPath: string): Promise<any>;
    generatePipelineTable(): Promise<any>;
    getConfiguration(): Promise<any>;
  }
  // Add other exports as needed
}

declare module 'rcc-configuration/dist/index.esm.js' {
  export function createConfigurationSystem(options?: any): Promise<any>;
  export class ConfigurationSystem {
    // Add any methods or properties you need here
    loadConfiguration(configPath: string): Promise<any>;
    generatePipelineTable(): Promise<any>;
    getConfiguration(): Promise<any>;
  }
  // Add other exports as needed
}
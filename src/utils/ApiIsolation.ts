/**
 * Utility class for API isolation
 * Ensures modules only expose necessary interfaces
 */
export class ApiIsolation {
  /**
   * Creates a proxy for API isolation
   * Only exposes specified methods and properties
   * @param target - Target object
   * @param exposedMethods - Array of method names to expose
   * @param exposedProperties - Array of property names to expose
   * @returns Proxy with restricted access
   */
  public static createApiProxy<T extends object>(
    target: T,
    exposedMethods: string[] = [],
    exposedProperties: string[] = []
  ): T {
    // Create a more secure proxy using JavaScript Proxy
    return new Proxy(target, {
      // Intercept property access
      get(obj, prop) {
        // Allow access to exposed methods
        if (exposedMethods.includes(prop as string)) {
          return obj[prop as keyof T];
        }
        
        // Allow access to exposed properties
        if (exposedProperties.includes(prop as string)) {
          return obj[prop as keyof T];
        }
        
        // Special case: allow access to constructor and prototype
        if (prop === 'constructor' || prop === '__proto__') {
          return obj[prop as keyof T];
        }
        
        // For all other properties, throw an error
        throw new Error(`Access to property '${String(prop)}' is not allowed. This API is isolated.`);
      },
      
      // Intercept property setting
      set(obj, prop, value) {
        // Allow setting exposed properties
        if (exposedProperties.includes(prop as string)) {
          obj[prop as keyof T] = value;
          return true;
        }
        
        // For all other properties, throw an error
        throw new Error(`Setting property '${String(prop)}' is not allowed. This API is isolated.`);
      },
      
      // Intercept property enumeration
      ownKeys(obj) {
        // Only return exposed properties and methods
        const exposed = [...exposedMethods, ...exposedProperties];
        return exposed.filter(key => key in obj);
      },
      
      // Intercept property descriptor access
      getOwnPropertyDescriptor(obj, prop) {
        // Only return descriptors for exposed properties and methods
        if (exposedMethods.includes(prop as string) || exposedProperties.includes(prop as string)) {
          return Object.getOwnPropertyDescriptor(obj, prop);
        }
        return undefined;
      }
    }) as T;
  }
  
  /**
   * Creates a restricted interface for a module
   * @param module - Module instance
   * @param interfaceDefinition - Interface definition
   * @returns Restricted module interface
   */
  public static createModuleInterface<T extends object>(
    module: T,
    interfaceDefinition: {
      methods?: string[];
      properties?: string[];
    }
  ): T {
    return this.createApiProxy(
      module,
      interfaceDefinition.methods || [],
      interfaceDefinition.properties || []
    );
  }
}
/**
 * Interface for module information
 */
export interface ModuleInfo {
  /**
   * Unique identifier for the module
   */
  id: string;
  
  /**
   * Name of the module
   */
  name: string;
  
  /**
   * Version of the module
   */
  version: string;
  
  /**
   * Description of the module
   */
  description: string;
  
  /**
   * Type of the module
   */
  type: string;
  
  /**
   * Metadata for the module
   */
  metadata?: Record<string, any>;
}
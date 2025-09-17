export interface ModuleInfo {
  /**
   * Unique identifier for the module
   */
  id: string;

  /**
   * Module type
   */
  type: string;

  /**
   * Module name
   */
  name: string;

  /**
   * Module version
   */
  version: string;

  /**
   * Module description
   */
  description: string;

  /**
   * Additional module metadata
   */
  metadata?: Record<string, any>;
}

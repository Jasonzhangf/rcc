/**
 * Interface for connection information
 */
export interface ConnectionInfo {
  /**
   * Unique identifier for the connection
   */
  id: string;
  
  /**
   * Source module ID
   */
  sourceModuleId: string;
  
  /**
   * Target module ID
   */
  targetModuleId: string;
  
  /**
   * Connection type
   */
  type: 'input' | 'output';
  
  /**
   * Connection status
   */
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  
  /**
   * Connection metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for data transfer between modules
 */
export interface DataTransfer {
  /**
   * Unique identifier for the data transfer
   */
  id: string;
  
  /**
   * Source connection ID
   */
  sourceConnectionId: string;
  
  /**
   * Target connection ID
   */
  targetConnectionId: string;
  
  /**
   * Data payload
   */
  data: any;
  
  /**
   * Timestamp of the transfer
   */
  timestamp: number;
  
  /**
   * Transfer metadata
   */
  metadata?: Record<string, any>;
}
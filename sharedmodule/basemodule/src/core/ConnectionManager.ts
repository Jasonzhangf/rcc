import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';

/**
 * Manages module connections and data transfer operations
 */
export class ConnectionManager {
  private inputConnections: Map<string, ConnectionInfo> = new Map();
  private outputConnections: Map<string, ConnectionInfo> = new Map();
  private moduleId: string;

  constructor(moduleId: string) {
    this.moduleId = moduleId;
  }

  /**
   * Adds an input connection
   */
  public addInputConnection(connection: ConnectionInfo): void {
    if (connection.type !== 'input') {
      throw new Error('Invalid connection type for input');
    }
    this.inputConnections.set(connection.id, connection);
  }

  /**
   * Adds an output connection
   */
  public addOutputConnection(connection: ConnectionInfo): void {
    if (connection.type !== 'output') {
      throw new Error('Invalid connection type for output');
    }
    this.outputConnections.set(connection.id, connection);
  }

  /**
   * Removes an input connection
   */
  public removeInputConnection(connectionId: string): void {
    this.inputConnections.delete(connectionId);
  }

  /**
   * Removes an output connection
   */
  public removeOutputConnection(connectionId: string): void {
    this.outputConnections.delete(connectionId);
  }

  /**
   * Gets all input connections
   */
  public getInputConnections(): ConnectionInfo[] {
    return Array.from(this.inputConnections.values());
  }

  /**
   * Gets all output connections
   */
  public getOutputConnections(): ConnectionInfo[] {
    return Array.from(this.outputConnections.values());
  }

  /**
   * Transfers data to connected modules
   */
  public async transferData(data: any, targetConnectionId?: string): Promise<void> {
    // Get target connections
    let targetConnections: ConnectionInfo[];

    if (targetConnectionId) {
      // If a specific connection ID is provided, use it
      const connection = this.outputConnections.get(targetConnectionId);
      if (!connection) {
        throw new Error(`Output connection with ID '${targetConnectionId}' not found`);
      }
      targetConnections = [connection];
    } else {
      // Otherwise, use all output connections
      targetConnections = Array.from(this.outputConnections.values());
    }

    // Create data transfer objects for each target connection
    const transfers: DataTransfer[] = targetConnections.map(connection => ({
      id: `${this.moduleId}-${connection.id}-${Date.now()}`,
      sourceConnectionId: connection.id,
      targetConnectionId: connection.targetModuleId,
      data,
      timestamp: Date.now(),
      metadata: connection.metadata
    }));

    // Send data to each target module
    for (const transfer of transfers) {
      // In a real implementation, you would send the data to the target module
      // For now, we'll just log the transfer
      console.log(`Transferring data from module ${this.moduleId} to connection ${transfer.targetConnectionId}:`, data);
    }
  }

  /**
   * Receives data from connected modules
   * This method should be overridden by subclasses
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    // Base receive data implementation
    // This should be overridden by subclasses for specific receive logic
    console.log(`Module ${this.moduleId} received data:`, dataTransfer.data);
  }

  /**
   * Performs handshake with another module
   */
  public async handshake(targetModuleId: string): Promise<boolean> {
    // Base handshake implementation
    // This should be overridden by subclasses for specific handshake logic
    console.log(`Handshake performed from ${this.moduleId} to ${targetModuleId}`);
    return true;
  }

  /**
   * Cleanup all connections
   */
  public cleanup(): void {
    this.inputConnections.clear();
    this.outputConnections.clear();
  }
}
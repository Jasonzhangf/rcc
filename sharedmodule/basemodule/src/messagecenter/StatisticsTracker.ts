import { MessageCenterStats } from '../interfaces/Message';

/**
 * Tracks and manages message center statistics
 */
export class StatisticsTracker {
  private stats: MessageCenterStats = {
    totalMessages: 0,
    totalRequests: 0,
    activeRequests: 0,
    registeredModules: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    averageResponseTime: 0,
    uptime: 0,
  };

  private responseTimes: number[] = [];
  private startTime: number = Date.now();
  private maxResponseTimes: number = 1000;

  /**
   * Increment total messages count
   */
  public incrementTotalMessages(): void {
    this.stats.totalMessages++;
  }

  /**
   * Increment total requests count
   */
  public incrementTotalRequests(): void {
    this.stats.totalRequests++;
  }

  /**
   * Increment active requests count
   */
  public incrementActiveRequests(): void {
    this.stats.activeRequests++;
  }

  /**
   * Decrement active requests count
   */
  public decrementActiveRequests(): void {
    this.stats.activeRequests = Math.max(0, this.stats.activeRequests - 1);
  }

  /**
   * Increment delivered messages count
   */
  public incrementMessagesDelivered(): void {
    this.stats.messagesDelivered++;
  }

  /**
   * Increment failed messages count
   */
  public incrementMessagesFailed(): void {
    this.stats.messagesFailed++;
  }

  /**
   * Set registered modules count
   * @param count - Number of registered modules
   */
  public setRegisteredModules(count: number): void {
    this.stats.registeredModules = count;
  }

  /**
   * Record a response time
   * @param responseTime - Response time in milliseconds
   */
  public recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only the most recent response times
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes / 10);
    }

    // Update average response time
    this.updateAverageResponseTime();
  }

  /**
   * Update the average response time based on recorded times
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
      this.stats.averageResponseTime = Math.round(sum / this.responseTimes.length);
    } else {
      this.stats.averageResponseTime = 0;
    }
  }

  /**
   * Get current statistics
   * @returns Current statistics
   */
  public getStats(): MessageCenterStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Reset all statistics
   */
  public reset(): void {
    this.stats = {
      totalMessages: 0,
      totalRequests: 0,
      activeRequests: 0,
      registeredModules: this.stats.registeredModules, // Keep current module count
      messagesDelivered: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      uptime: 0,
    };
    this.responseTimes = [];
    this.startTime = Date.now();
  }

  /**
   * Get response time statistics
   * @returns Response time statistics
   */
  public getResponseTimeStats(): {
    count: number;
    average: number;
    min: number;
    max: number;
    last: number | undefined;
  } {
    if (this.responseTimes.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        last: undefined,
      };
    }

    const count = this.responseTimes.length;
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    const average = Math.round(sum / count);
    const min = Math.min(...this.responseTimes);
    const max = Math.max(...this.responseTimes);
    const last = this.responseTimes[this.responseTimes.length - 1];

    return {
      count,
      average,
      min,
      max,
      last,
    };
  }

  /**
   * Get success rate (percentage of successful deliveries)
   * @returns Success rate percentage (0-100)
   */
  public getSuccessRate(): number {
    const total = this.stats.messagesDelivered + this.stats.messagesFailed;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.stats.messagesDelivered / total) * 100);
  }

  /**
   * Get throughput (messages per second)
   * @returns Messages per second
   */
  public getThroughput(): number {
    const uptime = (Date.now() - this.startTime) / 1000; // Convert to seconds
    if (uptime <= 0) {
      return 0;
    }
    return Math.round(this.stats.totalMessages / uptime);
  }

  /**
   * Get detailed performance metrics
   * @returns Detailed performance metrics
   */
  public getPerformanceMetrics(): {
    uptime: number;
    throughput: number;
    successRate: number;
    responseTime: {
      average: number;
      min: number;
      max: number;
      count: number;
    };
    load: {
      activeRequests: number;
      registeredModules: number;
    };
  } {
    const responseTimeStats = this.getResponseTimeStats();

    return {
      uptime: Date.now() - this.startTime,
      throughput: this.getThroughput(),
      successRate: this.getSuccessRate(),
      responseTime: {
        average: responseTimeStats.average,
        min: responseTimeStats.min,
        max: responseTimeStats.max,
        count: responseTimeStats.count,
      },
      load: {
        activeRequests: this.stats.activeRequests,
        registeredModules: this.stats.registeredModules,
      },
    };
  }

  /**
   * Get the number of recorded response times
   * @returns Number of recorded response times
   */
  public getResponseTimeCount(): number {
    return this.responseTimes.length;
  }

  /**
   * Clear recorded response times
   */
  public clearResponseTimes(): void {
    this.responseTimes = [];
    this.stats.averageResponseTime = 0;
  }

  /**
   * Set the maximum number of response times to keep
   * @param max - Maximum number of response times
   */
  public setMaxResponseTimes(max: number): void {
    this.maxResponseTimes = Math.max(1, max);

    // Trim existing response times if needed
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-Math.floor(this.maxResponseTimes / 10));
    }
  }

  /**
   * Get uptime in human-readable format
   * @returns Human-readable uptime string
   */
  public getUptimeString(): string {
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
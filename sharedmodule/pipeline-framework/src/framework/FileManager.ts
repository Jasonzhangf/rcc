/**
 * File Manager - Log File Management System
 * 文件管理器 - 日志文件管理系统
 */

import {
  DebugConfig,
  RequestResponseLog,
  ErrorLog,
  SystemLog,
  PerformanceMetrics,
  LogEntry
} from '../types/debug-types';
import { FileManagerOptions } from '../types/debug-types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File Manager Implementation
 * 文件管理器实现
 */
export class FileManager {
  private config: DebugConfig;
  private options: FileManagerOptions;
  private basePath: string;
  private activeWriters: Map<string, fs.WriteStream> = new Map();

  constructor(config: DebugConfig, options: FileManagerOptions = {}) {
    this.config = config;
    this.options = {
      config,
      enableCompression: false,
      compressionFormat: 'gzip',
      enableBackup: false,
      ...options
    };
    this.basePath = config.baseDirectory;
  }

  /**
   * Ensure directory exists
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Generate log file name with timestamp
   * 生成带时间戳的日志文件名
   */
  private generateLogFileName(type: string, extension: string = 'jsonl'): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 6);
    return `${type}_${date}_${timestamp}_${randomSuffix}.${extension}`;
  }

  /**
   * Generate log file path
   * 生成日志文件路径
   */
  private generateLogFilePath(subdirectory: string, type: string, extension: string = 'jsonl'): string {
    const dirPath = path.join(this.basePath, subdirectory);
    const fileName = this.generateLogFileName(type, extension);
    return path.join(dirPath, fileName);
  }

  /**
   * Get file size in bytes
   * 获取文件大小（字节）
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if file size exceeds limit
   * 检查文件大小是否超过限制
   */
  private async isFileSizeExceeded(filePath: string): Promise<boolean> {
    const maxSizeBytes = this.config.fileManagement.maxFileSize * 1024 * 1024; // Convert MB to bytes
    const fileSize = await this.getFileSize(filePath);
    return fileSize > maxSizeBytes;
  }

  /**
   * Get existing log files in directory
   * 获取目录中的现有日志文件
   */
  private async getExistingLogFiles(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files
        .filter(file => file.endsWith('.jsonl') || file.endsWith('.json'))
        .map(file => path.join(directory, file));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old log files
   * 清理旧日志文件
   */
  private async cleanupOldFiles(directory: string): Promise<void> {
    const files = await this.getExistingLogFiles(directory);

    // Sort by modification time (oldest first)
    const fileStats = await Promise.all(
      files.map(async (filePath) => ({
        filePath,
        stats: await fs.stat(filePath)
      }))
    );

    fileStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

    // Remove oldest files if we exceed max files
    const maxFiles = this.config.fileManagement.maxFiles;
    if (fileStats.length > maxFiles) {
      const filesToRemove = fileStats.slice(0, fileStats.length - maxFiles);
      await Promise.all(filesToRemove.map(({ filePath }) => fs.unlink(filePath)));
    }

    // Remove files older than retention period
    if (this.config.fileManagement.retentionDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.fileManagement.retentionDays);

      const oldFiles = fileStats.filter(({ stats }) => stats.mtime < cutoffDate);
      await Promise.all(oldFiles.map(({ filePath }) => fs.unlink(filePath)));
    }
  }

  /**
   * Get or create write stream for file
   * 获取或创建文件写入流
   */
  private async getWriteStream(filePath: string): Promise<fs.WriteStream> {
    if (this.activeWriters.has(filePath)) {
      return this.activeWriters.get(filePath)!;
    }

    const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    this.activeWriters.set(filePath, writeStream);

    // Handle stream errors
    writeStream.on('error', (error) => {
      console.error(`Write stream error for ${filePath}:`, error);
      this.activeWriters.delete(filePath);
    });

    return writeStream;
  }

  /**
   * Close write stream
   * 关闭写入流
   */
  private async closeWriteStream(filePath: string): Promise<void> {
    const stream = this.activeWriters.get(filePath);
    if (stream) {
      await new Promise<void>((resolve, reject) => {
        stream.end((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      this.activeWriters.delete(filePath);
    }
  }

  /**
   * Write log entry to file
   * 写入日志条目到文件
   */
  private async writeLogEntry(
    filePath: string,
    logEntry: any,
    format: 'jsonl' | 'json' | 'pretty' = 'jsonl'
  ): Promise<void> {
    try {
      // Check if we need to create a new file due to size limit
      if (await this.isFileSizeExceeded(filePath)) {
        await this.closeWriteStream(filePath);
        // Generate new file name
        const dirPath = path.dirname(filePath);
        const baseName = path.basename(filePath, path.extname(filePath));
        const newFileName = `${baseName}_${Date.now()}${path.extname(filePath)}`;
        filePath = path.join(dirPath, newFileName);
      }

      // Get or create write stream
      const stream = await this.getWriteStream(filePath);

      // Format log entry
      let logLine: string;
      switch (format) {
        case 'json':
          logLine = JSON.stringify(logEntry, null, 2);
          break;
        case 'pretty':
          logLine = this.formatPrettyLog(logEntry);
          break;
        default:
          logLine = JSON.stringify(logEntry);
      }

      // Write to stream
      stream.write(logLine + '\n');

    } catch (error) {
      console.error('Failed to write log entry:', error);
      throw error;
    }
  }

  /**
   * Format log entry for pretty printing
   * 格式化日志条目以便美观打印
   */
  private formatPrettyLog(logEntry: any): string {
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const level = logEntry.level || 'INFO';
    const message = logEntry.message || 'Log entry';

    let prettyLog = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    if (logEntry.requestId) {
      prettyLog += `Request ID: ${logEntry.requestId}\n`;
    }

    if (logEntry.provider) {
      prettyLog += `Provider: ${logEntry.provider}\n`;
    }

    if (logEntry.operation) {
      prettyLog += `Operation: ${logEntry.operation}\n`;
    }

    if (logEntry.error) {
      prettyLog += `Error: ${logEntry.error}\n`;
    }

    if (logEntry.metadata) {
      prettyLog += `Metadata: ${JSON.stringify(logEntry.metadata, null, 2)}\n`;
    }

    return prettyLog + '---\n';
  }

  /**
   * Write to request log
   * 写入请求日志
   */
  async writeToRequestLog(logEntry: RequestResponseLog): Promise<void> {
    if (!this.config.enabled) return;

    const filePath = this.generateLogFilePath(this.config.paths.requests, 'requests');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, logEntry);
  }

  /**
   * Write to response log
   * 写入响应日志
   */
  async writeToResponseLog(logEntry: RequestResponseLog): Promise<void> {
    if (!this.config.enabled) return;

    const filePath = this.generateLogFilePath(this.config.paths.responses, 'responses');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, logEntry);
  }

  /**
   * Write to error log
   * 写入错误日志
   */
  async writeToErrorLog(logEntry: RequestResponseLog | ErrorLog): Promise<void> {
    if (!this.config.enabled) return;

    const filePath = this.generateLogFilePath(this.config.paths.errors, 'errors');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, logEntry);
  }

  /**
   * Write to pipeline log
   * 写入流水线日志
   */
  async writeToPipelineLog(logEntry: RequestResponseLog): Promise<void> {
    if (!this.config.enabled) return;

    const filePath = this.generateLogFilePath(this.config.paths.pipeline, 'pipeline');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, logEntry);
  }

  /**
   * Write to system log
   * 写入系统日志
   */
  async writeToSystemLog(logEntry: SystemLog): Promise<void> {
    if (!this.config.enabled) return;

    const filePath = this.generateLogFilePath(this.config.paths.system, 'system');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, logEntry);
  }

  /**
   * Write performance metrics
   * 写入性能指标
   */
  async writePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.config.enabled || !this.config.performanceTracking.enabled) return;

    const filePath = this.generateLogFilePath('performance', 'metrics');
    await this.ensureDirectory(path.dirname(filePath));
    await this.cleanupOldFiles(path.dirname(filePath));
    await this.writeLogEntry(filePath, metrics);
  }

  /**
   * Write custom log entry
   * 写入自定义日志条目
   */
  async writeCustomLog(
    subdirectory: string,
    fileName: string,
    logEntry: LogEntry,
    format: 'jsonl' | 'json' | 'pretty' = 'jsonl'
  ): Promise<void> {
    if (!this.config.enabled) return;

    const dirPath = path.join(this.basePath, subdirectory);
    const filePath = path.join(dirPath, fileName);
    await this.ensureDirectory(dirPath);
    await this.cleanupOldFiles(dirPath);
    await this.writeLogEntry(filePath, logEntry, format);
  }

  /**
   * Read log file
   * 读取日志文件
   */
  async readLogFile(filePath: string): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      return lines
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error(`Failed to read log file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Get log files in directory
   * 获取目录中的日志文件
   */
  async getLogFiles(subdirectory?: string): Promise<string[]> {
    const searchPath = subdirectory
      ? path.join(this.basePath, subdirectory)
      : this.basePath;

    try {
      const files = await fs.readdir(searchPath);
      return files
        .filter(file => file.endsWith('.jsonl') || file.endsWith('.json'))
        .map(file => path.join(searchPath, file));
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete log file
   * 删除日志文件
   */
  async deleteLogFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete log file ${filePath}:`, error);
    }
  }

  /**
   * Archive old log files
   * 归档旧日志文件
   */
  async archiveOldLogs(): Promise<void> {
    if (!this.options.enableCompression) return;

    const directories = Object.values(this.config.paths);

    for (const directory of directories) {
      const dirPath = path.join(this.basePath, directory);
      const files = await this.getExistingLogFiles(dirPath);

      for (const file of files) {
        const stats = await fs.stat(file);
        const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceModified > 7) { // Archive files older than 7 days
          await this.compressFile(file);
        }
      }
    }
  }

  /**
   * Compress file
   * 压缩文件
   */
  private async compressFile(filePath: string): Promise<void> {
    if (!this.options.enableCompression) return;

    try {
      const zlib = require('zlib');
      const gzip = zlib.createGzip();
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(filePath + '.gz');

      await new Promise((resolve, reject) => {
        input
          .pipe(gzip)
          .pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });

      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to compress file ${filePath}:`, error);
    }
  }

  /**
   * Close all write streams
   * 关闭所有写入流
   */
  async closeAllStreams(): Promise<void> {
    const closePromises = Array.from(this.activeWriters.keys()).map(filePath =>
      this.closeWriteStream(filePath)
    );
    await Promise.all(closePromises);
  }

  /**
   * Get file statistics
   * 获取文件统计
   */
  async getFileStatistics(subdirectory?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    const searchPath = subdirectory
      ? path.join(this.basePath, subdirectory)
      : this.basePath;

    const files = await this.getLogFiles(subdirectory);

    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0
      };
    }

    const fileStats = await Promise.all(
      files.map(async (filePath) => ({
        stats: await fs.stat(filePath)
      }))
    );

    const totalSize = fileStats.reduce((sum, { stats }) => sum + stats.size, 0);
    const mtimes = fileStats.map(({ stats }) => stats.mtime.getTime());
    const oldestFile = new Date(Math.min(...mtimes));
    const newestFile = new Date(Math.max(...mtimes));

    return {
      totalFiles: files.length,
      totalSize,
      oldestFile,
      newestFile
    };
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.closeAllStreams();
    await this.archiveOldLogs();
  }
}
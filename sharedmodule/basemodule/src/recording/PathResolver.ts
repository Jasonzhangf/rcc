import {
  RecordingTemplates,
  CycleRecordingConfig,
  ErrorRecordingConfig,
  BaseModuleRecordingConfig
} from '../interfaces/Recording';

/**
 * Path resolver that handles template-based path resolution with variable substitution
 */
export class PathResolver {
  private globalVariables: Map<string, string> = new Map();
  private customTemplates: Map<string, string> = new Map();

  constructor() {
    this.initializeGlobalVariables();
  }

  // ========================================
  // Template Resolution Methods
  // ========================================

  /**
   * Resolve a path template with variables
   */
  resolveTemplate(template: string, variables: Record<string, any> = {}): string {
    if (!template || typeof template !== 'string') {
      return template || '';
    }

    let result = template;

    // Apply global variables first
    for (const [key, value] of this.globalVariables.entries()) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    // Apply custom templates
    for (const [key, value] of this.customTemplates.entries()) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    // Apply provided variables
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }

    // Apply built-in functions
    result = this.applyBuiltInFunctions(result);

    // Clean up unresolved variables
    result = result.replace(/\$\{[^}]+\}/g, '');

    return result;
  }

  /**
   * Resolve cycle recording path
   */
  resolveCyclePath(config: CycleRecordingConfig, variables: {
    cycleId: string;
    requestId?: string;
    sessionId?: string;
    timestamp: number;
  }): string {
    const basePath = config.basePath || './cycle-logs';
    const template = config.cycleDirTemplate || 'cycles/${cycleId}';

    const extendedVariables = {
      ...variables,
      date: new Date(variables.timestamp).toISOString().split('T')[0],
      time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
      timestamp: variables.timestamp,
      year: new Date(variables.timestamp).getFullYear(),
      month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
      day: String(new Date(variables.timestamp).getDate()).padStart(2, '0'),
      hour: String(new Date(variables.timestamp).getHours()).padStart(2, '0'),
      minute: String(new Date(variables.timestamp).getMinutes()).padStart(2, '0'),
      second: String(new Date(variables.timestamp).getSeconds()).padStart(2, '0'),
      millisecond: String(new Date(variables.timestamp).getMilliseconds()).padStart(3, '0')
    };

    const resolvedPath = this.resolveTemplate(template, extendedVariables);

    // Combine with base path
    return this.joinPaths(basePath, resolvedPath);
  }

  /**
   * Resolve error recording path
   */
  resolveErrorPath(config: ErrorRecordingConfig, variables: {
    errorId: string;
    timestamp: number;
    level?: string;
    category?: string;
  }): string {
    const basePath = config.basePath || './error-logs';
    const template = config.detailFileTemplate || 'errors/${errorId}.json';

    const extendedVariables = {
      ...variables,
      date: new Date(variables.timestamp).toISOString().split('T')[0],
      time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
      timestamp: variables.timestamp,
      year: new Date(variables.timestamp).getFullYear(),
      month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
      day: String(new Date(variables.timestamp).getDate()).padStart(2, '0'),
      hour: String(new Date(variables.timestamp).getHours()).padStart(2, '0'),
      minute: String(new Date(variables.timestamp).getMinutes()).padStart(2, '0'),
      second: String(new Date(variables.timestamp).getSeconds()).padStart(2, '0'),
      level: variables.level || 'unknown',
      category: variables.category || 'system'
    };

    const resolvedPath = this.resolveTemplate(template, extendedVariables);

    // Combine with base path
    return this.joinPaths(basePath, resolvedPath);
  }

  /**
   * Resolve complete file path for cycle recording
   */
  resolveCycleFilePath(config: CycleRecordingConfig, variables: {
    cycleId: string;
    type: 'start' | 'middle' | 'end';
    index: number;
    format: string;
    timestamp: number;
  }): string {
    const cyclePath = this.resolveCyclePath(config, variables);
    const fileTemplate = config.mainFileTemplate || 'main.${format}';

    const fileVariables = {
      ...variables,
      date: new Date(variables.timestamp).toISOString().split('T')[0],
      time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
      paddedIndex: String(variables.index).padStart(6, '0'),
      fileType: variables.type,
      extension: this.getFormatExtension(variables.format)
    };

    const fileName = this.resolveTemplate(fileTemplate, fileVariables);
    return this.joinPaths(cyclePath, fileName);
  }

  /**
   * Resolve error index file path
   */
  resolveErrorIndexPath(config: ErrorRecordingConfig, variables: {
    date?: string;
    timestamp: number;
  }): string {
    const basePath = config.basePath || './error-logs';
    const template = config.indexFileTemplate || 'errors/index.jsonl';

    const extendedVariables = {
      ...variables,
      date: variables.date || new Date(variables.timestamp).toISOString().split('T')[0],
      time: new Date(variables.timestamp).toISOString().split('T')[1].split('.')[0],
      timestamp: variables.timestamp,
      year: new Date(variables.timestamp).getFullYear(),
      month: String(new Date(variables.timestamp).getMonth() + 1).padStart(2, '0'),
      day: String(new Date(variables.timestamp).getDate()).padStart(2, '0')
    };

    const resolvedPath = this.resolveTemplate(template, extendedVariables);

    // Combine with base path
    return this.joinPaths(basePath, resolvedPath);
  }

  // ========================================
  // Variable Management
  // ========================================

  /**
   * Set global variable
   */
  setGlobalVariable(name: string, value: string): void {
    this.globalVariables.set(name, value);
  }

  /**
   * Get global variable
   */
  getGlobalVariable(name: string): string | undefined {
    return this.globalVariables.get(name);
  }

  /**
   * Remove global variable
   */
  removeGlobalVariable(name: string): boolean {
    return this.globalVariables.delete(name);
  }

  /**
   * Get all global variables
   */
  getGlobalVariables(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.globalVariables.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Set custom template
   */
  setCustomTemplate(name: string, template: string): void {
    this.customTemplates.set(name, template);
  }

  /**
   * Get custom template
   */
  getCustomTemplate(name: string): string | undefined {
    return this.customTemplates.get(name);
  }

  /**
   * Remove custom template
   */
  removeCustomTemplate(name: string): boolean {
    return this.customTemplates.delete(name);
  }

  /**
   * Get all custom templates
   */
  getCustomTemplates(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.customTemplates.entries()) {
      result[key] = value;
    }
    return result;
  }

  // ========================================
  // Path Validation and Normalization
  // ========================================

  /**
   * Validate path template
   */
  validateTemplate(template: string): {
    valid: boolean;
    errors: string[];
    variables: string[];
  } {
    const errors: string[] = [];
    const variables: string[] = [];

    if (!template || typeof template !== 'string') {
      errors.push('Template must be a non-empty string');
      return { valid: false, errors, variables };
    }

    // Extract variables
    const variableMatches = template.match(/\$\{([^}]+)\}/g);
    if (variableMatches) {
      for (const match of variableMatches) {
        const variableName = match.replace(/[${}]/g, '');
        variables.push(variableName);

        // Validate variable name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
          errors.push(`Invalid variable name: ${variableName}`);
        }
      }
    }

    // Check for recursive templates
    if (template.includes('${${')) {
      errors.push('Template contains recursive variable references');
    }

    // Check for malformed templates
    if (template.includes('${') && !template.includes('}')) {
      errors.push('Template contains unclosed variable reference');
    }

    return {
      valid: errors.length === 0,
      errors,
      variables
    };
  }

  /**
   * Normalize path
   */
  normalizePath(path: string): string {
    // Replace backslashes with forward slashes
    path = path.replace(/\\/g, '/');

    // Remove redundant slashes
    path = path.replace(/\/+/g, '/');

    // Remove leading/trailing slashes (unless it's root)
    if (path.length > 1) {
      path = path.replace(/^\/+|\/+$/g, '');
    }

    return path;
  }

  /**
   * Join path segments
   */
  joinPaths(...segments: string[]): string {
    const nonEmptySegments = segments.filter(segment => segment && segment.trim() !== '');
    return this.normalizePath(nonEmptySegments.join('/'));
  }

  /**
   * Get absolute path
   */
  getAbsolutePath(relativePath: string, basePath: string = process.cwd()): string {
    if (this.isAbsolutePath(relativePath)) {
      return this.normalizePath(relativePath);
    }

    return this.joinPaths(basePath, relativePath);
  }

  /**
   * Check if path is absolute
   */
  isAbsolutePath(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Extract variables from template
   */
  extractVariables(template: string): string[] {
    if (!template) return [];

    const matches = template.match(/\$\{([^}]+)\}/g);
    if (!matches) return [];

    return matches.map(match => match.replace(/[${}]/g, '')).filter(Boolean);
  }

  /**
   * Check if template contains variable
   */
  containsVariable(template: string, variable: string): boolean {
    if (!template || !variable) return false;

    const regex = new RegExp(`\\$\\{${variable}\\}`, 'g');
    return regex.test(template);
  }

  /**
   * Get format extension
   */
  private getFormatExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return 'json';
      case 'jsonl':
        return 'jsonl';
      case 'csv':
        return 'csv';
      case 'txt':
        return 'txt';
      case 'log':
        return 'log';
      default:
        return format;
    }
  }

  /**
   * Apply built-in functions
   */
  private applyBuiltInFunctions(template: string): string {
    // Date functions
    template = template.replace(/\$\{date:([^}]+)\}/g, (match, format) => {
      return this.formatDate(new Date(), format);
    });

    // Timestamp functions
    template = template.replace(/\$\{timestamp:([^}]+)\}/g, (match, format) => {
      return this.formatTimestamp(Date.now(), format);
    });

    // Random functions
    template = template.replace(/\$\{random:([^}]+)\}/g, (match, length) => {
      return this.generateRandomString(parseInt(length) || 8);
    });

    // UUID functions
    template = template.replace(/\$\{uuid\}/g, () => {
      return this.generateUUID();
    });

    return template;
  }

  /**
   * Format date
   */
  private formatDate(date: Date, format: string): string {
    const replacements: Record<string, string> = {
      'YYYY': String(date.getFullYear()),
      'YY': String(date.getFullYear()).slice(-2),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'DD': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'ss': String(date.getSeconds()).padStart(2, '0'),
      'SSS': String(date.getMilliseconds()).padStart(3, '0')
    };

    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(timestamp: number, format: string): string {
    return this.formatDate(new Date(timestamp), format);
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Initialize global variables
   */
  private initializeGlobalVariables(): void {
    const now = new Date();

    this.globalVariables.set('hostname', process.env.HOSTNAME || 'localhost');
    this.globalVariables.set('pid', String(process.pid));
    this.globalVariables.set('platform', process.platform);
    this.globalVariables.set('arch', process.arch);
    this.globalVariables.set('nodeVersion', process.version);
    this.globalVariables.set('username', process.env.USER || 'unknown');
    this.globalVariables.set('cwd', process.cwd());
    this.globalVariables.set('tempDir', process.env.TMPDIR || '/tmp');
    this.globalVariables.set('homeDir', process.env.HOME || '/home/user');

    // Date/time variables
    this.globalVariables.set('currentYear', String(now.getFullYear()));
    this.globalVariables.set('currentMonth', String(now.getMonth() + 1).padStart(2, '0'));
    this.globalVariables.set('currentDay', String(now.getDate()).padStart(2, '0'));
    this.globalVariables.set('currentHour', String(now.getHours()).padStart(2, '0'));
    this.globalVariables.set('currentMinute', String(now.getMinutes()).padStart(2, '0'));
    this.globalVariables.set('currentSecond', String(now.getSeconds()).padStart(2, '0'));
    this.globalVariables.set('currentDate', now.toISOString().split('T')[0]);
    this.globalVariables.set('currentTime', now.toISOString().split('T')[1].split('.')[0]);
    this.globalVariables.set('currentTimestamp', String(now.getTime()));
  }

  /**
   * Get supported variables
   */
  getSupportedVariables(): Array<{
    category: string;
    variables: Array<{ name: string; description: string }>;
  }> {
    return [
      {
        category: 'Global Variables',
        variables: [
          { name: 'hostname', description: 'System hostname' },
          { name: 'pid', description: 'Process ID' },
          { name: 'platform', description: 'Operating system platform' },
          { name: 'arch', description: 'System architecture' },
          { name: 'nodeVersion', description: 'Node.js version' },
          { name: 'username', description: 'Current username' },
          { name: 'cwd', description: 'Current working directory' },
          { name: 'tempDir', description: 'Temporary directory' },
          { name: 'homeDir', description: 'User home directory' }
        ]
      },
      {
        category: 'Date/Time Variables',
        variables: [
          { name: 'currentYear', description: 'Current year (4 digits)' },
          { name: 'currentMonth', description: 'Current month (2 digits)' },
          { name: 'currentDay', description: 'Current day (2 digits)' },
          { name: 'currentHour', description: 'Current hour (2 digits)' },
          { name: 'currentMinute', description: 'Current minute (2 digits)' },
          { name: 'currentSecond', description: 'Current second (2 digits)' },
          { name: 'currentDate', description: 'Current date (YYYY-MM-DD)' },
          { name: 'currentTime', description: 'Current time (HH:MM:SS)' },
          { name: 'currentTimestamp', description: 'Current timestamp in milliseconds' }
        ]
      },
      {
        category: 'Context Variables',
        variables: [
          { name: 'cycleId', description: 'Cycle identifier' },
          { name: 'requestId', description: 'Request identifier' },
          { name: 'sessionId', description: 'Session identifier' },
          { name: 'traceId', description: 'Trace identifier' },
          { name: 'errorId', description: 'Error identifier' },
          { name: 'timestamp', description: 'Event timestamp' },
          { name: 'date', description: 'Event date (YYYY-MM-DD)' },
          { name: 'time', description: 'Event time (HH:MM:SS)' },
          { name: 'format', description: 'File format' },
          { name: 'type', description: 'Event type' },
          { name: 'index', description: 'Event index' },
          { name: 'level', description: 'Error level' },
          { name: 'category', description: 'Error category' }
        ]
      },
      {
        category: 'Built-in Functions',
        variables: [
          { name: 'date:format', description: 'Format current date with custom format' },
          { name: 'timestamp:format', description: 'Format timestamp with custom format' },
          { name: 'random:length', description: 'Generate random string of specified length' },
          { name: 'uuid', description: 'Generate UUID' }
        ]
      }
    ];
  }
}
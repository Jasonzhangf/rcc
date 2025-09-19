import {
  FieldTruncationConfig,
  FieldTruncationRule,
  PathPatternRule,
  TruncationContext,
  TruncationStatistics,
  TruncationReport
} from '../interfaces/Recording';

/**
 * Field truncation component that handles data size optimization
 */
export class FieldTruncator {
  private config: FieldTruncationConfig;
  private statistics: TruncationStatistics;

  constructor(config: FieldTruncationConfig) {
    this.config = this.validateConfig(config);
    this.statistics = this.initializeStatistics();
  }

  // ========================================
  // Main Truncation Interface
  // ========================================

  /**
   * Truncate fields in data object
   */
  truncateFields(data: any, context?: TruncationContext | string): any {
    if (!this.config.enabled) {
      return data;
    }

    const truncationContext = typeof context === 'string' ? { operation: context } : (context || {});
    const stats = {
      totalProcessed: 0,
      totalTruncated: 0,
      totalReplaced: 0,
      totalHidden: 0,
      fieldStats: new Map<string, { processed: number; truncated: number; replaced: number; hidden: number }>(),
      averageSavings: 0
    };

    const result = this.truncateFieldsRecursive(data, '', stats, truncationContext);

    // Update statistics
    this.updateStatistics(stats);

    return result;
  }

  /**
   * Truncate a specific field by path
   */
  truncateFieldByPath(data: any, fieldPath: string, context?: TruncationContext): any {
    if (!this.config.enabled) {
      return data;
    }

    const pathParts = fieldPath.split('.');
    let current = data;
    let parent = data;
    let key = '';

    // Navigate to the field
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current || typeof current !== 'object') {
        return data;
      }
      parent = current;
      key = pathParts[i];
      current = current[key];
    }

    if (!current || typeof current !== 'object') {
      return data;
    }

    const finalKey = pathParts[pathParts.length - 1];
    if (!(finalKey in current)) {
      return data;
    }

    // Apply truncation to the specific field
    const fieldValue = current[finalKey];
    const truncatedValue = this.truncateValue(fieldValue, fieldPath, context || {});

    if (truncatedValue !== fieldValue) {
      current[finalKey] = truncatedValue;
    }

    return data;
  }

  /**
   * Get truncation statistics
   */
  getStatistics(): TruncationStatistics {
    return { ...this.statistics };
  }

  /**
   * Get truncation report
   */
  getReport(): TruncationReport {
    const totalProcessed = this.statistics.totalProcessed;
    const totalTruncated = this.statistics.totalTruncated;
    const totalReplaced = this.statistics.totalReplaced;
    const totalHidden = this.statistics.totalHidden;

    const fieldDetails = Array.from(this.statistics.fieldStats.entries()).map(([field, stats]) => ({
      field,
      processed: stats.processed,
      truncated: stats.truncated,
      replaced: stats.replaced,
      hidden: stats.hidden
    }));

    return {
      totalProcessed,
      totalTruncated,
      totalReplaced,
      totalHidden,
      savingsPercentage: totalProcessed > 0 ? ((totalTruncated + totalReplaced + totalHidden) / totalProcessed) * 100 : 0,
      fieldDetails
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.initializeStatistics();
  }

  // ========================================
  // Configuration Management
  // ========================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FieldTruncationConfig>): void {
    this.config = this.validateConfig({ ...this.config, ...newConfig });
  }

  /**
   * Get current configuration
   */
  getConfig(): FieldTruncationConfig {
    return { ...this.config };
  }

  /**
   * Add field truncation rule
   */
  addFieldRule(rule: FieldTruncationRule): void {
    if (!this.config.fields) {
      this.config.fields = [];
    }

    // Remove existing rule for the same field path
    this.config.fields = this.config.fields.filter(f => f.fieldPath !== rule.fieldPath);
    this.config.fields.push(rule);
  }

  /**
   * Remove field truncation rule
   */
  removeFieldRule(fieldPath: string): boolean {
    if (!this.config.fields) {
      return false;
    }

    const initialLength = this.config.fields.length;
    this.config.fields = this.config.fields.filter(f => f.fieldPath !== fieldPath);
    return this.config.fields.length < initialLength;
  }

  /**
   * Add path pattern rule
   */
  addPathPatternRule(rule: PathPatternRule): void {
    if (!this.config.pathPatterns) {
      this.config.pathPatterns = [];
    }

    // Remove existing rule for the same pattern
    this.config.pathPatterns = this.config.pathPatterns.filter(p => p.pattern !== rule.pattern);
    this.config.pathPatterns.push(rule);
  }

  /**
   * Remove path pattern rule
   */
  removePathPatternRule(pattern: string): boolean {
    if (!this.config.pathPatterns) {
      return false;
    }

    const initialLength = this.config.pathPatterns.length;
    this.config.pathPatterns = this.config.pathPatterns.filter(p => p.pattern !== pattern);
    return this.config.pathPatterns.length < initialLength;
  }

  // ========================================
  // Helper Methods
  // ========================================

  private validateConfig(config: FieldTruncationConfig): FieldTruncationConfig {
    return {
      enabled: config.enabled ?? false,
      defaultStrategy: config.defaultStrategy || 'truncate',
      defaultMaxLength: config.defaultMaxLength || 1000,
      defaultReplacementText: config.defaultReplacementText || '[...]',
      fields: config.fields || [],
      pathPatterns: config.pathPatterns || [],
      excludedFields: config.excludedFields || [],
      preserveStructure: config.preserveStructure ?? true,
      truncateArrays: config.truncateArrays ?? true,
      arrayTruncateLimit: config.arrayTruncateLimit || 100,
      recursiveTruncation: config.recursiveTruncation ?? true
    };
  }

  private initializeStatistics(): TruncationStatistics {
    return {
      totalProcessed: 0,
      totalTruncated: 0,
      totalReplaced: 0,
      totalHidden: 0,
      fieldStats: new Map(),
      averageSavings: 0
    };
  }

  private truncateFieldsRecursive(
    data: any,
    currentPath: string,
    stats: TruncationStatistics,
    context: TruncationContext
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    stats.totalProcessed++;

    // Handle primitive types
    if (typeof data !== 'object') {
      return this.truncateValue(data, currentPath, context);
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return this.truncateArray(data, currentPath, stats, context);
    }

    // Handle objects
    return this.truncateObject(data, currentPath, stats, context);
  }

  private truncateArray(
    array: any[],
    currentPath: string,
    stats: TruncationStatistics,
    context: TruncationContext
  ): any[] {
    if (!this.config.truncateArrays) {
      return array;
    }

    // Apply array length truncation
    let result = array;
    if (array.length > this.config.arrayTruncateLimit!) {
      const originalLength = array.length;
      result = array.slice(0, this.config.arrayTruncateLimit!);

      // Add truncation indicator
      if (this.config.preserveStructure) {
        result.push(`[Array truncated from ${originalLength} to ${result.length} elements]`);
      }

      this.updateFieldStats(currentPath, stats, 'truncated', 1);
      stats.totalTruncated++;
    }

    // Process array elements
    if (this.config.recursiveTruncation) {
      result = result.map((item, index) => {
        const elementPath = currentPath ? `${currentPath}.${index}` : String(index);
        return this.truncateFieldsRecursive(item, elementPath, stats, context);
      });
    }

    return result;
  }

  private truncateObject(
    obj: Record<string, any>,
    currentPath: string,
    stats: TruncationStatistics,
    context: TruncationContext
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;

      // Skip excluded fields
      if (this.isFieldExcluded(fieldPath)) {
        result[key] = value;
        continue;
      }

      // Check if field matches any specific rule
      const rule = this.findFieldRule(fieldPath);
      if (rule) {
        result[key] = this.applyFieldRule(value, fieldPath, rule, stats, context);
        continue;
      }

      // Check if field matches any path pattern
      const patternRule = this.findPathPatternRule(fieldPath);
      if (patternRule && this.shouldApplyPathPattern(fieldPath, value, patternRule)) {
        result[key] = this.applyPathPatternRule(value, fieldPath, patternRule, stats, context);
        continue;
      }

      // Apply default truncation
      result[key] = this.truncateFieldsRecursive(value, fieldPath, stats, context);
    }

    return result;
  }

  private truncateValue(value: any, fieldPath: string, context: TruncationContext): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Check if value needs truncation
    const maxLength = this.getFieldMaxLength(fieldPath);
    if (value.length <= maxLength) {
      return value;
    }

    const strategy = this.getFieldTruncationStrategy(fieldPath);
    const replacementText = this.getFieldReplacementText(fieldPath);

    switch (strategy) {
      case 'truncate':
        return value.substring(0, maxLength) + '...';
      case 'replace':
        return replacementText;
      case 'hide':
        return '[HIDDEN]';
      default:
        return value;
    }
  }

  private isFieldExcluded(fieldPath: string): boolean {
    return this.config.excludedFields?.includes(fieldPath) || false;
  }

  private findFieldRule(fieldPath: string): FieldTruncationRule | undefined {
    return this.config.fields?.find(rule => rule.fieldPath === fieldPath);
  }

  private findPathPatternRule(fieldPath: string): PathPatternRule | undefined {
    return this.config.pathPatterns?.find(rule => this.pathMatchesPattern(fieldPath, rule.pattern));
  }

  private shouldApplyPathPattern(fieldPath: string, value: any, rule: PathPatternRule): boolean {
    if (!rule.condition || rule.condition === 'always') {
      return true;
    }

    if (rule.condition === 'if_long' && typeof value === 'string') {
      return value.length > (rule.maxLength || this.config.defaultMaxLength!);
    }

    if (rule.condition === 'if_nested') {
      return fieldPath.split('.').length > 3; // Arbitrary nested threshold
    }

    return true;
  }

  private pathMatchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private applyFieldRule(
    value: any,
    fieldPath: string,
    rule: FieldTruncationRule,
    stats: TruncationStatistics,
    context: TruncationContext
  ): any {
    // Check condition if provided
    if (rule.condition && !rule.condition(value, context)) {
      return value;
    }

    const strategy = rule.strategy || this.config.defaultStrategy!;
    const maxLength = rule.maxLength || this.config.defaultMaxLength!;
    const replacementText = rule.replacementText || this.config.defaultReplacementText!;

    return this.applyTruncation(value, fieldPath, strategy, maxLength, replacementText, stats);
  }

  private applyPathPatternRule(
    value: any,
    fieldPath: string,
    rule: PathPatternRule,
    stats: TruncationStatistics,
    context: TruncationContext
  ): any {
    const strategy = rule.strategy || this.config.defaultStrategy!;
    const maxLength = rule.maxLength || this.config.defaultMaxLength!;
    const replacementText = rule.replacementText || this.config.defaultReplacementText!;

    return this.applyTruncation(value, fieldPath, strategy, maxLength, replacementText, stats);
  }

  private applyTruncation(
    value: any,
    fieldPath: string,
    strategy: 'truncate' | 'replace' | 'hide',
    maxLength: number,
    replacementText: string,
    stats: TruncationStatistics
  ): any {
    if (typeof value !== 'string') {
      return value;
    }

    if (value.length <= maxLength) {
      return value;
    }

    let result: string;
    let actionType: keyof TruncationStatistics;

    switch (strategy) {
      case 'truncate':
        result = value.substring(0, maxLength) + '...';
        actionType = 'totalTruncated';
        break;
      case 'replace':
        result = replacementText;
        actionType = 'totalReplaced';
        break;
      case 'hide':
        result = '[HIDDEN]';
        actionType = 'totalHidden';
        break;
      default:
        return value;
    }

    // Update statistics
    this.updateFieldStats(fieldPath, stats, actionType.replace('total', '').toLowerCase() as any, 1);
    stats[actionType]++;

    return result;
  }

  private getFieldMaxLength(fieldPath: string): number {
    const rule = this.findFieldRule(fieldPath);
    if (rule && rule.maxLength) {
      return rule.maxLength;
    }

    const patternRule = this.findPathPatternRule(fieldPath);
    if (patternRule && patternRule.maxLength) {
      return patternRule.maxLength;
    }

    return this.config.defaultMaxLength!;
  }

  private getFieldTruncationStrategy(fieldPath: string): 'truncate' | 'replace' | 'hide' {
    const rule = this.findFieldRule(fieldPath);
    if (rule && rule.strategy) {
      return rule.strategy;
    }

    const patternRule = this.findPathPatternRule(fieldPath);
    if (patternRule && patternRule.strategy) {
      return patternRule.strategy;
    }

    return this.config.defaultStrategy!;
  }

  private getFieldReplacementText(fieldPath: string): string {
    const rule = this.findFieldRule(fieldPath);
    if (rule && rule.replacementText) {
      return rule.replacementText;
    }

    const patternRule = this.findPathPatternRule(fieldPath);
    if (patternRule && patternRule.replacementText) {
      return patternRule.replacementText;
    }

    return this.config.defaultReplacementText!;
  }

  private updateFieldStats(
    fieldPath: string,
    stats: TruncationStatistics,
    actionType: 'truncated' | 'replaced' | 'hidden',
    count: number
  ): void {
    if (!stats.fieldStats.has(fieldPath)) {
      stats.fieldStats.set(fieldPath, {
        processed: 0,
        truncated: 0,
        replaced: 0,
        hidden: 0
      });
    }

    const fieldStats = stats.fieldStats.get(fieldPath)!;
    fieldStats[actionType] += count;
  }

  private updateStatistics(stats: TruncationStatistics): void {
    this.statistics.totalProcessed += stats.totalProcessed;
    this.statistics.totalTruncated += stats.totalTruncated;
    this.statistics.totalReplaced += stats.totalReplaced;
    this.statistics.totalHidden += stats.totalHidden;

    // Merge field statistics
    for (const [field, fieldStats] of stats.fieldStats.entries()) {
      if (!this.statistics.fieldStats.has(field)) {
        this.statistics.fieldStats.set(field, { ...fieldStats });
      } else {
        const existing = this.statistics.fieldStats.get(field)!;
        existing.processed += fieldStats.processed;
        existing.truncated += fieldStats.truncated;
        existing.replaced += fieldStats.replaced;
        existing.hidden += fieldStats.hidden;
      }
    }

    // Update average savings
    const totalActions = this.statistics.totalTruncated + this.statistics.totalReplaced + this.statistics.totalHidden;
    this.statistics.averageSavings = totalActions > 0 ?
      (this.statistics.totalTruncated + this.statistics.totalReplaced + this.statistics.totalHidden) / this.statistics.totalProcessed : 0;
  }
}
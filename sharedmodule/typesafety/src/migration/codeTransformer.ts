import { z } from 'zod';

/**
 * 代码转换错误
 */
export class CodeTransformError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'CodeTransformError';
  }
}

/**
 * 转换规则
 */
export interface TransformRule {
  /**
   * 规则名称
   */
  name: string;

  /**
   * 搜索模式
   */
  pattern: RegExp | string;

  /**
   * 替换模式
   */
  replacement: string | ((match: string, ...groups: string[]) => string);

  /**
   * 描述
   */
  description?: string;

  /**
   * 优先级 (数字越小优先级越高)
   */
  priority?: number;

  /**
   * 适用文件类型
   */
  fileTypes?: string[];

  /**
   * 是否只匹配一次
   */
  once?: boolean;

  /**
   * 自定义验证函数
   */
  validator?: (match: string, groups: string[]) => boolean;
}

/**
 * 转换选项
 */
export interface TransformOptions {
  /**
   * 文件编码
   */
  encoding?: BufferEncoding;

  /**
   * 是否递归处理目录
   */
  recursive?: boolean;

  /**
   * 要处理的文件类型
   */
  fileTypes?: string[];

  /**
   * 排除的文件/目录模式
   */
  excludePatterns?: RegExp[];

  /**
   * 是否创建备份
   */
  createBackup?: boolean;

  /**
   * 是否保留原始文件
   */
  preserveOriginal?: boolean;

  /**
   * 并行处理的最大文件数
   */
  concurrency?: number;

  /**
   * 输出目录 (如果为null则覆盖原文件)
   */
  outputDir?: string | null;

  /**
   * 是否启用日志
   */
  verbose?: boolean;
}

/**
 * 转换结果
 */
export interface TransformResult {
  /**
   * 原始文件路径
   */
  originalPath: string;

  /**
   * 转换后的文件路径
   */
  outputPath?: string;

  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 错误信息
   */
  error?: CodeTransformError;

  /**
   * 应用的规则
   */
  appliedRules: string[];

  /**
   * 更改统计
   */
  changes: {
    additions: number;
    deletions: number;
    modifications: number;
  };

  /**
   * 转换耗时
   */
  duration: number;

  /**
   * 处理的行数
   */
  linesProcessed: number;
}

/**
 * 代码转换器 - JavaScript 到 TypeScript
 */
export class JS2TSTransformer {
  private rules: TransformRule[];
  private static readonly DEFAULT_RULES: TransformRule[] = [
    {
      name: 'require-to-import',
      pattern: /const\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\);?/g,
      replacement: 'import $1 from \'$2\';',
      description: 'Convert CommonJS require to ES6 import',
      priority: 1,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'module.exports-to-export',
      pattern: /module\.exports\s*=\s*([^;]+);?/g,
      replacement: 'export default $1;',
      description: 'Convert module.exports to export default',
      priority: 1,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'exports.property-to-export',
      pattern: /exports\.(\w+)\s*=\s*([^;]+);?/g,
      replacement: 'export const $1 = $2;',
      description: 'Convert exports.property to export const',
      priority: 2,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'function-to-arrow',
      pattern: /function\s*\(([^)]*)\)\s*\{([^}]+)\}/g,
      replacement: (match, params, body) => {
        // 简化的箭头函数转换 - 需要更复杂的逻辑处理所有情况
        if (!body.includes('return')) {
          return `(${params}) => {${body}}`;
        }
        const returnMatch = body.match(/return\s+([^;]+);?/);
        if (returnMatch && body.trim().split('\n').length === 1) {
          return `(${params}) => ${returnMatch[1]}`;
        }
        return `(${params}) => {${body}}`;
      },
      description: 'Convert simple functions to arrow functions',
      priority: 10,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'add-types-json-parse',
      pattern: /JSON\.parse\s*\(([^)]+)\)/g,
      replacement: '(JSON.parse($1) as any)',
      description: 'Add type assertion to JSON.parse calls',
      priority: 5,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'add-types-fs-read',
      pattern: /fs\.readFileSync\s*\(([^)]+)\)/g,
      replacement: '(fs.readFileSync($1) as string)',
      description: 'Add type assertion to fs.readFileSync',
      priority: 5,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'object-type-assertions',
      pattern: /(\w+)\s*=\s*\{([^}]+)\}(?!\s*as\s+[^;]*;)/g,
      replacement: (match, varName, objectContent) => {
        // 对于复杂的对象类型推导，添加 any 类型断言
        if (objectContent.includes(':')) {
          // 看起来已经像 TypeScript 对象了
          return match;
        }
        return `${varName} = {${objectContent}} as any;`;
      },
      description: 'Add type assertions to object literals',
      priority: 20,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'array-type-assertions',
      pattern: /(\w+)\s*=\s*\[([^\]]+)\](?!\s*as\s+[^;]*;)/g,
      replacement: '$1 = [$2] as any[];',
      description: 'Add type assertions to array literals',
      priority: 20,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'error-types',
      pattern: /catch\s*\((\w+)\)/g,
      replacement: 'catch ($1: any)',
      description: 'Add type annotations to catch blocks',
      priority: 5,
      fileTypes: ['.js', '.mjs']
    },
    {
      name: 'process-env-types',
      pattern: /process\.env\.(\w+)/g,
      replacement: '(process.env.$1 as string)',
      description: 'Add type assertion to process.env access',
      priority: 3,
      fileTypes: ['.js', '.mjs']
    }
  ];

  constructor() {
    this.rules = [...JS2TSTransformer.DEFAULT_RULES];
  }

  /**
   * 添加转换规则
   */
  addRule(rule: TransformRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }

  /**
   * 移除转换规则
   */
  removeRule(ruleName: string): boolean {
    const index = this.rules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 转换单个文件
   */
  async transformFile(
    filePath: string,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    const startTime = Date.now();
    const mergedOptions = {
      encoding: 'utf-8' as BufferEncoding,
      createBackup: true,
      preserveOriginal: true,
      verbose: false,
      ...options
    };

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 读取文件内容
      const content = await fs.readFile(filePath, mergedOptions.encoding);
      const lines = content.split('\n');

      // 应用转换规则
      let transformedContent = content;
      const appliedRules: string[] = [];
      const changes = { additions: 0, deletions: 0, modifications: 0 };

      // 按优先级应用规则
      for (const rule of this.rules) {
        if (this.shouldApplyRule(rule, filePath)) {
          const oldContent = transformedContent;
          transformedContent = this.applyRule(transformedContent, rule, changes);

          if (oldContent !== transformedContent) {
            appliedRules.push(rule.name);
          }

          if (rule.once && appliedRules.includes(rule.name)) {
            break; // 如果规则只应用一次，则跳过后续相同规则
          }
        }
      }

      // 写入转换后的内容
      const outputPath = await this.getOutputPath(filePath, mergedOptions, '.ts');

      if (mergedOptions.createBackup && mergedOptions.preserveOriginal) {
        const backupPath = filePath + '.backup';
        await fs.writeFile(backupPath, content);
      }

      await fs.writeFile(outputPath, transformedContent);

      if (mergedOptions.verbose) {
        console.log(`Transformed ${filePath} -> ${outputPath}`);
        console.log(`Applied rules: ${appliedRules.join(', ')}`);
        console.log(`Changes: +${changes.additions} -${changes.deletions} ~${changes.modifications}`);
      }

      return {
        originalPath: filePath,
        outputPath,
        success: true,
        appliedRules,
        changes,
        duration: Date.now() - startTime,
        linesProcessed: lines.length
      };

    } catch (error) {
      const transformError = new CodeTransformError(
        `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );

      return {
        originalPath: filePath,
        success: false,
        error: transformError,
        appliedRules: [],
        changes: { additions: 0, deletions: 0, modifications: 0 },
        duration: Date.now() - startTime,
        linesProcessed: 0
      };
    }
  }

  /**
   * 批量转换文件
   */
  async transformBatch(
    filePaths: string[],
    options: TransformOptions = {}
  ): Promise<TransformResult[]> {
    const concurrency = options.concurrency || 5;
    const results: TransformResult[] = [];

    // 分批处理文件
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(path => this.transformFile(path, options))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            originalPath: batch[j],
            success: false,
            error: new CodeTransformError(
              `Batch transform failed: ${result.reason}`,
              batch[j]
            ),
            appliedRules: [],
            changes: { additions: 0, deletions: 0, modifications: 0 },
            duration: 0,
            linesProcessed: 0
          });
        }
      }
    }

    return results;
  }

  /**
   * 转换目录
   */
  async transformDirectory(
    directoryPath: string,
    options: TransformOptions = {}
  ): Promise<TransformResult[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 获取目录中的所有文件
      const files = await this.getDirectoryFiles(directoryPath, options);

      // 过滤出需要转换的文件
      const targetFiles = files.filter(filePath =>
        this.shouldTransformFile(filePath, options)
      );

      if (options.verbose) {
        console.log(`Found ${targetFiles.length} files to transform in ${directoryPath}`);
      }

      // 批量转换
      return await this.transformBatch(targetFiles, options);

    } catch (error) {
      throw new CodeTransformError(
        `Directory transform failed: ${error instanceof Error ? error.message : String(error)}`,
        directoryPath
      );
    }
  }

  /**
   * 生成类型声明
   */
  async generateTypeDefinitions(
    filePath: string,
    options: {
      outputPath?: string;
      useAny?: boolean;
      strict?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const content = await fs.readFile(filePath, 'utf-8');

      // 简化的类型声明生成 - 实际应用中需要更复杂的AST分析
      const typeDefinitions = this.extractTypeDefinitions(content, options);

      const outputPath = options.outputPath || filePath.replace(/\.(js|mjs)$/, '.d.ts');
      await fs.writeFile(outputPath, typeDefinitions);

      return outputPath;
    } catch (error) {
      throw new CodeTransformError(
        `Type definition generation failed: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  // ===== 私有工具方法 =====

  private shouldApplyRule(rule: TransformRule, filePath: string): boolean {
    // 检查文件类型
    if (rule.fileTypes && rule.fileTypes.length > 0) {
      const extension = filePath.substring(filePath.lastIndexOf('.'));
      if (!rule.fileTypes.includes(extension)) {
        return false;
      }
    }

    return true;
  }

  private applyRule(content: string, rule: TransformRule, changes: {
    additions: number;
    deletions: number;
    modifications: number;
  }): string {
    const originalContent = content;
    let transformedContent = content;

    // 应用替换
    if (typeof rule.replacement === 'string') {
      transformedContent = content.replace(rule.pattern as RegExp, rule.replacement);
    } else {
      transformedContent = content.replace(rule.pattern as RegExp, rule.replacement);
    }

    // 统计更改
    if (transformedContent !== originalContent) {
      changes.modifications++;
      // 简化的行数统计 - 实际应用中需要更精确的计算
      const originalLines = originalContent.split('\n').length;
      const transformedLines = transformedContent.split('\n').length;
      const lineDiff = transformedLines - originalLines;

      if (lineDiff > 0) {
        changes.additions += lineDiff;
      } else if (lineDiff < 0) {
        changes.deletions += Math.abs(lineDiff);
      }
    }

    return transformedContent;
  }

  private async getOutputPath(originalPath: string, options: TransformOptions, newExtension: string): Promise<string> {
    if (options.outputDir) {
      const path = await import('path');
      const fileName = path.basename(originalPath);
      const newFileName = fileName.replace(/\.(js|mjs)$/, newExtension);
      return path.join(options.outputDir, newFileName);
    }

    if (options.preserveOriginal) {
      return originalPath.replace(/\.(js|mjs)$/, newExtension);
    }

    return originalPath;
  }

  private async getDirectoryFiles(directoryPath: string, options: TransformOptions): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files: string[] = [];

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          if (options.recursive) {
            const subFiles = await this.getDirectoryFiles(fullPath, options);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(`Warning: Could not read directory ${directoryPath}:`, error);
      }
    }

    return files;
  }

  private shouldTransformFile(filePath: string, options: TransformOptions): boolean {
    // 检查文件类型
    if (options.fileTypes && options.fileTypes.length > 0) {
      const extension = filePath.substring(filePath.lastIndexOf('.'));
      if (!options.fileTypes.includes(extension)) {
        return false;
      }
    }

    // 检查排除模式
    if (options.excludePatterns) {
      for (const pattern of options.excludePatterns) {
        if (pattern.test(filePath)) {
          return false;
        }
      }
    }

    // 检查是否需要转换
    return filePath.endsWith('.js') || filePath.endsWith('.mjs');
  }

  private extractTypeDefinitions(content: string, options: { useAny?: boolean; strict?: boolean }): string {
    // 简化的类型声明提取 - 实际实现需要 AST 分析
    const lines = content.split('\n');
    const typeDefinitions: string[] = [];

    // 添加基本类型声明
    typeDefinitions.push('// Auto-generated type definitions');
    typeDefinitions.push('// TODO: Add proper type definitions instead of using any');
    typeDefinitions.push('');

    if (options.useAny !== false) {
      typeDefinitions.push('declare namespace AutoGenerated {');
      typeDefinitions.push('  type AnyObject = any;');
      typeDefinitions.push('  type AnyFunction = (...args: any[]) => any;');
      typeDefinitions.push('  type AnyArray = any[];');
      typeDefinitions.push('}');
      typeDefinitions.push('');
    }

    // 查找可能的导出项
    const exports = this.findExports(content);
    exports.forEach(exp => {
      if (options.useAny !== false) {
        typeDefinitions.push(`export const ${exp.name}: any;`);
      } else {
        typeDefinitions.push(`export const ${exp.name}: unknown;`);
      }
    });

    return typeDefinitions.join('\n');
  }

  private findExports(content: string): Array<{ name: string; type: 'const' | 'function' | 'class' }> {
    const exports: Array<{ name: string; type: 'const' | 'function' | 'class' }> = [];

    // 查找 module.exports
    const moduleExportsMatches = content.match(/module\.exports\s*=\s*\{([^}]+)\}/g);
    if (moduleExportsMatches) {
      moduleExportsMatches.forEach(match => {
        const properties = match.match(/(\w+):/g);
        if (properties) {
          properties.forEach(prop => {
            const name = prop.replace(':', '').trim();
            exports.push({ name, type: 'const' });
          });
        }
      });
    }

    // 查找 exports.property
    const exportsPropMatches = content.match(/exports\.(\w+)/g);
    if (exportsPropMatches) {
      exportsPropMatches.forEach(match => {
        const name = match.replace('exports.', '');
        exports.push({ name, type: 'const' });
      });
    }

    return exports;
  }
}

/**
 * JSON.parse 迁移助手
 */
export class JSONParseMigrator {
  private static readonly PATTERNS = {
    PARSE_WITH_TYPECAST: /JSON\.parse\s*\(\s*([^)]+)\s*\)\s+as\s+(\[?[a-zA-Z_$][a-zA-Z0-9_$]*\]?)/g,
    PARSE_STANDALONE: /JSON\.parse\s*\(\s*([^)]+)\s*\)(?!\s*as\s+)(?!\s*[;,])/g,
    REQUIRE_JSON: /require\s*\(\s*['"]([^'"]+\.json)['"]\s*\)/g,
    READ_JSON_FILE: /fs\.readFileSync\s*\(\s*[^)]+\.json[^)]*\)[^;]*JSON\.parse/g
  };

  /**
   * 迁移 JSON.parse 调用
   */
  static migrateJSONParseCalls(content: string, options: {
    addTypeAssertions?: boolean;
    defaultType?: string;
    fileTypes?: string[];
  } = {}): {
    content: string;
    migrations: Array<{
      line: number;
      original: string;
      migrated: string;
      type?: string;
    }>;
  } {
    const migrations: Array<{
      line: number;
      original: string;
      migrated: string;
      type?: string;
    }> = [];

    let result = content;

    // 查找并记录所有 JSON.parse 调用
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // 检查已有类型断言的情况
      const typecastMatches = Array.from(line.matchAll(this.PATTERNS.PARSE_WITH_TYPECAST));
      typecastMatches.forEach(match => {
        migrations.push({
          line: index + 1,
          original: match[0],
          migrated: match[0], // 已有类型断言，无需修改
          type: match[2]
        });
      });

      // 检查需要添加类型断言的情况
      const parseMatches = Array.from(line.matchAll(this.PATTERNS.PARSE_STANDALONE));
      parseMatches.forEach(match => {
        const original = match[0];
        const migrated = options.addTypeAssertions !== false
          ? `${match[0]} as ${options.defaultType || 'any'}`
          : match[0];

        result = result.replace(original, migrated);

        migrations.push({
          line: index + 1,
          original,
          migrated,
          type: options.defaultType || 'any'
        });
      });
    });

    return { content: result, migrations };
  }

  /**
   * 生成类型安全的 JSON 实用函数
   */
  static generateJSONUtils(options: {
    includeValidation?: boolean;
    zodSchemas?: string[];
  }): string {
    const utils = [];

    utils.push('import { z } from "zod";');
    utils.push('import { SafeJSON } from "./safeJson";');
    utils.push('');

    if (options.includeValidation !== false) {
      utils.push('/**');
      utils.push(' * 安全的 JSON 解析函数');
      utils.push(' */');
      utils.push('export function safeParseJSON<T>(text: string, schema: z.ZodType<T>): T {');
      utils.push('  return SafeJSON.parseAndValidate(text, schema);');
      utils.push('}');
      utils.push('');

      utils.push('/**');
      utils.push(' * 从文件安全解析 JSON');
      utils.push(' */');
      utils.push('export async function safeParseJSONFile<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {');
      utils.push('  return SafeJSON.parseAndValidateFromFile(filePath, schema);');
      utils.push('}');
      utils.push('');
    }

    utils.push('/**');
    utils.push(' * 带默认值的 JSON 解析');
    utils.push(' */');
    utils.push('export function parseJSONWithDefault<T>(text: string, defaultValue: T): T | T {');
    utils.push('  try {');
    utils.push('    return SafeJSON.parse(text);');
    utils.push('  } catch {');
    utils.push('    return defaultValue;');
    utils.push('  }');
    utils.push('}');

    return utils.join('\n');
  }
}

/**
 * 类型声明生成器
 */
export class TypeDeclarationGenerator {
  /**
   * 为配置对象生成类型声明
   */
  static generateConfigTypes(config: Record<string, any>, options: {
    interfaceName?: string;
    useEnums?: boolean;
    strict?: boolean;
  } = {}): string {
    const { interfaceName = 'Config', useEnums = true, strict = true } = options;

    const lines = [];
    lines.push('/**');
    lines.push(` * Auto-generated config interface`);
    lines.push(' */');
    lines.push(`export interface ${interfaceName} {`);

    for (const [key, value] of Object.entries(config)) {
      const type = this.inferType(value);
      const optional = strict && (value === undefined || value === null) ? '?' : '';

      if (useEnums && Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')) {
        // 生成枚举类型
        const enumName = `${key.charAt(0).toUpperCase() + key.slice(1)}Type`;
        lines.push(`  ${key}${optional}: ${enumName};`);
      } else {
        lines.push(`  ${key}${optional}: ${type};`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  private static inferType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      const itemType = this.inferType(value[0]);
      return `${itemType}[]`;
    }
    if (typeof value === 'object') return '{ [key: string]: any }';
    return typeof value;
  }
}
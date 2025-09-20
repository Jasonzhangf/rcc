import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  SafeJSON,
  JSONParseError,
  SafeEnv,
  EnvAccessError,
  SafeDynamicImport,
  DynamicImportError,
  createTypeSafeEnvironment
} from '../src/index.js';
import { packageJsonSchema, rccConfigSchema } from '../src/schemas/index.js';

describe('SafeJSON 测试', () => {
  it('应该成功解析有效 JSON', () => {
    const jsonString = '{"name": "test", "version": "1.0.0"}';
    const result = SafeJSON.parse(jsonString);

    expect(result).toEqual({ name: 'test', version: '1.0.0' });
  });

  it('应该在无效 JSON 时抛出错误', () => {
    const invalidJson = '{"name": "test"}';

    expect(() => SafeJSON.parse(invalidJson + 'invalid')).toThrow(JSONParseError);
  });

  it('应该处理带有注释的 JSON', () => {
    const jsonWithComments = `{
      // 单行注释
      "name": "test",
      /* 多行注释 */
      "version": "1.0.0"
    }`;

    const result = SafeJSON.parse(jsonWithComments, { allowComments: true });
    expect(result).toEqual({ name: 'test', version: '1.0.0' });
  });

  it('应该验证 Schema', () => {
    const validPackageJson = JSON.stringify({
      name: 'test-package',
      version: '1.0.0'
    });

    const result = SafeJSON.parseAndValidate(validPackageJson, packageJsonSchema);
    expect(result.name).toBe('test-package');
    expect(result.version).toBe('1.0.0');
  });

  it('应该拒绝无效 Schema', () => {
    const invalidPackageJson = JSON.stringify({
      name: '',  // 空名称应该无效
      version: 'invalid-version'
    });

    expect(() => SafeJSON.parseAndValidate(invalidPackageJson, packageJsonSchema))
      .toThrow();
  });

  it('应该检测循环引用', () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;

    expect(() => SafeJSON.stringify(circularObj)).toThrow();
  });

  it('应该执行深度限制检查', () => {
    const deepObj = createDeepObject(150); // 超过默认深度限制

    expect(() => SafeJSON.parse(JSON.stringify(deepObj)))
      .toThrow(/depth exceeds limit/);
  });
});

describe('SafeEnv 测试', () => {
  let safeEnv: SafeEnv;

  beforeEach(() => {
    safeEnv = new SafeEnv('TEST_');
    // 设置测试环境变量
    process.env.TEST_STRING_VAR = 'test-value';
    process.env.TEST_NUMBER_VAR = '123';
    process.env.TEST_BOOLEAN_VAR = 'true';
    process.env.TEST_JSON_VAR = '{"key": "value"}';
  });

  afterEach(() => {
    // 清理测试环境变量
    delete process.env.TEST_STRING_VAR;
    delete process.env.TEST_NUMBER_VAR;
    delete process.env.TEST_BOOLEAN_VAR;
    delete process.env.TEST_JSON_VAR;
  });

  it('应该获取字符串环境变量', () => {
    const value = safeEnv.getString('TEST_STRING_VAR');
    expect(value).toBe('test-value');
  });

  it('应该获取数字环境变量', () => {
    const value = safeEnv.getNumber('TEST_NUMBER_VAR');
    expect(value).toBe(123);
  });

  it('应该在无效数字时抛出错误', () => {
    process.env.TEST_INVALID_NUMBER = 'not-a-number';

    expect(() => safeEnv.getNumber('TEST_INVALID_NUMBER'))
      .toThrow(EnvAccessError);

    delete process.env.TEST_INVALID_NUMBER;
  });

  it('应该获取布尔环境变量', () => {
    expect(safeEnv.getBoolean('TEST_BOOLEAN_VAR')).toBe(true);

    process.env.TEST_BOOLEAN_FALSE = 'false';
    expect(safeEnv.getBoolean('TEST_BOOLEAN_FALSE')).toBe(false);
    delete process.env.TEST_BOOLEAN_FALSE;
  });

  it('应该获取 JSON 环境变量', () => {
    const value = safeEnv.getJSON<Record<string, string>>('TEST_JSON_VAR');
    expect(value).toEqual({ key: 'value' });
  });

  it('应该获取枚举环境变量', () => {
    process.env.TEST_ENUM_VAR = 'option1';

    const value = safeEnv.getEnum('TEST_ENUM_VAR', ['option1', 'option2']);
    expect(value).toBe('option1');

    expect(() => safeEnv.getEnum('TEST_ENUM_VAR', ['option2', 'option3']))
      .toThrow(EnvAccessError);

    delete process.env.TEST_ENUM_VAR;
  });

  it('应该处理默认值', () => {
    const value = safeEnv.get('NON_EXISTENT_VAR', { default: 'default-value' });
    expect(value).toBe('default-value');
  });

  it('应该验证必需的环境变量', () => {
    const result = safeEnv.validateRequired(['TEST_STRING_VAR', 'NON_EXISTENT']);

    expect(result.valid).toEqual(['TEST_STRING_VAR']);
    expect(result.missing).toEqual(['NON_EXISTENT']);
    expect(result.invalid).toEqual([]);
  });

  it('应该记录访问日志', () => {
    safeEnv.get('TEST_STRING_VAR');
    safeEnv.get('TEST_NUMBER_VAR');

    const log = safeEnv.getAccessLog();
    expect(log).toHaveLength(2);
    expect(log[0].varName).toBe('TEST_STRING_VAR');
    expect(log[1].varName).toBe('TEST_NUMBER_VAR');
  });

  it('应该提供访问统计', () => {
    safeEnv.get('TEST_STRING_VAR');
    safeEnv.get('NON_EXISTENT');
    safeEnv.get('TEST_NUMBER_VAR');

    const stats = safeEnv.getAccessStats();
    expect(stats.totalAccesses).toBe(3);
    expect(stats.missingVariables).toBe(1);
  });
});

describe('SafeDynamicImport 测试', () => {
  let safeImport: SafeDynamicImport;

  beforeEach(() => {
    safeImport = SafeDynamicImport.getInstance();
  });

  it('应该成功导入有效模块', async () => {
    // 注意：这是在测试中，所以需要导入一个已存在的模块
    const result = await safeImport.import('fs', {
      pathValidation: 'none'  // fs 是内置模块，跳过路径验证
    });

    expect(result).toBeDefined();
    expect(typeof result.readFile).toBe('function');
  });

  it('应该在无效路径时失败', async () => {
    await expect(
      safeImport.import('/invalid/path/to/module.js')
    ).rejects.toThrow(DynamicImportError);
  });

  it('应该验证必需导出', async () => {
    await expect(
      safeImport.import('./test-module.js', {
        requiredExports: ['nonExistentExport']
      })
    ).rejects.toThrow();
  });

  it('应该执行安全检查', async () => {
    const result = await safeImport.validateModule('./test-module.js', {
      securityLevel: 'high'
    });

    // 由于测试模块不存在，验证应该失败
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该批量导入模块', async () => {
    const modules = await safeImport.importBatch({
      fs: 'fs',
      path: 'path'
    }, {
      pathValidation: 'none'
    });

    expect(modules.fs).toBeDefined();
    expect(modules.path).toBeDefined();
  });

  it('应该提供导入统计', async () => {
    await safeImport.import('path', { pathValidation: 'none' });

    const stats = safeImport.getImportStats();
    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });
});

describe('完整类型安全环境测试', () => {
  it('应该创建完整的类型安全环境', () => {
    const env = createTypeSafeEnvironment('TEST2_');

    expect(env.safeJson).toBeDefined();
    expect(env.safeEnv).toBeDefined();
    expect(env.safeDynamicImport).toBeDefined();
    expect(env.validatePackageJson).toBeDefined();
    expect(env.validateRCCConfig).toBeDefined();
  });

  it('应该验证 Package.json', () => {
    const env = createTypeSafeEnvironment();

    const validPackageJson = JSON.stringify({
      name: 'test-package',
      version: '1.0.0'
    });

    const result = env.validatePackageJson(validPackageJson);
    expect(result.name).toBe('test-package');
    expect(result.version).toBe('1.0.0');
  });

  it('应该验证 RCC 配置', () => {
    const env = createTypeSafeEnvironment();

    const validConfig = JSON.stringify({
      virtualModels: {
        'model-1': {
          id: 'model-1',
          name: 'Model One',
          enabled: true,
          model: 'gpt-3.5-turbo',
          targets: []
        }
      }
    });

    const result = env.validateRCCConfig(validConfig);
    expect(result.virtualModels).toBeDefined();
    expect(result.virtualModels['model-1']).toBeDefined();
  });
});

// 辅助函数
function createDeepObject(depth: number): any {
  if (depth <= 0) return 'leaf';
  return {
    nested: createDeepObject(depth - 1)
  };
}

// 实际迁移示例测试
describe('迁移示例测试', () => {
  it('应该迁移 JSON.parse 调用', async () => {
    const { JSONParseMigrator } = await import('../src/index.js');

    const jsCode = `
      const config = JSON.parse(fs.readFileSync('./config.json'));
      const data = JSON.parse(response.body);
    `;

    const result = JSONParseMigrator.migrateJSONParseCalls(jsCode, {
      addTypeAssertions: true,
      defaultType: 'any'
    });

    expect(result.content).toContain('JSON.parse(fs.readFileSync(\'./config.json\')) as any');
    expect(result.content).toContain('JSON.parse(response.body) as any');
    expect(result.migrations).toHaveLength(2);
  });

  it('应该生成 JSON 工具函数', async () => {
    const { JSONParseMigrator } = await import('../src/index.js');

    const utils = JSONParseMigrator.generateJSONUtils({
      includeValidation: true,
      zodSchemas: ['PackageJson', 'RCCConfig']
    });

    expect(utils).toContain('import { z } from "zod"');
    expect(utils).toContain('SafeJSON.parseAndValidate');
    expect(utils).toContain('safeParseJSON');
    expect(utils).toContain('safeParseJSONFile');
  });
});
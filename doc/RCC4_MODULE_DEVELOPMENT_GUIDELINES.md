# Claude Code RCC4模块开发和管理规则指引

## 📋 模块开发标准

### 1. 基础模块规范 (遵循BaseModule标准)

所有RCC模块必须继承BaseModule并遵循以下规范：

#### 类定义结构
```typescript
import { BaseModule } from '../../core/BaseModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

export class YourModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  // 必需的生命周期方法
  public async initialize(config: any): Promise<void> {
    // 初始化逻辑
  }
  
  public async destroy(): Promise<void> {
    // 清理逻辑
  }
  
  public async handshake(moduleInfo: any, connectionInfo: any): Promise<void> {
    // 握手逻辑
  }
  
  // 必需的属性
  public getModuleInfo() {
    return this.moduleInfo;
  }
  
  public get moduleConfig() {
    return this.config;
  }
  
  // 模块特定方法
  public async yourMethod(input: string): Promise<any> {
    // 方法实现
  }
}
```

#### 必需的文件结构
```
src/modules/YourModule/
├── src/
│   ├── YourModule.ts          # 主模块类
│   ├── index.ts               # 模块入口点
│   └── utils/                 # 可选的工具函数
├── __test__/
│   ├── YourModule.test.ts     # 单元测试
│   └── YourModule.e2e.test.ts # 端到端测试
├── constants/
│   └── YourModule.constants.ts # 模块常量
├── interfaces/
│   └── IYourModule.interface.ts # 模块接口
├── types/
│   └── YourModule.types.ts    # 模块类型定义
└── README.md                  # 模块文档
```

### 2. API注册表标准

每个模块都必须在 `.claude/module-api-registry.json` 中注册其API。

#### 注册表结构
```json
{
  "module_apis": {
    "YourModule": {
      "module": {
        "name": "YourModule",
        "description": "简短的模块描述",
        "version": "1.0.0",
        "basePath": "/api/yourmodule"
      },
      "endpoints": [
        {
          "name": "methodName",
          "description": "方法功能描述",
          "method": "GET|POST|PUT|DELETE",
          "path": "/methodpath",
          "parameters": [
            {
              "name": "paramName",
              "type": "string|number|boolean|object",
              "description": "参数描述",
              "required": true
            }
          ],
          "returnType": "Promise<any>",
          "access": "public|private"
        }
      ]
    }
  }
}
```

## ➕ 创建新模块

### 使用模块模板
```bash
# 1. 使用模块创建脚本（如果可用）
./scripts/create-module.sh YourModuleName

# 2. 或者手动创建目录结构
mkdir -p src/modules/YourModuleName/{src,__test__,constants,interfaces,types}
```

### 实现步骤
1. **创建主模块类** (`src/YourModule.ts`)
2. **继承BaseModule并实现必需方法**
3. **创建测试文件** (`__test__/YourModule.test.ts`)
4. **编写README文档**
5. **在API注册表中注册模块**

### API注册表示例
```json
{
  "module_apis": {
    "YourModuleName": {
      "module": {
        "name": "YourModuleName",
        "description": "Your module description",
        "version": "1.0.0",
        "basePath": "/api/yourmodulename"
      },
      "endpoints": []
    }
  }
}
```

### 验证创建
```bash
# 运行完整扫描确保没有违规
./.claude/scripts/project-scanner.sh --module YourModuleName --full-scan

# 验证API注册表
npm run validate:api-registry
```

## 🔧 更新现有模块

### 添加新方法的完整流程

#### 1. 实现新方法
```typescript
// 在模块类中添加新方法
public async newMethod(input: string): Promise<string> {
  // 方法实现
  return `Processed: ${input}`;
}
```

#### 2. 添加API注册表条目
```json
{
  "name": "newMethod",
  "description": "处理输入字符串并返回结果",
  "method": "POST",
  "path": "/newmethod",
  "parameters": [
    {
      "name": "input",
      "type": "string",
      "description": "要处理的输入字符串",
      "required": true
    }
  ],
  "returnType": "Promise<string>",
  "access": "public"
}
```

#### 3. 添加测试
```typescript
// 在测试文件中添加测试用例
describe('newMethod', () => {
  it('should process input string correctly', async () => {
    const result = await module.newMethod('test');
    expect(result).toBe('Processed: test');
  });
});
```

#### 4. 更新文档
在README.md中添加API文档部分。

#### 5. 验证更新
```bash
# 扫描确保更新符合标准
./.claude/scripts/project-scanner.sh --module YourModule --check api

# 验证API注册表一致性
npm run validate:api-registry
```

## 🗑️ 删除模块

### 完整删除流程

#### 1. 备份重要数据（如果需要）
```bash
# 备份模块配置和数据
cp -r src/modules/YourModule ~/backup/
```

#### 2. 移除模块实现
```bash
# 删除模块目录
rm -rf src/modules/YourModule
```

#### 3. 从API注册表中移除
从 `.claude/module-api-registry.json` 中删除对应的模块条目。

#### 4. 检查依赖
```bash
# 检查是否有其他模块依赖这个模块
grep -r "YourModule" src/
```

#### 5. 更新引用
移除所有对已删除模块的引用。

#### 6. 验证删除
```bash
# 完整扫描确保系统完整性
./.claude/scripts/project-scanner.sh --full-scan

# 验证API注册表
npm run validate:api-registry
```

## 🔍 项目扫描机制集成

### 自动验证规则

1. **创建时验证**:
   - 模块结构完整性
   - BaseModule继承正确性
   - API注册表条目存在性

2. **更新时验证**:
   - 方法签名一致性
   - API注册表同步性
   - 测试覆盖完整性

3. **删除时验证**:
   - 依赖关系检查
   - 注册表条目清理
   - 系统完整性验证

### 扫描命令

```bash
# 针对特定模块的完整验证
./.claude/scripts/project-scanner.sh --module YourModule --full-scan

# 只验证API一致性
./.claude/scripts/project-scanner.sh --module YourModule --check api-registry

# 生成详细报告
./.claude/scripts/project-scanner.sh --module YourModule --report detailed
```

## ✅ 质量门禁检查清单

### 创建模块时检查
- [ ] 模块目录结构正确
- [ ] 继承BaseModule
- [ ] 实现必需方法 (initialize, destroy, handshake)
- [ ] 包含必需属性 (getModuleInfo, moduleConfig)
- [ ] 有测试文件
- [ ] 有README文档
- [ ] 在API注册表中注册
- [ ] 通过项目扫描验证

### 更新模块时检查
- [ ] 新增方法在API注册表中有对应条目
- [ ] 修改后的方法签名与注册表一致
- [ ] 添加了相应的测试用例
- [ ] 更新了文档
- [ ] 通过API注册表验证
- [ ] 通过项目扫描验证

### 删除模块时检查
- [ ] 确认没有其他模块依赖
- [ ] 从API注册表中移除条目
- [ ] 移除所有相关引用
- [ ] 通过完整项目扫描验证
- [ ] 系统功能测试通过

## 🚨 常见问题和解决方案

### API注册表不一致
**问题**: 模块实现与注册表不匹配
**解决方案**: 
1. 运行 `npm run validate:api-registry` 查看详细错误
2. 确保所有公共方法都在注册表中有对应条目
3. 确保方法签名与注册表一致

### 模块结构不符合标准
**问题**: 模块目录结构不正确
**解决方案**:
1. 参考 `MODULE_API_STANDARDS_IMPLEMENTATION.md` 中的标准结构
2. 确保包含必需的目录和文件
3. 运行 `./.claude/scripts/project-scanner.sh --module YourModule` 查看具体问题

### BaseModule继承问题
**问题**: 没有正确继承BaseModule
**解决方案**:
1. 确保模块类继承BaseModule
2. 实现所有必需的生命周期方法
3. 正确调用super()构造函数
4. 实现必需的属性方法

通过遵循这些规则和指引，你可以确保所有模块开发和管理活动都符合RCC4系统的标准和最佳实践。
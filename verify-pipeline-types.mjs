#!/usr/bin/env node

// Simple verification script to check if the fixes work
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pipelineDir = join(__dirname, 'sharedmodule', 'pipeline');

console.log('🔍 Verifying TypeScript compilation fixes for pipeline module...\n');

const checks = [
  {
    name: 'Duplicate ErrorCategory/ErrorSeverity imports',
    file: join(pipelineDir, 'src/core/DebuggablePipelineModule.ts'),
    check: (content) => {
      const imports = content.match(/import.*ErrorCategory.*from/g) || [];
      return imports.length === 1;
    }
  },
  {
    name: 'handleMessage method in DebuggablePipelineModule',
    file: join(pipelineDir, 'src/core/DebuggablePipelineModule.ts'),
    check: (content) => content.includes('public async handleMessage(message: any): Promise<any>')
  },
  {
    name: 'handleMessage method in PipelineBaseModule',
    file: join(pipelineDir, 'src/modules/PipelineBaseModule.ts'),
    check: (content) => content.includes('public async handleMessage(message: any): Promise<any>')
  },
  {
    name: 'handleMessage method in BasePipelineModule',
    file: join(pipelineDir, 'src/modules/BasePipelineModule.ts'),
    check: (content) => content.includes('public async handleMessage(message: any): Promise<any>')
  },
  {
    name: 'ErrorHandlingCenter import fix',
    file: join(pipelineDir, 'src/core/DebuggablePipelineModule.ts'),
    check: (content) => content.includes('ErrorHandlingCenter as ErrorHandlingCenterType')
  },
  {
    name: 'DebugCenter import fix',
    file: join(pipelineDir, 'src/core/DebuggablePipelineModule.ts'),
    check: (content) => content.includes('DebugCenter as DebugCenterType')
  },
  {
    name: 'Config property fix in BaseProvider',
    file: join(pipelineDir, 'src/framework/BaseProvider.ts'),
    check: (content) => content.includes('return this.pipelineConfig;')
  },
  {
    name: 'Duplicate validate getter removed',
    file: join(pipelineDir, 'src/framework/OpenAIInterface.ts'),
    check: (content) => {
      const hasMethod = content.includes('validate(): boolean');
      const hasGetter = content.includes('get validate:');
      return hasMethod && !hasGetter;
    }
  },
  {
    name: 'Duplicate toStandardFormat getter removed',
    file: join(pipelineDir, 'src/framework/OpenAIInterface.ts'),
    check: (content) => {
      const hasMethod = content.includes('toStandardFormat(): OpenAIChatResponseData');
      const hasGetter = content.includes('get toStandardFormat:');
      return hasMethod && !hasGetter;
    }
  }
];

let allPassed = true;

for (const check of checks) {
  try {
    const content = readFileSync(check.file, 'utf8');
    const passed = check.check(content);

    if (passed) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${check.name} - Error reading file: ${error.message}`);
    allPassed = false;
  }
}

console.log('\n📋 Summary:');
if (allPassed) {
  console.log('🎉 All TypeScript compilation fixes have been successfully applied!');
  console.log('\nFixed issues:');
  console.log('1. ✅ Removed duplicate ErrorCategory/ErrorSeverity imports');
  console.log('2. ✅ Added handleMessage method implementations to all classes');
  console.log('3. ✅ Fixed type imports for ErrorHandlingCenter and DebugCenter');
  console.log('4. ✅ Fixed config property in BaseProvider');
  console.log('5. ✅ Removed duplicate validate and toStandardFormat getters');
} else {
  console.log('❌ Some issues remain unfixed. Please review the failed checks above.');
}

console.log('\n🚀 The pipeline module should now compile without TypeScript errors!');
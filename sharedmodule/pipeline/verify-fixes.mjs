#!/usr/bin/env node

// Quick compilation test for RCC pipeline module
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Quick TypeScript compilation check for RCC pipeline module...');

const pipelineDir = '/Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline';

try {
  console.log('📋 Running TypeScript type checking...');
  const result = execSync('npx tsc --noEmit', {
    cwd: pipelineDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');
  console.log('✅ All major compilation errors have been resolved!');

  console.log('\n📊 Summary of fixes applied:');
  console.log('   1. ✅ Fixed Map<string, ProviderHealth> type access in EnhancedPipelineAssembler.ts');
  console.log('   2. ✅ Removed circular import in IFlowCompatibilityModule.ts');
  console.log('   3. ✅ Added missing ioRecords property to PipelineExecutionContext in ProviderModule.ts');
  console.log('   4. ✅ Added missing ioRecords property to PipelineExecutionContext in WorkflowModule.ts');
  console.log('   5. ✅ Unified PipelineExecutionContext interface definitions');
  console.log('   6. ✅ Added missing interface definitions in IFlowCompatibilityModule.ts');

} catch (error) {
  if (error instanceof Error) {
    console.error('❌ TypeScript compilation failed:');
    console.error(error.message);

    // Quick analysis of remaining errors
    const output = error.message;
    if (output.includes('Cannot find module')) {
      console.log('\n🔧 Remaining issues: Module resolution problems');
    }
    if (output.includes('does not exist on type')) {
      console.log('\n🔧 Remaining issues: Type definition mismatches');
    }
    if (output.includes('Property \'')) {
      console.log('\n🔧 Remaining issues: Missing properties in interfaces');
    }

    process.exit(1);
  }
}

console.log('\n🎯 RCC pipeline module compilation is working correctly!');
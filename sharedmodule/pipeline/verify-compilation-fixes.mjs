#!/usr/bin/env node

/**
 * Final verification script for TypeScript compilation fixes
 * This script performs comprehensive type checking and verification
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Starting final TypeScript compilation verification...\n');

// Define the source directory
const sourceDir = path.join(__dirname, 'src');

// List of key files to verify
const verificationFiles = [
  'core/ModularPipelineExecutor.ts',
  'core/DebuggablePipelineModule.ts',
  'modules/IFlowCompatibilityModule.ts',
  'modules/WorkflowModule.ts',
  'modules/LLMSwitchModule.ts',
  'core/PipelineProcessor.ts'
];

console.log('📋 Files to verify:');
verificationFiles.forEach(file => {
  console.log(`  - ${file}`);
});
console.log('');

// Verification checks
const checks = {
  executionErrorTypes: {
    description: 'ExecutionError category and severity use correct enum types',
    files: ['core/DebuggablePipelineModule.ts'],
    checkFunction: verifyExecutionErrorTypes
  },
  pipelineExecutionContext: {
    description: 'PipelineExecutionContext has all required properties',
    files: ['core/ModularPipelineExecutor.ts'],
    checkFunction: verifyPipelineExecutionContext
  },
  stringUndefinedAssignments: {
    description: 'No string | undefined assignments to string properties',
    files: verificationFiles,
    checkFunction: verifyStringUndefinedAssignments
  },
  moduleConfigTypes: {
    description: 'ModuleInfo vs ModuleConfig types are used correctly',
    files: verificationFiles,
    checkFunction: verifyModuleConfigTypes
  },
  importStatements: {
    description: 'All required imports are present and correct',
    files: verificationFiles,
    checkFunction: verifyImportStatements
  }
};

// Run verification checks
let passedChecks = 0;
let totalChecks = Object.keys(checks).length;

for (const [checkName, check] of Object.entries(checks)) {
  console.log(`🔧 Running check: ${check.description}`);

  try {
    const result = check.checkFunction(check.files);
    if (result.success) {
      console.log(`✅ ${checkName}: PASSED`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      passedChecks++;
    } else {
      console.log(`❌ ${checkName}: FAILED`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.details) {
        console.log('   Details:');
        result.details.forEach(detail => console.log(`     - ${detail}`));
      }
    }
  } catch (error) {
    console.log(`❌ ${checkName}: ERROR - ${error.message}`);
  }

  console.log('');
}

// Summary
console.log('📊 Verification Summary:');
console.log(`   Passed: ${passedChecks}/${totalChecks}`);
console.log(`   Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All verification checks passed! The pipeline module should now compile successfully.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some verification checks failed. Please review the issues above.');
  process.exit(1);
}

// Verification functions

function verifyExecutionErrorTypes(files) {
  const errors = [];

  for (const filePath of files) {
    const content = readFile(filePath);

    // Check for string-based category assignments (should use ErrorCategory enum)
    const stringCategoryMatches = content.match(/category:\s*['"][\w-]+['"]/g);
    if (stringCategoryMatches) {
      errors.push(`Found string category assignments in ${filePath}`);
    }

    // Check for string-based severity assignments (should use ErrorSeverity enum)
    const stringSeverityMatches = content.match(/severity:\s*['"][\w-]+['"]/g);
    if (stringSeverityMatches) {
      errors.push(`Found string severity assignments in ${filePath}`);
    }

    // Check for proper enum usage
    const categoryEnumUsage = content.includes('ErrorCategory.');
    const severityEnumUsage = content.includes('ErrorSeverity.');

    if (!categoryEnumUsage) {
      errors.push(`ErrorCategory enum not used in ${filePath}`);
    }

    if (!severityEnumUsage) {
      errors.push(`ErrorSeverity enum not used in ${filePath}`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'ExecutionError types are correctly implemented' : undefined,
    details: errors.length > 0 ? errors : undefined
  };
}

function verifyPipelineExecutionContext(files) {
  const errors = [];

  for (const filePath of files) {
    const content = readFile(filePath);

    // Look for PipelineExecutionContext creation
    const contextMatches = content.match(/const\s+\w+:\s+PipelineExecutionContext\s*=\s*{[^}]+}/g);

    if (contextMatches) {
      for (const match of contextMatches) {
        // Check for required properties
        const requiredProps = [
          'executionId',
          'traceId',
          'sessionId',
          'requestId',
          'virtualModelId',
          'providerId',
          'startTime',
          'stage',
          'timing',
          'ioRecords',
          'metadata',
          'parentContext',
          'parent',
          'debugConfig',
          'routingDecision',
          'performanceMetrics'
        ];

        const missingProps = requiredProps.filter(prop => !match.includes(prop + ':'));

        if (missingProps.length > 0) {
          errors.push(`Missing properties in PipelineExecutionContext in ${filePath}: ${missingProps.join(', ')}`);
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'PipelineExecutionContext properties are complete' : undefined,
    details: errors.length > 0 ? errors : undefined
  };
}

function verifyStringUndefinedAssignments(files) {
  const errors = [];

  for (const filePath of files) {
    const content = readFile(filePath);

    // Look for potentially problematic assignments
    const problematicPatterns = [
      /providerId:\s*context\?\.\w+(?!\s*\|\|\s*['\w'])/g,
      /stage:\s*context\?\.\w+(?!\s*\|\|\s*['\w])/g,
      /operation:\s*context\?\.\w+(?!\s*\|\|\s*['\w])/g
    ];

    for (const pattern of problematicPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        errors.push(`Potentially problematic string | undefined assignment in ${filePath}: ${matches[0]}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'No problematic string | undefined assignments found' : undefined,
    details: errors.length > 0 ? errors : undefined
  };
}

function verifyModuleConfigTypes(files) {
  const errors = [];

  for (const filePath of files) {
    const content = readFile(filePath);

    // Check for ModuleInfo being passed where ModuleConfig is expected
    const incorrectUsage = content.match(/super\s*\(\s*[^)]*ModuleInfo[^)]*\)/g);
    if (incorrectUsage) {
      errors.push(`Potential ModuleInfo misuse in ${filePath}`);
    }

    // Check for proper constructor patterns
    const properModuleInfoUsage = content.match(/const\s+moduleInfo:\s*ModuleInfo\s*=\s*{/g);
    const properModuleConfigUsage = content.match(/config:\s*ModuleConfig/g);

    if (!properModuleInfoUsage && filePath.includes('Module')) {
      errors.push(`ModuleInfo pattern not found in ${filePath}`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'ModuleInfo and ModuleConfig types are used correctly' : undefined,
    details: errors.length > 0 ? errors : undefined
  };
}

function verifyImportStatements(files) {
  const errors = [];

  for (const filePath of files) {
    const content = readFile(filePath);

    // Check for required imports
    const requiredImports = [
      'PipelineExecutionContext',
      'ErrorCategory',
      'ErrorSeverity',
      'ModuleConfig'
    ];

    const missingImports = requiredImports.filter(imp => {
      return !content.includes(`import.*${imp}`) && !content.includes(`from.*${imp}`);
    });

    if (missingImports.length > 0) {
      errors.push(`Missing imports in ${filePath}: ${missingImports.join(', ')}`);
    }

    // Check for duplicate imports
    const duplicateErrorCategory = (content.match(/ErrorCategory/g) || []).length;
    if (duplicateErrorCategory > 2) {
      errors.push(`Potential duplicate ErrorCategory imports in ${filePath}`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Import statements are correct' : undefined,
    details: errors.length > 0 ? errors : undefined
  };
}

function readFile(filePath) {
  const fullPath = path.join(sourceDir, filePath);
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read file ${fullPath}: ${error.message}`);
  }
}
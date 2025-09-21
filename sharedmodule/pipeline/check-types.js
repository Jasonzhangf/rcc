const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for TypeScript compilation issues...\n');

// Common issues to check for
const issues = [];

// Check 1: Missing interface implementations
console.log('1. Checking interface implementations...');
const moduleFiles = [
  'src/modules/LLMSwitchModule.ts',
  'src/modules/WorkflowModule.ts',
  'src/modules/CompatibilityModule.ts',
  'src/modules/ProviderModule.ts'
];

moduleFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if module has required methods
    const hasInitialize = content.includes('initialize(');
    const hasDestroy = content.includes('destroy(');
    const hasGetStatus = content.includes('getStatus(');

    if (!hasInitialize) {
      issues.push(`❌ ${file}: Missing initialize() method`);
    }
    if (!hasDestroy) {
      issues.push(`❌ ${file}: Missing destroy() method`);
    }
    if (!hasGetStatus) {
      issues.push(`❌ ${file}: Missing getStatus() method`);
    }
  } else {
    issues.push(`❌ ${file}: File not found`);
  }
});

// Check 2: Interface definition completeness
console.log('2. Checking interface definitions...');
const interfacesFile = path.join(__dirname, 'src/interfaces/ModularInterfaces.ts');
if (fs.existsSync(interfacesFile)) {
  const content = fs.readFileSync(interfacesFile, 'utf8');

  // Check for IORecord interface
  if (!content.includes('interface IORecord')) {
    issues.push('❌ ModularInterfaces.ts: Missing IORecord interface');
  }

  // Check for PipelineExecutionContext interface
  if (!content.includes('interface PipelineExecutionContext')) {
    issues.push('❌ ModularInterfaces.ts: Missing PipelineExecutionContext interface');
  }
}

// Check 3: Import consistency
console.log('3. Checking import consistency...');
const srcFiles = [];
function findTsFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findTsFiles(filePath);
    } else if (file.endsWith('.ts')) {
      srcFiles.push(filePath);
    }
  });
}

findTsFiles(path.join(__dirname, 'src'));

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(__dirname, file);

  // Check for problematic imports
  if (content.includes("from '../interfaces/ModularInterfaces'")) {
    // This is good
  } else if (content.includes('ModularInterfaces') && !content.includes('rcc-pipeline')) {
    issues.push(`⚠️  ${relativePath}: ModularInterfaces import might be incorrect`);
  }
});

// Check 4: Module class structure
console.log('4. Checking module class structure...');
const moduleClasses = ['LLMSwitchModule', 'WorkflowModule', 'CompatibilityModule', 'ProviderModule'];

moduleClasses.forEach(className => {
  const files = srcFiles.filter(file => fs.readFileSync(file, 'utf8').includes(`class ${className}`));

  if (files.length === 0) {
    issues.push(`❌ ${className}: Class not found in any file`);
  } else if (files.length > 1) {
    issues.push(`⚠️  ${className}: Found in multiple files: ${files.map(f => path.relative(__dirname, f)).join(', ')}`);
  }
});

// Report results
console.log('\n📊 SUMMARY:');
if (issues.length === 0) {
  console.log('✅ No issues found! Code looks good for compilation.');
} else {
  console.log(`❌ Found ${issues.length} potential issues:`);
  issues.forEach(issue => console.log(`  ${issue}`));

  console.log('\n💡建议的修复步骤:');
  console.log('1. 确保所有模块类实现了必需的方法 (initialize, destroy, getStatus)');
  console.log('2. 检查ModularInterfaces.ts中的接口定义是否完整');
  console.log('3. 验证所有导入路径是否正确');
  console.log('4. 运行 npm install 确保依赖完整');
  console.log('5. 运行 npm run typecheck 查看具体错误');
}

process.exit(issues.length > 0 ? 1 : 0);
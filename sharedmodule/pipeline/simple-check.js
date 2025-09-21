const fs = require('fs');
const path = require('path');

console.log('🔍 Simple TypeScript Issues Checker\n');

// Read and check ModularInterfaces.ts
console.log('1. Checking ModularInterfaces.ts...');
const interfacesPath = path.join(__dirname, 'src/interfaces/ModularInterfaces.ts');
if (fs.existsSync(interfacesPath)) {
  const content = fs.readFileSync(interfacesPath, 'utf8');
  console.log('✅ ModularInterfaces.ts exists');

  // Check for key interfaces
  const hasIORecord = content.includes('export interface IORecord');
  const hasPipelineContext = content.includes('export interface PipelineExecutionContext');
  const hasModuleInterface = content.includes('export interface IPipelineModule');

  console.log(`   IORecord interface: ${hasIORecord ? '✅' : '❌'}`);
  console.log(`   PipelineExecutionContext: ${hasPipelineContext ? '✅' : '❌'}`);
  console.log(`   IPipelineModule interface: ${hasModuleInterface ? '✅' : '❌'}`);
} else {
  console.log('❌ ModularInterfaces.ts not found');
}

// Check module files
console.log('\n2. Checking module files...');
const modules = [
  'LLMSwitchModule',
  'WorkflowModule',
  'CompatibilityModule',
  'ProviderModule'
];

modules.forEach(module => {
  const filePath = path.join(__dirname, `src/modules/${module}.ts`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ ${module}.ts exists`);

    // Check for required methods
    const hasInitialize = content.includes('initialize(');
    const hasDestroy = content.includes('destroy(');
    const hasGetStatus = content.includes('getStatus(');

    console.log(`   initialize(): ${hasInitialize ? '✅' : '❌'}`);
    console.log(`   destroy(): ${hasDestroy ? '✅' : '❌'}`);
    console.log(`   getStatus(): ${hasGetStatus ? '✅' : '❌'}`);
  } else {
    console.log(`❌ ${module}.ts not found`);
  }
});

// Check core files
console.log('\n3. Checking core files...');
const coreFiles = [
  'ModularPipelineExecutor.ts',
  'ModuleFactory.ts',
  'ConfigurationValidator.ts',
  'RoutingOptimizer.ts',
  'IOTracker.ts',
  'PipelineExecutionOptimizer.ts'
];

coreFiles.forEach(file => {
  const filePath = path.join(__dirname, `src/core/${file}`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ core/${file} exists`);
  } else {
    console.log(`❌ core/${file} missing`);
  }
});

// Check framework files
console.log('\n4. Checking framework files...');
const frameworkFiles = [
  'BaseProvider.ts',
  'OpenAIInterface.ts',
  'Pipeline.ts',
  'PipelineAssembler.ts',
  'ModuleScanner.ts'
];

frameworkFiles.forEach(file => {
  const filePath = path.join(__dirname, `src/framework/${file}`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ framework/${file} exists`);
  } else {
    console.log(`❌ framework/${file} missing`);
  }
});

console.log('\n✅ Check complete!');
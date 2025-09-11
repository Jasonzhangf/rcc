const fs = require('fs');
const path = require('path');

// Create index files for better module entry points
function createIndexFiles() {
  const distDir = path.join(__dirname, '..', 'dist');
  const esmDir = path.join(distDir, 'esm');
  
  // Create CommonJS index file
  const cjsIndex = `// Main entry point for RCC Virtual Model Rules Module (CommonJS)

const { VirtualModelRulesModule } = require('./VirtualModelRulesModule');
const { IVirtualModelRules } = require('./interfaces/IVirtualModelRules');

module.exports = {
  VirtualModelRulesModule,
  IVirtualModelRules
};`;

  // Create ESM index file
  const esmIndex = `// Main entry point for RCC Virtual Model Rules Module (ESM)

export { VirtualModelRulesModule } from './VirtualModelRulesModule';
export { IVirtualModelRules } from './interfaces/IVirtualModelRules';
export * from './types/VirtualModelRulesTypes';`;

  // Create TypeScript declarations index file
  const dtsIndex = `// Main entry point for RCC Virtual Model Rules Module (TypeScript declarations)

export { VirtualModelRulesModule } from './VirtualModelRulesModule';
export { IVirtualModelRules } from './interfaces/IVirtualModelRules';
export * from './types/VirtualModelRulesTypes';`;

  // Write files
  fs.writeFileSync(path.join(distDir, 'index.cjs'), cjsIndex);
  fs.writeFileSync(path.join(distDir, 'index.js'), esmIndex);
  fs.writeFileSync(path.join(distDir, 'index.d.ts'), dtsIndex);
  fs.writeFileSync(path.join(esmDir, 'index.js'), esmIndex);
  
  console.log('✅ Index files created successfully');
}

createIndexFiles();
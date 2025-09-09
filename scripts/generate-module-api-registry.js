#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to extract public methods from a TypeScript file
function extractPublicMethods(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Simple approach: look for public method signatures
    const lines = content.split('\n');
    const methods = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for public method declarations
      if (line.startsWith('public ') && line.includes('(') && line.includes('):')) {
        // Extract method name
        const nameMatch = line.match(/public\s+(?:async\s+)?(\w+)\s*\(/);
        if (!nameMatch) continue;
        
        const methodName = nameMatch[1];
        const isAsync = line.includes('async');
        
        // Extract return type (simplified)
        let returnType = 'void';
        const returnIndex = line.lastIndexOf('):');
        if (returnIndex !== -1) {
          returnType = line.substring(returnIndex + 2).trim();
          // Remove any trailing characters like { or ;
          returnType = returnType.split(/[{\s;]/)[0];
        }
        
        // Look for JSDoc comment above the method
        let description = '';
        let j = i - 1;
        while (j >= 0 && lines[j].trim() === '') j--; // Skip empty lines
        
        if (j >= 0 && lines[j].includes('*/')) {
          // Found end of comment, look for start
          let k = j;
          while (k >= 0 && !lines[k].includes('/**')) k--;
          
          if (k >= 0) {
            // Extract description from comment
            for (let l = k + 1; l < j; l++) {
              const commentLine = lines[l].trim();
              if (commentLine.startsWith('* ') || commentLine.startsWith('*')) {
                description += commentLine.replace('* ', '').replace('*', '') + ' ';
              }
            }
            description = description.trim();
          }
        }
        
        // Simple parameter extraction
        const paramMatch = line.match(/\(([^)]*)\)/);
        const parameters = [];
        if (paramMatch && paramMatch[1]) {
          const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p);
          for (const param of params) {
            const parts = param.split(':').map(p => p.trim());
            if (parts.length >= 2) {
              parameters.push({
                name: parts[0],
                type: parts[1],
                description: `Parameter ${parts[0]}`
              });
            }
          }
        }
        
        methods.push({
          name: methodName,
          description: description || `Public method ${methodName}`,
          parameters: parameters,
          returnType: returnType,
          isAsync: isAsync
        });
      }
    }
    
    return methods;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Function to extract class information
function extractClassInfo(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract class name
    const classMatch = content.match(/export\s+(abstract\s+)?class\s+(\w+)/);
    const className = classMatch ? classMatch[2] : path.basename(filePath, '.ts');
    
    // Extract class description from JSDoc
    let classDescription = '';
    const lines = content.split('\n');
    
    // Look for class JSDoc comment
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export class') || lines[i].includes('export abstract class')) {
        // Look backwards for comment
        let j = i - 1;
        while (j >= 0 && lines[j].trim() === '') j--;
        
        if (j >= 0 && lines[j].includes('*/')) {
          // Found end of comment, look for start
          let k = j;
          while (k >= 0 && !lines[k].includes('/**')) k--;
          
          if (k >= 0) {
            // Extract description from comment
            for (let l = k + 1; l < j; l++) {
              const commentLine = lines[l].trim();
              if (commentLine.startsWith('* ') || commentLine.startsWith('*')) {
                classDescription += commentLine.replace('* ', '').replace('*', '') + ' ';
              }
            }
            classDescription = classDescription.trim();
          }
        }
        break;
      }
    }
    
    return {
      name: className,
      description: classDescription || `${className} module`
    };
  } catch (error) {
    console.error(`Error extracting class info from ${filePath}:`, error);
    return {
      name: path.basename(filePath, '.ts'),
      description: `${path.basename(filePath, '.ts')} module`
    };
  }
}

// Function to generate API declaration for a module
function generateApiDeclaration(modulePath, moduleName) {
  // Check if it's a directory with src subdirectory
  let mainFile = path.join(modulePath, `${moduleName}.ts`);
  if (!fs.existsSync(mainFile)) {
    mainFile = path.join(modulePath, 'src', `${moduleName}.ts`);
  }
  
  if (!fs.existsSync(mainFile)) {
    console.error(`Main file not found for module ${moduleName}`);
    return null;
  }
  
  const classInfo = extractClassInfo(mainFile);
  const methods = extractPublicMethods(mainFile);
  
  const endpoints = methods.map(method => ({
    name: method.name,
    description: method.description,
    method: method.isAsync ? 'POST' : 'GET',
    path: `/${method.name}`,
    parameters: method.parameters,
    returnType: method.returnType,
    access: 'public'
  }));
  
  return {
    module: {
      name: classInfo.name,
      description: classInfo.description,
      version: '1.0.0',
      basePath: `/api/${moduleName.toLowerCase()}`
    },
    endpoints: endpoints
  };
}

// Function to add module to registry
function addModuleToRegistry(moduleName, apiDeclaration) {
  const registryPath = path.join(__dirname, '..', '.claude', 'module-api-registry.json');
  
  // Read existing registry
  let registry = { module_apis: {} };
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    registry = JSON.parse(content);
  }
  
  // Add or update module
  registry.module_apis[moduleName] = apiDeclaration;
  
  // Write updated registry
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`Added/updated ${moduleName} in module API registry`);
}

// Function to find modules
function findModules(srcDir) {
  const modules = [];
  
  // Core modules
  const coreDir = path.join(srcDir, 'core');
  if (fs.existsSync(coreDir)) {
    const coreModules = fs.readdirSync(coreDir).filter(item => 
      item.endsWith('.ts') && !item.includes('.test.')
    );
    for (const moduleFile of coreModules) {
      const moduleName = path.basename(moduleFile, '.ts');
      modules.push({
        name: moduleName,
        path: coreDir
      });
    }
  }
  
  // Specific modules
  const modulesDir = path.join(srcDir, 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleItems = fs.readdirSync(modulesDir).filter(item => 
      !item.startsWith('.') && item !== '__test__'
    );
    
    for (const item of moduleItems) {
      const itemPath = path.join(modulesDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Handle directory modules
        const moduleName = item;
        modules.push({
          name: moduleName,
          path: itemPath
        });
      } else if (item.endsWith('.ts') && !item.includes('.test.')) {
        // Handle single file modules
        const moduleName = path.basename(item, '.ts');
        modules.push({
          name: moduleName,
          path: modulesDir
        });
      }
    }
  }
  
  return modules;
}

// Main function
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  
  console.log('Generating API declarations for modules...\n');
  
  const modules = findModules(srcDir);
  
  if (modules.length === 0) {
    console.log('No modules found.');
    return;
  }
  
  for (const module of modules) {
    console.log(`Processing ${module.name}...`);
    const apiDeclaration = generateApiDeclaration(module.path, module.name);
    
    if (apiDeclaration) {
      addModuleToRegistry(module.name, apiDeclaration);
    } else {
      console.log(`  Failed to generate API declaration for ${module.name}`);
    }
  }
  
  console.log('\nAPI declaration generation completed.');
}

// Run the script
if (require.main === module) {
  main();
}
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
      if (line.startsWith('public ') && line.includes('(') && line.includes(')') && !line.includes('constructor')) {
        // Extract method name
        const nameMatch = line.match(/public\s+(async\s+)?(\w+)\s*\(/);
        if (nameMatch) {
          const isAsync = !!nameMatch[1];
          const methodName = nameMatch[2];
          
          // Extract return type
          let returnType = 'void';
          if (line.includes(':')) {
            const returnMatch = line.match(/:\s*([^{\n]+)/);
            if (returnMatch) {
              returnType = returnMatch[1].trim();
            }
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
          
          methods.push({
            name: methodName,
            description: description,
            parameters: [], // Simplified for now
            returnType: returnType,
            isAsync: isAsync
          });
        }
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
    const classMatch = content.match(/export\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : path.basename(filePath, '.ts');
    
    // Extract class description from JSDoc
    let classDescription = '';
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export class')) {
        // Look for JSDoc comment above the class
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
      description: classDescription
    };
  } catch (error) {
    console.error(`Error extracting class info from ${filePath}:`, error);
    return {
      name: path.basename(filePath, '.ts'),
      description: ''
    };
  }
}

// Function to generate API description for a module
function generateApiDescription(modulePath, moduleName) {
  const apiDescription = {
    module: {
      name: moduleName,
      description: '',
      version: '1.0.0',
      basePath: `/api/${moduleName.toLowerCase()}`
    },
    endpoints: []
  };
  
  // Check if it's a directory with src subdirectory
  let mainFile = path.join(modulePath, `${moduleName}.ts`);
  if (!fs.existsSync(mainFile)) {
    mainFile = path.join(modulePath, 'src', `${moduleName}.ts`);
  }
  
  if (fs.existsSync(mainFile)) {
    const classInfo = extractClassInfo(mainFile);
    apiDescription.module.description = classInfo.description || `${moduleName} module`;
    
    const methods = extractPublicMethods(mainFile);
    for (const method of methods) {
      apiDescription.endpoints.push({
        name: method.name,
        description: method.description || `Public method ${method.name}`,
        method: method.isAsync ? 'POST' : 'GET',
        path: `/${method.name}`,
        parameters: method.parameters,
        returnType: method.returnType,
        access: 'public'
      });
    }
  }
  
  return apiDescription;
}

// Function to create .claude directory and api-standards.json file
function createApiDescriptionFile(modulePath, apiDescription) {
  const claudeDir = path.join(modulePath, '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  
  const apiFile = path.join(claudeDir, 'api-standards.json');
  fs.writeFileSync(apiFile, JSON.stringify(apiDescription, null, 2));
  console.log(`Created API description for ${apiDescription.module.name} at ${apiFile}`);
}

// Function to ensure standard module structure
function ensureStandardModuleStructure(modulePath, moduleName) {
  // Create standard directories
  const directories = ['.claude', 'src', '__test__'];
  directories.forEach(dir => {
    const dirPath = path.join(modulePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  });
  
  // Create README.md if it doesn't exist
  const readmePath = path.join(modulePath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = `# ${moduleName}

## Overview
Brief description of the ${moduleName} module.

## API Endpoints
API endpoints are documented in the [.claude/api-standards.json](.claude/api-standards.json) file.

## Usage
Instructions for using this module.

## Testing
Information about module tests.
`;
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`Created README.md for ${moduleName}`);
  }
}

// Main function
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const modulesDir = path.join(srcDir, 'modules');
  const coreDir = path.join(srcDir, 'core');
  
  console.log('Generating API descriptions for modules...');
  
  // Process core modules
  if (fs.existsSync(coreDir)) {
    const coreModules = fs.readdirSync(coreDir).filter(item => 
      item.endsWith('.ts') && !item.includes('.test.')
    );
    
    for (const moduleFile of coreModules) {
      const moduleName = path.basename(moduleFile, '.ts');
      const modulePath = coreDir;
      const apiDescription = generateApiDescription(modulePath, moduleName);
      createApiDescriptionFile(modulePath, apiDescription);
      ensureStandardModuleStructure(modulePath, moduleName);
    }
  }
  
  // Process specific modules
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
        ensureStandardModuleStructure(itemPath, moduleName);
        const apiDescription = generateApiDescription(itemPath, moduleName);
        createApiDescriptionFile(itemPath, apiDescription);
      } else if (item.endsWith('.ts') && !item.includes('.test.')) {
        // Handle single file modules
        const moduleName = path.basename(item, '.ts');
        const apiDescription = generateApiDescription(modulesDir, moduleName);
        createApiDescriptionFile(modulesDir, apiDescription);
      }
    }
  }
  
  console.log('API description generation completed.');
}

// Run the script
if (require.main === module) {
  main();
}
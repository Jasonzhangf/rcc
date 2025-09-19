# ES Module Standardization Rules

## 🎯 Purpose

Ensure all RCC modules use consistent ES module format to eliminate compatibility issues and enable modern JavaScript development practices.

## 📋 Standard Requirements

### 1. Package.json Configuration
```json
{
  "type": "module",
  "main": "dist/index.esm.js",
  "module": "dist/index.esm.js",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
}
```

### 2. TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  }
}
```

### 3. File Extensions
- **Source files**: `.ts` (TypeScript)
- **Compiled ESM**: `.esm.js` (ES modules)
- **Compiled CommonJS**: `.cjs.js` (CommonJS fallback)
- **Type definitions**: `.d.ts`

### 4. Import/Export Syntax
```typescript
// ✅ Correct - ES module syntax
import { SomeClass } from './module';
import DefaultClass from './default-module';
export { SomeClass };
export default DefaultClass;

// ❌ Avoid - CommonJS syntax
const { SomeClass } = require('./module');
const DefaultClass = require('./default-module').default;
module.exports = { SomeClass };
```

## 🛠️ Build Configuration

### Rollup Configuration
```javascript
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
    }
  ],
  plugins: [
    typescript(),
    nodeResolve()
  ]
}
```

### npm Scripts
```json
{
  "scripts": {
    "build": "npm run clean && npm run build:types && npm run build:esm && npm run build:cjs",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist",
    "build:esm": "rollup -c rollup.config.esm.js",
    "build:cjs": "rollup -c rollup.config.cjs.js"
  }
}
```

## 🔍 Module Structure

### Standard Module Layout
```
module-name/
├── src/
│   ├── index.ts          # Main entry point
│   ├── core/             # Core functionality
│   ├── interfaces/       # TypeScript interfaces
│   └── utils/            # Utility functions
├── dist/                 # Compiled output
│   ├── index.esm.js      # ES module version
│   ├── index.cjs.js      # CommonJS fallback
│   ├── index.d.ts        # Type definitions
│   └── *.js.map          # Source maps
├── rollup.config.esm.js  # ESM build config
├── rollup.config.cjs.js  # CommonJS build config
├── tsconfig.json         # TypeScript config
└── package.json          # Module metadata
```

## 📦 Dependencies

### Internal Dependencies
All RCC internal modules MUST use the ES module format:
- `rcc-basemodule`
- `rcc-server`
- `rcc-pipeline`
- `rcc-errorhandling`
- `rcc-configuration`

### External Dependencies
External dependencies should be ES module compatible when possible. For CommonJS-only dependencies, use dynamic import:

```typescript
// ✅ Correct - Dynamic import for CommonJS modules
const commonjsModule = await import('commonjs-only-package');

// ❌ Avoid - Static import of CommonJS modules
import commonjsModule from 'commonjs-only-package';
```

## 🧪 Testing Requirements

### Module Loading Tests
```typescript
// Test both ES module and CommonJS loading
import { loadModule } from './test-utils';

describe('Module Loading', () => {
  it('should load as ES module', async () => {
    const module = await import('./dist/index.esm.js');
    expect(module.default).toBeDefined();
  });

  it('should load as CommonJS fallback', async () => {
    const module = await import('./dist/index.cjs.js');
    expect(module.default).toBeDefined();
  });
});
```

## 🚀 Migration Guide

### Converting CommonJS to ES Modules
1. Update `package.json` with `"type": "module"`
2. Change all `require()` to `import`
3. Change all `module.exports` to `export`
4. Update TypeScript configuration
5. Update build scripts
6. Test both import formats

### CLI Scripts
CLI entry points should use `.mjs` extension and ES module syntax:

```javascript
// ✅ Correct - CLI as ES module
#!/usr/bin/env node

import { program } from 'commander';
import { main } from './src/index.js';

// CLI logic
```

## 📋 Compliance Checklist

- [ ] `package.json` has `"type": "module"`
- [ ] `tsconfig.json` uses ES module settings
- [ ] All imports use ES module syntax
- [ ] All exports use ES module syntax
- [ ] Build generates both ESM and CommonJS versions
- [ ] Type definitions are available
- [ ] Module loading tests pass
- [ ] Documentation is updated

## 🔍 Validation

### Automated Checks
```bash
# Check for CommonJS patterns
find src/ -name "*.ts" -exec grep -l "require\|module\.exports\|exports\." {} \;

# Validate ES module syntax
npx tsc --noEmit
npm run build
npm test
```

## 📞 Support

For questions about ES module standardization:
- Check this documentation
- Review existing module implementations
- Contact the RCC development team

---

**Effective Date**: 2025-09-18
**Version**: 1.0.0
**Status**: Enforced
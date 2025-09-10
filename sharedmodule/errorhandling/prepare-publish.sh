#!/bin/bash

# 手动构建和发布脚本
echo "Preparing rcc-errorhandling for npm publishing..."

# 清理并创建dist目录
rm -rf dist
mkdir -p dist

# 复制源文件到dist
cp index.ts dist/
cp -r src dist/
cp -r interfaces dist/
cp -r constants dist/
cp package.json dist/
cp README.md dist/ 2>/dev/null || true
cp tsconfig.json dist/ 2>/dev/null || true

# 创建简化的package.json
cat > dist/package.json << 'EOF'
{
  "name": "rcc-errorhandling",
  "version": "1.0.2",
  "description": "RCC ErrorHandling Center - Simple error handling for RCC modules",
  "main": "index.ts",
  "module": "index.ts", 
  "types": "index.ts",
  "exports": {
    ".": {
      "import": "./index.ts",
      "require": "./index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "echo \"No tests yet\""
  },
  "keywords": [
    "rcc",
    "error-handling",
    "error-management",
    "types"
  ],
  "author": "RCC Team",
  "license": "MIT",
  "dependencies": {
    "rcc-basemodule": ">=0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "files": [
    "*.ts",
    "src/**/*",
    "interfaces/**/*",
    "constants/**/*"
  ]
}
EOF

echo "✅ Package prepared in dist/"
echo "Files in dist:"
ls -la dist/

echo ""
echo "To publish, run:"
echo "cd dist && npm publish"
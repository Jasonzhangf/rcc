import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 创建 dist 目录
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// 复制源文件到 dist 目录
function copySourceFiles() {
  const srcDir = 'src';
  const distDir = 'dist';
  
  // 复制所有 .ts 文件
  const copyFile = (filePath) => {
    const relativePath = path.relative(srcDir, filePath);
    const destPath = path.join(distDir, relativePath);
    const destDir = path.dirname(destPath);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, destPath);
    console.log(`Copied: ${filePath} -> ${destPath}`);
  };
  
  // 递归复制文件
  const copyRecursive = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        copyRecursive(filePath);
      } else if (file.endsWith('.ts')) {
        copyFile(filePath);
      }
    });
  };
  
  copyRecursive(srcDir);
}

// 创建 package.json 的副本
function createPackageJson() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  
  // 修改发布相关的字段
  packageJson.main = 'src/index.ts';
  packageJson.module = 'src/index.ts';
  packageJson.types = 'src/index.ts';
  packageJson.files = ['src/**/*', 'README.md', 'USAGE_EXAMPLES.md', 'CHANGELOG.md', 'LICENSE'];
  
  fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));
  console.log('Created dist/package.json');
}

// 复制文档文件
function copyDocs() {
  const docs = ['README.md', 'USAGE_EXAMPLES.md', 'CHANGELOG.md', 'LICENSE'];
  
  docs.forEach(doc => {
    if (fs.existsSync(doc)) {
      fs.copyFileSync(doc, `dist/${doc}`);
      console.log(`Copied: ${doc} -> dist/${doc}`);
    }
  });
}

// 执行构建
console.log('Building UnderConstruction module...');
copySourceFiles();
createPackageJson();
copyDocs();
console.log('Build completed!');
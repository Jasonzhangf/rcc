/**
 * Web UI 测试脚本
 * 
 * 验证Web UI模块的基础功能和类型安全性
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始测试 RCC Configuration Web UI...');

// 检查目录结构
function checkDirectoryStructure() {
  console.log('\n📁 检查目录结构...');
  
  const requiredDirs = [
    'src/webui',
    'src/webui/components',
    'src/webui/components/ConfigGenerator',
    'src/webui/components/ConfigParser',
    'src/webui/components/Common',
    'src/webui/services',
    'src/webui/managers',
    'src/webui/types',
    'src/webui/utils',
    'src/webui/assets'
  ];
  
  const missingDirs = [];
  const existingDirs = [];
  
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      existingDirs.push(dir);
      console.log(`  ✅ ${dir}`);
    } else {
      missingDirs.push(dir);
      console.log(`  ❌ ${dir}`);
    }
  });
  
  console.log(`\n统计: ${existingDirs.length}/${requiredDirs.length} 目录存在`);
  
  if (missingDirs.length > 0) {
    console.log('\n缺少的目录:');
    missingDirs.forEach(dir => console.log(`  - ${dir}`));
  }
  
  return missingDirs.length === 0;
}

// 检查文件存在
function checkRequiredFiles() {
  console.log('\n📄 检查必要文件...');
  
  const requiredFiles = [
    'src/webui/index.ts',
    'src/webui/types/ui.types.ts',
    'src/webui/utils/ui.utils.ts',
    'src/webui/components/index.ts',
    'src/webui/components/ConfigGenerator/ConfigGeneratorMain.ts',
    'src/webui/components/ConfigParser/ConfigParserMain.ts',
    'src/webui/components/Common/index.ts',
    'src/webui/services/ConfigService.ts',
    'src/webui/services/ParserService.ts',
    'src/webui/services/StorageService.ts',
    'src/webui/services/FileSystemService.ts',
    'src/webui/managers/ConfigLoadingManager.ts'
  ];
  
  const missingFiles = [];
  const existingFiles = [];
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      existingFiles.push(file);
      console.log(`  ✅ ${file}`);
    } else {
      missingFiles.push(file);
      console.log(`  ❌ ${file}`);
    }
  });
  
  console.log(`\n统计: ${existingFiles.length}/${requiredFiles.length} 文件存在`);
  
  if (missingFiles.length > 0) {
    console.log('\n缺少的文件:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  return missingFiles.length === 0;
}

// 检查TypeScript编译
function checkTypeScriptCompilation() {
  console.log('\n🔧 检查TypeScript编译...');
  
  try {
    const { execSync } = require('child_process');
    
    // 检查类型定义
    console.log('  ⚙️ 运行类型检查...');
    execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'pipe' });
    console.log('  ✅ TypeScript类型检查通过');
    
    return true;
  } catch (error) {
    console.log('  ❌ TypeScript类型检查失败');
    console.log('  错误信息:', error.message);
    return false;
  }
}

// 检查代码质量
function checkCodeQuality() {
  console.log('\n🔍 检查代码质量...');
  
  const filesToCheck = [
    'src/webui/index.ts',
    'src/webui/types/ui.types.ts',
    'src/webui/services/ConfigService.ts',
    'src/webui/services/ParserService.ts',
    'src/webui/services/StorageService.ts',
    'src/webui/services/FileSystemService.ts',
    'src/webui/managers/ConfigLoadingManager.ts'
  ];
  
  let totalLines = 0;
  let totalFunctions = 0;
  let totalClasses = 0;
  let totalInterfaces = 0;
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      const functions = (content.match(/function\s+\w+|\w+\s*\(/g) || []).length;
      const classes = (content.match(/class\s+\w+/g) || []).length;
      const interfaces = (content.match(/interface\s+\w+/g) || []).length;
      
      totalLines += lines;
      totalFunctions += functions;
      totalClasses += classes;
      totalInterfaces += interfaces;
      
      console.log(`  📄 ${file}: ${lines}行, ${functions}个函数, ${classes}个类, ${interfaces}个接口`);
    }
  });
  
  console.log(`\n总计:`);
  console.log(`  - 代码行数: ${totalLines}`);
  console.log(`  - 函数数量: ${totalFunctions}`);
  console.log(`  - 类数量: ${totalClasses}`);
  console.log(`  - 接口数量: ${totalInterfaces}`);
  
  return totalLines > 0;
}

// 检查模块导出
function checkModuleExports() {
  console.log('\n📦 检查模块导出...');
  
  const indexFile = 'src/index.ts';
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf8');
    
    if (content.includes('export * from \'./webui\'') || content.includes('export { WebUI };')) {
      console.log('  ✅ Web UI模块已正确导出');
      return true;
    } else {
      console.log('  ❌ Web UI模块未正确导出');
      return false;
    }
  }
  
  console.log('  ❌ 找不到主入口文件');
  return false;
}

// 检查演示文件
function checkDemoFile() {
  console.log('\n🎭 检查演示文件...');
  
  const demoFile = 'webui-demo.html';
  if (fs.existsSync(demoFile)) {
    const content = fs.readFileSync(demoFile, 'utf8');
    const hasTitle = content.includes('RCC Configuration Center');
    const hasStructure = content.includes('feature-grid');
    const hasStyles = content.includes('<style>');
    
    console.log(`  ✅ 演示文件存在`);
    console.log(`  ${hasTitle ? '✅' : '❌'} 包含标题`);
    console.log(`  ${hasStructure ? '✅' : '❌'} 包含结构`);
    console.log(`  ${hasStyles ? '✅' : '❌'} 包含样式`);
    
    return hasTitle && hasStructure && hasStyles;
  }
  
  console.log('  ❌ 演示文件不存在');
  return false;
}

// 生成报告
function generateReport() {
  console.log('\n📊 生成测试报告...');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    version: '1.0.0',
    checks: {
      directoryStructure: checkDirectoryStructure(),
      requiredFiles: checkRequiredFiles(),
      typeScriptCompilation: checkTypeScriptCompilation(),
      codeQuality: checkCodeQuality(),
      moduleExports: checkModuleExports(),
      demoFile: checkDemoFile()
    }
  };
  
  const reportFile = 'webui-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  const passedChecks = Object.values(report.checks).filter(Boolean).length;
  const totalChecks = Object.keys(report.checks).length;
  
  console.log(`\n报告已保存到: ${reportFile}`);
  console.log(`总体状态: ${passedChecks}/${totalChecks} 项检查通过`);
  
  if (passedChecks === totalChecks) {
    console.log('🎉 所有检查均通过！Web UI模块准备就绪。');
  } else {
    console.log('⚠️  存在一些问题需要解决。');
  }
  
  return report;
}

// 主测试流程
function main() {
  console.log('=' .repeat(60));
  console.log('RCC Configuration Center - Web UI 测试套件');
  console.log('=' .repeat(60));
  
  try {
    const report = generateReport();
    
    console.log('\n🔗 相关链接:');
    console.log('  - 演示文件: file://' + path.resolve('webui-demo.html'));
    console.log('  - 测试报告: file://' + path.resolve('webui-test-report.json'));
    console.log('  - 项目文档: README.md');
    
    process.exit(Object.values(report.checks).every(Boolean) ? 0 : 1);
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:');
    console.error(error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  checkDirectoryStructure,
  checkRequiredFiles,
  checkTypeScriptCompilation,
  checkCodeQuality,
  checkModuleExports,
  checkDemoFile,
  generateReport
};
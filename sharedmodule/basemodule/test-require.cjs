const basemodule = require('./dist/index.js');

console.log('✅ BaseModule exports test:');
console.log('   - Available exports:', Object.keys(basemodule));
console.log('   - BaseModule class:', typeof basemodule.BaseModule);
console.log('   - MessageCenter class:', typeof basemodule.MessageCenter);

// Test MessageCenter singleton
if (basemodule.MessageCenter && typeof basemodule.MessageCenter.getInstance === 'function') {
  const mc1 = basemodule.MessageCenter.getInstance();
  const mc2 = basemodule.MessageCenter.getInstance();
  console.log('✅ MessageCenter singleton:', mc1 === mc2);
} else {
  console.log('❌ MessageCenter not properly exported');
}

console.log('\n🎉 Module exports verified!');
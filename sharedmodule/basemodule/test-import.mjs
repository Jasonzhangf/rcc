// Test that BaseModule can be imported correctly
import { BaseModule, MessageCenter } from './dist/index.js';

console.log('✅ BaseModule import test:');
console.log('   - BaseModule class:', typeof BaseModule);
console.log('   - MessageCenter class:', typeof MessageCenter);

// Test MessageCenter singleton
const mc1 = MessageCenter.getInstance();
const mc2 = MessageCenter.getInstance();
console.log('✅ MessageCenter singleton:', mc1 === mc2);

console.log('\n🎉 All imports working correctly!');
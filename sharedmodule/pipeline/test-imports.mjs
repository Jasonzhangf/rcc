// Test file to verify all imports work correctly after fixes
import {
  PipelineAssembler,
  AssemblerConfig,
  AssemblyResult,
  RoutingContext,
  RoutingRulesEngine,
  PipelineBaseModule
} from './dist/index.esm.js';

console.log('✅ All imports successful!');
console.log('PipelineAssembler:', typeof PipelineAssembler);
console.log('RoutingContext:', typeof RoutingContext);
console.log('RoutingRulesEngine:', typeof RoutingRulesEngine);
console.log('PipelineBaseModule:', typeof PipelineBaseModule);
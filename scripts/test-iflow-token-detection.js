/**
 * Test iFlow Token Detection
 * Quick test script to validate iFlow-specific token detection logic
 */

// Import the TypeScript modules (for Node.js, we'll compile to JS first or use ts-node)
const { IFlowTokenDetector, IFlowProviderDetector, IFlowErrorParser } = require('./multi-key-ui/models/src/IFlowTokenDetector.ts');

// Test configuration
const TEST_CONFIG = {
  provider: {
    id: 'default-openai',
    name: 'iflow',
    protocol: 'openai', 
    api_base_url: 'https://apis.iflow.cn/v1/chat/completions',
    api_key: ['sk-1a3d168c80888a90c131fc6538515975', 'sk-b600575e03c8b3b768064326b2327c34']
  },
  model: {
    id: 'deepseek-v3',
    name: 'deepseek-v3',
    max_tokens: 131072,
    description: 'DeepSeek V3 strong Mixture-of-Experts (MoE) language model'
  }
};

async function testIFlowDetection() {
  console.log('🧪 Testing iFlow Token Detection Logic\n');

  // Test 1: Provider Detection
  console.log('1️⃣ Testing Provider Detection:');
  const providerDetector = new IFlowProviderDetector();
  const isIFlow = providerDetector.isProviderType(TEST_CONFIG.provider);
  console.log(`   Provider "${TEST_CONFIG.provider.name}" is iFlow: ${isIFlow ? '✅' : '❌'}\n`);

  // Test 2: Error Parser
  console.log('2️⃣ Testing Error Parser:');
  const errorParser = new IFlowErrorParser();
  
  // Simulate iFlow error response
  const iflowError = {
    message: "Bad request!: Requested token count exceeds the model's maximum context length of 131072 tokens. You requested a total of 524300.0 tokens: 12 tokens from the input messages and 524288.0 tokens for the completion.",
    error_code: 400
  };
  
  const parsedError = errorParser.parseError(iflowError);
  console.log('   Parsed Error:', parsedError);
  console.log(`   Is Token Limit Error: ${errorParser.isTokenLimitError(iflowError) ? '✅' : '❌'}\n`);

  // Test 3: Full Token Detection
  console.log('3️⃣ Testing Full Token Detection:');
  const tokenDetector = new IFlowTokenDetector();
  
  if (tokenDetector.supportsProvider(TEST_CONFIG.provider)) {
    console.log('   Provider is supported by iFlow detector ✅');
    
    try {
      // Get first API key
      const apiKey = Array.isArray(TEST_CONFIG.provider.api_key) 
        ? TEST_CONFIG.provider.api_key[0] 
        : TEST_CONFIG.provider.api_key;
      
      console.log(`   Starting detection for model: ${TEST_CONFIG.model.name}`);
      const result = await tokenDetector.detectTokenLimit(TEST_CONFIG.provider, TEST_CONFIG.model, apiKey);
      
      console.log('\n📊 Detection Results:');
      console.log('   Success:', result.success ? '✅' : '❌');
      console.log('   Detected Tokens:', result.detectedTokens?.toLocaleString() || 'null');
      console.log('   Provider Type:', result.providerType);
      if (result.error) {
        console.log('   Error:', result.error);
      }
      if (result.testResults) {
        console.log('   Test Results:', result.testResults.length, 'tests performed');
      }
    } catch (error) {
      console.log('   ❌ Detection failed:', error.message);
    }
  } else {
    console.log('   ❌ Provider not supported by iFlow detector');
  }
}

// For testing purposes, let's also create a simpler test without actual API calls
function testErrorPatternMatching() {
  console.log('\n🔍 Testing Error Pattern Matching:');
  
  const errorParser = new IFlowErrorParser();
  
  const testCases = [
    "maximum context length of 131072 tokens",
    "maximum context length is 262144 tokens", 
    "Bad request!: Requested token count exceeds the model's maximum context length of 131072 tokens",
    "Token limit exceeded: max 65536 tokens allowed",
    "Context length limit of 32768 tokens exceeded"
  ];

  testCases.forEach((testCase, index) => {
    const extracted = errorParser.extractTokenFromMessage(testCase);
    console.log(`   Test ${index + 1}: "${testCase}"`);
    console.log(`   Extracted: ${extracted ? extracted.toLocaleString() + ' tokens ✅' : 'null ❌'}\n`);
  });
}

// Run tests
async function runTests() {
  try {
    testErrorPatternMatching();
    await testIFlowDetection();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = {
  testIFlowDetection,
  testErrorPatternMatching,
  TEST_CONFIG
};
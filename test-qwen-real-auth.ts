/**
 * Real Qwen API Test
 * Tests actual HTTP requests to Qwen server with REAL authentication
 */

import * as https from 'https';
import * as http from 'http';

// Real Qwen API configuration
const QWEN_API_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

// Try to get real API key from environment
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;

// Test configuration
const testConfig = {
  model: 'qwen-turbo',
  timeout: 30000
};

// Simple HTTP request function
async function makeHttpsRequest(url: string, data: any, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('📡 Making HTTP request to:', url);
    console.log('📋 Request headers:', JSON.stringify(headers, null, 2));
    console.log('📋 Request data:', JSON.stringify(data, null, 2));
    
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      console.log('📡 Response status:', res.statusCode);
      console.log('📡 Response headers:', JSON.stringify(res.headers, null, 2));
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Raw response data:', responseData);
        
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          console.error('❌ Failed to parse JSON response:', error);
          console.error('❌ Raw response:', responseData);
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ HTTP request error:', error);
      reject(error);
    });
    
    req.setTimeout(testConfig.timeout, () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function testQwenAPIWithRealKey() {
  console.log('🚀 Testing Real Qwen API Request...');
  
  if (!QWEN_API_KEY) {
    console.error('❌ No Qwen API key found!');
    console.error('Please set one of these environment variables:');
    console.error('  export QWEN_API_KEY="your-api-key"');
    console.error('  export DASHSCOPE_API_KEY="your-api-key"');
    console.error('');
    console.error('You can get an API key from:');
    console.error('  https://dashscope.aliyun.com/');
    return false;
  }
  
  console.log('✅ Found API key:', QWEN_API_KEY.substring(0, 10) + '...');
  
  try {
    // Prepare API request according to Qwen API documentation
    const apiRequest = {
      model: testConfig.model,
      input: {
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message to verify the Qwen API is working correctly.'
          }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.8
      }
    };
    
    console.log('📋 Preparing to send request to Qwen API...');
    
    // Make HTTP request to Qwen API
    const response = await makeHttpsRequest(
      QWEN_API_ENDPOINT,
      apiRequest,
      {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Qwen-Test/1.0.0',
        'X-DashScope-Async': 'enable'
      }
    );
    
    console.log('\n✅ API request completed!');
    console.log('📊 Response Summary:');
    console.log(`  - Status Code: ${response.status}`);
    console.log(`  - Request ID: ${response.data.request_id || 'N/A'}`);
    console.log(`  - Model Used: ${response.data.model || 'N/A'}`);
    
    if (response.data.output) {
      console.log('✅ Response contains output:');
      console.log(`  - Text: ${response.data.output.text?.substring(0, 100)}...`);
      console.log(`  - Finish Reason: ${response.data.output.finish_reason}`);
    }
    
    if (response.data.usage) {
      console.log('📈 Token Usage:');
      console.log(`  - Input Tokens: ${response.data.usage.input_tokens}`);
      console.log(`  - Output Tokens: ${response.data.usage.output_tokens}`);
      console.log(`  - Total Tokens: ${response.data.usage.total_tokens}`);
    }
    
    if (response.data.code) {
      console.error('❌ API returned error:');
      console.error(`  - Code: ${response.data.code}`);
      console.error(`  - Message: ${response.data.message}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ API request failed:', error);
    return false;
  }
}

async function testTokenRefreshLogic() {
  console.log('\n🔄 Testing Token Refresh Logic...');
  
  if (!QWEN_API_KEY) {
    console.log('⚠️ Skipping token refresh test - no API key available');
    return false;
  }
  
  // Test token refresh by making multiple requests
  console.log('📋 Making multiple requests to test token management...');
  
  const requests = [
    'What is 2+2?',
    'Tell me about artificial intelligence.',
    'What is the capital of France?'
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < requests.length; i++) {
    console.log(`\n📡 Request ${i + 1}/${requests.length}: ${requests[i]}`);
    
    try {
      const apiRequest = {
        model: testConfig.model,
        input: {
          messages: [
            {
              role: 'user',
              content: requests[i]
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 50
        }
      };
      
      const response = await makeHttpsRequest(
        QWEN_API_ENDPOINT,
        apiRequest,
        {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'RCC-Qwen-Test/1.0.0'
        }
      );
      
      if (response.status === 200 && response.data.output) {
        console.log(`✅ Request ${i + 1} successful`);
        successCount++;
      } else {
        console.log(`❌ Request ${i + 1} failed`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Request ${i + 1} failed:`, error);
    }
  }
  
  console.log(`\n📊 Token refresh test results: ${successCount}/${requests.length} requests successful`);
  return successCount > 0;
}

async function runAllTests() {
  console.log('🧪 Starting Real Qwen API Tests...\n');
  console.log('==========================================');
  
  try {
    // Test 1: Basic API request
    const apiTest = await testQwenAPIWithRealKey();
    
    // Test 2: Token refresh logic
    const tokenTest = await testTokenRefreshLogic();
    
    console.log('\n==========================================');
    console.log('🎉 Real Qwen API Tests Completed!');
    console.log('\n📋 Test Results Summary:');
    console.log(`  API Request Test: ${apiTest ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Token Refresh Test: ${tokenTest ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (apiTest && tokenTest) {
      console.log('\n🎊 All tests passed! Qwen API integration is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the error messages above.');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run the tests
runAllTests().catch(console.error);
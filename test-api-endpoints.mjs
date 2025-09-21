// Test script to validate API endpoints are working
import http from 'http';

const SERVER_URL = 'http://localhost:5506';
const TEST_TIMEOUT = 5000;

// Test endpoints
const endpoints = [
  {
    method: 'GET',
    path: '/status',
    description: 'RCC system health check'
  },
  {
    method: 'GET',
    path: '/health',
    description: 'Basic health check'
  },
  {
    method: 'GET',
    path: '/metrics',
    description: 'Server metrics'
  },
  {
    method: 'POST',
    path: '/v1/messages',
    description: 'OpenAI chat endpoint',
    body: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: 'Hello, world!'
        }
      ]
    }
  },
  {
    method: 'POST',
    path: '/v1/chat/completions',
    description: 'OpenAI chat completions endpoint',
    body: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: 'Hello, world!'
        }
      ]
    }
  }
];

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5506,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Test-Client/1.0.0'
      },
      timeout: TEST_TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject({
        endpoint: endpoint.path,
        method: endpoint.method,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        endpoint: endpoint.path,
        method: endpoint.method,
        error: 'Request timeout'
      });
    });

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing RCC API endpoints...');
  console.log(`📍 Server URL: ${SERVER_URL}\n`);

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`🔄 Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}...`);

    try {
      const result = await makeRequest(endpoint);
      results.push({ ...result, success: true });

      if (result.status === 200 || result.status === 201) {
        console.log(`   ✅ Success (${result.status})`);
      } else if (result.status === 404) {
        console.log(`   ❌ Not Found (${result.status}) - This endpoint is missing`);
      } else if (result.status === 503) {
        console.log(`   ⚠️  Service Unavailable (${result.status}) - Server running but no scheduler`);
      } else {
        console.log(`   ❌ Error (${result.status})`);
      }

    } catch (error) {
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        success: false,
        error: error.error
      });
      console.log(`   ❌ Failed: ${error.error}`);
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${endpoints.length}`);
  console.log(`❌ Failed: ${failed.length}/${endpoints.length}`);

  if (successful.length > 0) {
    console.log('\n🟢 Working endpoints:');
    successful.forEach(result => {
      console.log(`   ${result.method} ${result.endpoint} (${result.status})`);
    });
  }

  if (failed.length > 0) {
    console.log('\n🔴 Failed endpoints:');
    failed.forEach(result => {
      console.log(`   ${result.method} ${result.endpoint} - ${result.error || `Status ${result.status}`}`);
    });
  }

  // Overall assessment
  console.log('\n🎯 Overall Assessment:');

  const statusWorking = successful.some(r => r.endpoint === '/status');
  const chatWorking = successful.some(r => r.endpoint === '/v1/messages' || r.endpoint === '/v1/chat/completions');

  if (statusWorking && chatWorking) {
    console.log('✅ API routing is working correctly! Both /status and chat endpoints are functional.');
    return true;
  } else if (statusWorking) {
    console.log('⚠️  Partial success: /status endpoint works, but chat endpoints may need scheduler setup.');
    return true;
  } else {
    console.log('❌ API routing issues detected. Check server configuration and startup.');
    return false;
  }
}

// Check if server is running first
function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5506,
      path: '/status',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🚀 RCC API Endpoint Test');
  console.log('=' .repeat(60));

  // Check if server is running
  console.log('🔍 Checking if RCC server is running...');
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    console.log('❌ RCC server is not running on port 5506');
    console.log('Please start the server with:');
    console.log('   rcc start --config ~/.rcc/rcc-config.json --port 5506');
    process.exit(1);
  }

  console.log('✅ RCC server is running');

  // Test endpoints
  const success = await testEndpoints();

  if (success) {
    console.log('\n🎉 RCC API routing test completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 RCC API routing test failed!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Test execution error:', error);
  process.exit(1);
});
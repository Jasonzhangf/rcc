// Integration test for server-pipeline-bootstrap connection
// This test verifies that all three modules can work together

import { BootstrapService } from './sharedmodule/bootstrap/dist/esm/index.js';
import { ServerModule } from './sharedmodule/server/dist/index.js';

async function testIntegration() {
  console.log('🧪 Starting Server-Pipeline-Bootstrap Integration Test');

  try {
    // 1. Create Bootstrap Service
    console.log('📋 Creating Bootstrap Service...');
    const bootstrap = new BootstrapService();

    // 2. Create Server Module
    console.log('🌐 Creating Server Module...');
    const server = new ServerModule();

    // 3. Configure Bootstrap with basic services
    console.log('⚙️ Configuring Bootstrap Service...');
    const bootstrapConfig = {
      version: '1.0.0',
      systemName: 'RCC Integration Test',
      environment: 'development',
      services: [
        {
          id: 'test-server',
          name: 'Test Server',
          type: 'http-server',
          version: '1.0.0',
          description: 'Test HTTP server for integration',
          modulePath: './sharedmodule/server/dist/index.esm.js',
          config: {
            port: 3001,
            host: 'localhost'
          },
          dependencies: [],
          startupOrder: 1,
          enabled: true,
          required: true,
          autoRestart: true,
          maxRestartAttempts: 3,
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000
          },
          startupTimeout: 10000,
          shutdownTimeout: 5000
        }
      ],
      global: {
        healthCheckInterval: 30000,
        serviceTimeout: 30000,
        maxRestartAttempts: 3,
        logLevel: 'info',
        gracefulShutdown: true,
        gracefulShutdownTimeout: 10000
      },
      coordination: {
        parallelStartup: true,
        maxConcurrentStartups: 3,
        startupDelay: 100,
        resolveDependencies: true
      },
      startupTimeout: 60000,
      shutdownTimeout: 30000,
      healthCheckInterval: 30000
    };

    await bootstrap.configure(bootstrapConfig);

    // 4. Configure Server Module
    console.log('⚙️ Configuring Server Module...');
    const serverConfig = {
      server: {
        port: 3001,
        host: 'localhost',
        cors: true,
        helmet: true,
        compression: true
      }
    };

    await server.configure(serverConfig);

    // 5. Connect Server to Bootstrap
    console.log('🔗 Connecting Server to Bootstrap...');
    bootstrap.setServerModule(server);

    // 6. Initialize Bootstrap
    console.log('🚀 Initializing Bootstrap Service...');
    await bootstrap.initialize();

    // 7. Start Bootstrap
    console.log('🏃 Starting Bootstrap Service...');
    await bootstrap.start();

    // 8. Check System Health
    console.log('💓 Checking System Health...');
    const health = bootstrap.getSystemHealth();
    console.log('📊 System Health Status:', health);

    // 9. Get Bootstrap State
    console.log('📈 Getting Bootstrap State...');
    const state = bootstrap.getBootstrapState();
    console.log('📋 Bootstrap State:', {
      phase: state.phase,
      progress: state.progress,
      totalServices: state.totalServices,
      runningServices: state.completedServices,
      failedServices: state.failedServices
    });

    // 10. Test Server Status
    console.log('🌐 Testing Server Status...');
    const serverStatus = server.getServerStatus();
    console.log('📊 Server Status:', serverStatus);

    // 11. Stop all services
    console.log('🛑 Stopping Bootstrap Service...');
    await bootstrap.stop();

    console.log('✅ Integration Test Completed Successfully!');
    console.log('🎉 All modules are working together correctly!');

    return {
      success: true,
      health,
      state,
      serverStatus
    };

  } catch (error) {
    console.error('❌ Integration Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the test
testIntegration().then(result => {
  if (result.success) {
    console.log('\n🎯 Test Results:', JSON.stringify(result, null, 2));
    process.exit(0);
  } else {
    console.log('\n💥 Test Failed:', result.error);
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test Runner Error:', error);
  process.exit(1);
});
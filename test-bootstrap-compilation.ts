// Test script to verify BootstrapService compiles correctly
import { BootstrapService } from './sharedmodule/bootstrap/src/core/BootstrapService.js';

async function testCompilation() {
  try {
    console.log('Creating BootstrapService instance...');
    const bootstrap = new BootstrapService();

    console.log('Testing configuration...');
    const config = {
      version: '1.0.0',
      systemName: 'Test System',
      environment: 'development' as const,
      services: [],
      global: {
        healthCheckInterval: 30000,
        serviceTimeout: 30000,
        maxRestartAttempts: 3,
        logLevel: 'info' as const,
        gracefulShutdown: true,
        gracefulShutdownTimeout: 10000
      },
      coordination: {
        parallelStartup: true,
        maxConcurrentStartups: 3,
        startupDelay: 1000,
        resolveDependencies: true
      },
      startupTimeout: 30000,
      shutdownTimeout: 10000,
      healthCheckInterval: 30000,
      enableTwoPhaseDebug: true,
      debugBaseDirectory: '~/.rcc/debug'
    };

    await bootstrap.configure(config);
    console.log('✅ TypeScript compilation successful!');
    console.log('✅ BootstrapService configuration completed');

  } catch (error) {
    console.error('❌ Compilation or configuration failed:', error);
    process.exit(1);
  }
}

testCompilation();
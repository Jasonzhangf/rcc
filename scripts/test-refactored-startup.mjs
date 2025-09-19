#!/usr/bin/env node

/**
 * Test Script for Refactored RCC Startup Flow
 *
 * This script tests the new pipeline-first architecture to ensure:
 * 1. Configuration loading succeeds
 * 2. Pipeline assembly works
 * 3. Scheduler initialization completes
 * 4. Virtual model registration succeeds
 * 5. Server starts with prepared pipeline system
 * 6. No "No available targets" error occurs
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class RefactoredStartupTester {
  constructor() {
    this.configPath = path.join(os.homedir(), '.rcc', 'rcc-config.json');
    this.testPort = 5599;
    this.testResults = {
      configurationLoaded: false,
      pipelineInitialized: false,
      schedulerCreated: false,
      modelsRegistered: false,
      serverStarted: false,
      noErrorsFound: false
    };
    this.debugLog = [];
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    this.debugLog.push(logEntry);
    console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  async test() {
    console.log('🧪 Testing Refactored RCC Startup Flow - Pipeline First Architecture');
    console.log('======================================================================');

    try {
      // Phase 1: Test Configuration
      await this.testConfiguration();

      // Phase 2: Test Pipeline Components
      await this.testPipelineComponents();

      // Phase 3: Test Startup Script
      await this.testStartupScript();

      // Phase 4: Test Server Running
      await this.testServerRunning();

      // Phase 5: Test Virtual Models Available
      await this.testVirtualModelsAvailable();

      // Generate Test Report
      await this.generateTestReport();

    } catch (error) {
      console.error('💥 Test Suite Failed:', error);
      throw error;
    }
  }

  async testConfiguration() {
    this.log('Testing configuration file...', { configPath: this.configPath });

    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      // Validate config structure
      if (!config.providers || !config.virtualModels) {
        throw new Error('Configuration missing required sections (providers, virtualModels)');
      }

      if (Object.keys(config.providers).length === 0) {
        throw new Error('No providers configured');
      }

      if (Object.keys(config.virtualModels).length === 0) {
        throw new Error('No virtual models configured');
      }

      this.testResults.configurationLoaded = true;
      this.log('✅ Configuration test passed', {
        providerCount: Object.keys(config.providers).length,
        modelCount: Object.keys(config.virtualModels).length
      });

    } catch (error) {
      this.log('❌ Configuration test failed', { error: error.message });
      throw error;
    }
  }

  async testPipelineComponents() {
    this.log('Testing pipeline module components...');

    try {
      // Test that pipeline module can be imported
      const pipelinePath = path.join(process.cwd(), 'sharedmodule', 'pipeline', 'dist', 'index.esm.js');

      if (!fs.existsSync(pipelinePath)) {
        throw new Error(`Pipeline module not found at: ${pipelinePath}`);
      }

      const pipelineModule = await import(pipelinePath);

      // Verify required classes are exported
      const requiredExports = [
        'VirtualModelSchedulerManager',
        'PipelineFactory',
        'PipelineTracker',
        'QwenProvider',
        'IFlowProvider'
      ];

      for (const exportName of requiredExports) {
        if (!pipelineModule[exportName]) {
          throw new Error(`Required export missing: ${exportName}`);
        }
      }

      this.testResults.pipelineInitialized = true;
      this.log('✅ Pipeline components test passed', {
        availableExports: Object.keys(pipelineModule)
      });

    } catch (error) {
      this.log('❌ Pipeline components test failed', { error: error.message });
      throw error;
    }
  }

  async testStartupScript() {
    this.log('Testing refactored startup script...');

    try {
      const startupScriptPath = path.join(process.cwd(), 'scripts', 'start-rcc-system.mjs');

      if (!fs.existsSync(startupScriptPath)) {
        throw new Error(`Startup script not found: ${startupScriptPath}`);
      }

      // Test script syntax and imports
      const scriptContent = fs.readFileSync(startupScriptPath, 'utf8');

      if (!scriptContent.includes('RCCSystemInitializer')) {
        throw new Error('RCCSystemInitializer class not found in startup script');
      }

      if (!scriptContent.includes('VirtualModelSchedulerManager')) {
        throw new Error('VirtualModelSchedulerManager not referenced in startup script');
      }

      if (!scriptContent.includes('configuration-loading')) {
        throw new Error('Pipeline-first initialization order not implemented');
      }

      this.log('✅ Startup script syntax test passed');

    } catch (error) {
      this.log('❌ Startup script test failed', { error: error.message });
      throw error;
    }
  }

  async testServerRunning() {
    this.log('Testing if server starts successfully...');

    try {
      // Kill any existing RCC processes first
      try {
        await execAsync(`pkill -f "rcc start" || true`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (killError) {
        // Ignore kill errors
      }

      // Start the refactored startup script in background
      const startupScript = path.join(process.cwd(), 'scripts', 'start-rcc-system.mjs');
      const serverProcess = spawn('node', [startupScript, '--port', String(this.testPort)], {
        stdio: 'pipe',
        detached: false
      });

      let serverStarted = false;
      let serverOutput = '';

      // Monitor server output
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log('Server stdout:', output);

        if (output.includes('RCC System Successfully Started')) {
          serverStarted = true;
        }

        if (output.includes('No available targets')) {
          serverStarted = false; // Explicit failure
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.error('Server stderr:', output);
      });

      // Wait for server to start (with timeout)
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          serverProcess.kill();
        }
      }, 30000);

      // Check if server starts within reasonable time
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (serverStarted) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(true);
          } else if (serverOutput.includes('Startup failed') || serverOutput.includes('Error')) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(false);
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(false);
        }, 25000);
      });

      // Verify server is running
      if (serverStarted) {
        this.testResults.serverStarted = true;
        this.log('✅ Server startup test passed');
      } else {
        this.log('❌ Server failed to start within timeout', { output: serverOutput.substring(0, 500) });
        throw new Error('Server startup timeout or failure');
      }

      // Cleanup
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      this.log('❌ Server running test failed', { error: error.message });
      throw error;
    }
  }

  async testVirtualModelsAvailable() {
    this.log('Testing virtual models availability...');

    try {
      // Start server for brief test
      const startupScript = path.join(process.cwd(), 'scripts', 'start-rcc-system.mjs');
      const serverProcess = spawn('node', [startupScript, '--port', String(this.testPort)], {
        stdio: 'pipe'
      });

      let modelsAvailable = false;
      let availableModels = [];

      // Monitor for model registration messages
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Startup output:', output);

        if (output.includes('Virtual models registration completed')) {
          modelsAvailable = true;

          // Try to extract model information
          const modelMatch = output.match(/registeredModels.*\[(.*?)\]/);
          if (modelMatch) {
            availableModels = modelMatch[1].split(',').map(m => m.trim().replace(/['"]/g, ''));
          }
        }

        if (output.includes('No available targets')) {
          modelsAvailable = false;
        }
      });

      // Wait for startup completion
      await new Promise((resolve) => {
        setTimeout(() => resolve(true), 15000);
      });

      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.testResults.modelsRegistered = modelsAvailable;
      this.testResults.noErrorsFound = !modelsAvailable; // Inverted logic

      if (modelsAvailable) {
        this.log('✅ Virtual models availability test passed', {
          totalModels: availableModels.length,
          models: availableModels
        });
      } else {
        this.log('❌ Virtual models not properly registered', {
          availableModels
        });
        throw new Error('Virtual models registration failed - "No available targets" error likely');
      }

    } catch (error) {
      this.log('❌ Virtual models availability test failed', { error: error.message });
      throw error;
    }
  }

  async generateTestReport() {
    console.log('');
    console.log('📊 TEST REPORT - Refactored RCC Startup Flow');
    console.log('==============================================');

    const results = Object.entries(this.testResults).map(([test, passed]) => ({
      test: test.replace(/([A-Z])/g, ' $1').trim(),
      status: passed ? '✅ PASS' : '❌ FAIL'
    }));

    results.forEach(({ test, status }) => {
      console.log(`${status} ${test}`);
    });

    const allPassed = Object.values(this.testResults).every(result => result);
    const summary = allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED';

    console.log('');
    console.log('📋 SUMMARY');
    console.log('============');
    console.log(summary);
    console.log('');

    if (allPassed) {
      console.log('✅ Refactored startup flow successfully eliminates "No available targets" error!');
    } else {
      console.log('🔧 Additional debugging needed. Check debug log for details.');
    }

    // Export detailed debug log
    const reportPath = path.join(process.cwd(), 'reports', 'refactored-startup-test.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.testResults,
      debugLog: this.debugLog,
      recommendations: allPassed ? [] : [
        'Check pipeline module build status',
        'Verify virtual model targets configuration',
        'Test VirtualModelSchedulerManager initialization',
        'Debug model registration process in refactored flow'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📝 Detailed test report saved to: ${reportPath}`);

    process.exit(allPassed ? 0 : 1);
  }
}

// Run test suite
async function main() {
  try {
    const tester = new RefactoredStartupTester();
    await tester.test();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();
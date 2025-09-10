/**
 * OAuth2 Module Usage Examples
 * Examples demonstrating how to use the simplified OAuth2 implementation
 */

import { OAuth2Module } from './OAuth2Module';
import { ErrorHandlerCenter } from 'sharedmodule/pipeline';
import { PipelineConfigManager } from 'sharedmodule/pipeline';
import { OAuth2ModuleConfig } from './OAuth2Types';

/**
 * Example 1: Basic OAuth2 Flow
 */
export async function basicOAuth2Flow() {
  // Create configuration
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  // Create dependencies
  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  // Create OAuth2 module
  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    // Step 1: Initiate device authorization
    console.log('Starting device authorization...');
    const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
    
    console.log('Please complete authorization:');
    console.log(`1. Visit: ${deviceAuth.verification_uri_complete}`);
    console.log(`2. Enter code: ${deviceAuth.user_code}`);
    console.log('3. Authorize the application');

    // Step 2: External polling (would be handled by external component)
    console.log('\nWaiting for user authorization...');
    console.log('(In a real implementation, this would be handled by an external polling component)');

    // For demonstration, we'll simulate successful token request
    // In practice, you would poll the token endpoint until the user completes authorization
    console.log('\nSimulating successful authorization...');

    // Step 3: Request token (normally done by polling component)
    // const token = await oauth2Module.requestToken(deviceAuth.device_code, codeVerifier);
    
    // For this example, we'll directly load a token if available
    const tokenStatus = oauth2Module.getTokenStatus();
    console.log('Token status:', tokenStatus);

  } catch (error) {
    console.error('OAuth2 flow failed:', error);
  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

/**
 * Example 2: Token Management
 */
export async function tokenManagementExample() {
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    // Check current token status
    const tokenStatus = oauth2Module.getTokenStatus();
    console.log('Current token status:', tokenStatus);

    // If we have a token, use it
    if (tokenStatus.hasToken && !tokenStatus.isExpired) {
      const currentToken = oauth2Module.getCurrentToken();
      console.log('Using existing token:', {
        tokenType: currentToken?.tokenType,
        scope: currentToken?.scope,
        expiresAt: new Date(currentToken?.expiresAt || 0).toISOString()
      });
    } else {
      console.log('No valid token available, starting new authorization flow...');
      // Would initiate device authorization here
    }

    // Get OAuth2 statistics
    const stats = oauth2Module.getStats();
    console.log('OAuth2 statistics:', stats);

  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

/**
 * Example 3: Token Storage Management
 */
export async function tokenStorageExample() {
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    const userEmail = 'user@example.com';

    // Save a token for a specific user
    await oauth2Module.saveTokenForEmail(userEmail, {
      accessToken: 'sample-access-token',
      refreshToken: 'sample-refresh-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3600000, // 1 hour from now
      scope: 'openid profile email'
    });

    console.log(`Token saved for ${userEmail}`);

    // Load token for the user
    const loadedToken = await oauth2Module.loadTokenForEmail(userEmail);
    if (loadedToken) {
      console.log('Token loaded successfully:', {
        tokenType: loadedToken.tokenType,
        scope: loadedToken.scope,
        expiresAt: new Date(loadedToken.expiresAt).toISOString()
      });
    } else {
      console.log('No token found for user');
    }

    // Check token status after loading
    const tokenStatus = oauth2Module.getTokenStatus();
    console.log('Token status after loading:', tokenStatus);

    // Invalidate token
    oauth2Module.invalidateToken();
    console.log('Token invalidated');

  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

/**
 * Example 4: Error Handling Integration
 */
export async function errorHandlingExample() {
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    // Simulate a scenario where token expires
    console.log('Simulating token expiration scenario...');

    // Check error handling center registration
    console.log('OAuth2 module registered with error handling center');
    console.log('Error handlers will automatically handle:');
    console.log('- Token expiration with automatic refresh');
    console.log('- Authentication failures with maintenance mode');
    console.log('- Network errors with retry policies');

    // Get error statistics from error handling center
    const errorStats = errorHandlerCenter.getErrorStats();
    console.log('Error handling statistics:', errorStats);

  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

/**
 * Example 5: Message-based Communication
 */
export async function messageCommunicationExample() {
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    // Send messages to the OAuth2 module
    console.log('Communicating with OAuth2 module via messages...');

    // Get token status
    const tokenStatusResponse = await oauth2Module.sendMessage('get_token_status', {});
    console.log('Token status response:', tokenStatusResponse);

    // Get OAuth2 statistics
    const statsResponse = await oauth2Module.sendMessage('get_oauth2_stats', {});
    console.log('OAuth2 stats response:', statsResponse);

    // Invalidate token
    const invalidateResponse = await oauth2Module.sendMessage('invalidate_token', {});
    console.log('Invalidate token response:', invalidateResponse);

    // Check status after invalidation
    const finalStatusResponse = await oauth2Module.sendMessage('get_token_status', {});
    console.log('Final token status:', finalStatusResponse);

  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

/**
 * Example 6: Complete Integration Pattern
 */
export async function completeIntegrationExample() {
  console.log('=== Complete OAuth2 Integration Example ===\n');

  // Configuration
  const config: OAuth2ModuleConfig = {
    clientId: 'your-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './tokens/',
    enablePKCE: true
  };

  // Initialize components
  const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
  await errorHandlerCenter.initialize();

  const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
  await oauth2Module.initialize();

  try {
    console.log('1. Module initialized successfully');
    console.log('2. Error handlers registered with ErrorHandlerCenter');
    console.log('3. Token storage ready');

    // Check initial status
    const initialStatus = oauth2Module.getTokenStatus();
    console.log('\nInitial token status:', initialStatus);

    // Example flow with simulated user interaction
    console.log('\n4. Starting OAuth2 flow...');

    // This would normally be triggered by user action
    console.log('   - User requests authentication');
    console.log('   - Module initiates device authorization');
    console.log('   - User completes authorization via external system');
    console.log('   - External polling component handles token retrieval');
    console.log('   - Module receives and stores token');

    // Simulate having a token
    console.log('\n5. Simulating authenticated state...');
    console.log('   - Token would be stored and available');
    console.log('   - Error handling center manages refreshes');
    console.log('   - Statistics track authentication events');

    // Final statistics
    const stats = oauth2Module.getStats();
    console.log('\n6. Final statistics:', stats);

    console.log('\n=== Integration complete ===');
    console.log('Key features demonstrated:');
    console.log('✓ Clean separation of concerns');
    console.log('✓ Error handling integration');
    console.log('✓ Simple token storage');
    console.log('✓ Message-based communication');
    console.log('✓ Statistics and monitoring');
    console.log('✓ External polling support');

  } finally {
    await oauth2Module.destroy();
    await errorHandlerCenter.destroy();
  }
}

// Export all examples
export const OAuth2Examples = {
  basicOAuth2Flow,
  tokenManagementExample,
  tokenStorageExample,
  errorHandlingExample,
  messageCommunicationExample,
  completeIntegrationExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('OAuth2 Module Examples');
  console.log('========================\n');

  // Run the complete integration example
  completeIntegrationExample()
    .then(() => {
      console.log('\nExamples completed successfully!');
    })
    .catch((error) => {
      console.error('Examples failed:', error);
    });
}
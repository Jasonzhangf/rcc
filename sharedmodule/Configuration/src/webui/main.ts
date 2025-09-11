import { StandaloneServer } from './server/standalone-server';
import { ConfigurationCenterUI } from './ConfigurationCenterUI';

async function main() {
  try {
    // Get port from environment or default to 4008
    const port = parseInt(process.env.PORT || '4008', 10);
    
    // Create and start standalone server
    const server = new StandaloneServer(port);
    
    console.log('🚀 Starting RCC Configuration Center...');
    
    // Start the server
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start RCC Configuration Center:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };